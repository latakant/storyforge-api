# prisma-patterns — Prisma Accuracy Patterns
> Load this before writing any Prisma queries or schema changes.
> Applies to: cortex-build, cortex-fix, cortex-review, dev-backend-schema, dev-backend-endpoint

Stack: Prisma 6.19 · PostgreSQL 16 · TypeScript 5.7

---

## The Prisma Accuracy Laws

These are the patterns Claude most commonly gets wrong with Prisma.
Read before writing. Check after writing.

---

## LAW 1 — select Over include (performance critical)

Never `include` full relations when you only need a few fields. `select` fetches only what you ask for.

```typescript
// WRONG — fetches ALL fields of product + ALL fields of category + all variants
const orders = await this.prisma.order.findMany({
  include: { items: { include: { product: true } } }
})

// CORRECT — select only what the caller needs
const orders = await this.prisma.order.findMany({
  select: {
    id: true,
    orderNumber: true,
    status: true,
    total: true,
    createdAt: true,
    items: {
      select: {
        quantity: true,
        unitPrice: true,
        product: {
          select: { id: true, name: true, imageUrl: true }
        }
      }
    }
  }
})
```

**Rule:** If the caller never uses `product.description`, `product.metaTitle`, or other large text fields — don't fetch them. On a list endpoint returning 20+ orders, this is the difference between a 10ms and 200ms query.

`include` is only justified when you genuinely need all fields of the relation.

---

## LAW 2 — $transaction for Multi-Table Writes

Any operation touching 2+ tables must be atomic. Without `$transaction`, a crash between two writes leaves the DB in an inconsistent state.

```typescript
// WRONG — two writes, no atomicity
await this.prisma.order.update({ where: { id }, data: { status: 'CONFIRMED' } })
await this.prisma.payment.update({ where: { orderId: id }, data: { status: 'PAID' } })
// ← if server crashes here, order is CONFIRMED but payment is still PENDING

// CORRECT — batch transaction (when writes are independent)
await this.prisma.$transaction([
  this.prisma.order.update({ where: { id }, data: { status: 'CONFIRMED' } }),
  this.prisma.payment.update({ where: { orderId: id }, data: { status: 'PAID' } }),
])

// CORRECT — interactive transaction (when second write depends on first result)
await this.prisma.$transaction(async (tx) => {
  const order = await tx.order.update({
    where: { id },
    data: { status: 'CONFIRMED' },
  })
  await tx.processedWebhookEvent.create({
    data: { razorpayEventId, orderId: order.id },
  })
  return order
})
```

**Use interactive when:** write B needs data from write A.
**Use batch when:** writes are independent (same data, no dependency).

---

## LAW 3 — N+1 Prevention (never query in a loop)

```typescript
// WRONG — 1 query for order list + N queries for each product (N+1)
const orders = await this.prisma.order.findMany()
for (const order of orders) {
  order.items = await this.prisma.orderItem.findMany({  // ← N queries!
    where: { orderId: order.id }
  })
}

// CORRECT — single query with select/include
const orders = await this.prisma.order.findMany({
  select: {
    id: true,
    items: { select: { id: true, productId: true, quantity: true } }
  }
})

// CORRECT — batch fetch if post-processing is needed
const orderIds = orders.map(o => o.id)
const allItems = await this.prisma.orderItem.findMany({
  where: { orderId: { in: orderIds } }
})
// then group by orderId in JS
```

**Detection:** if you see `findMany` or `findUnique` inside a `for` loop → N+1 bug.

---

## LAW 4 — upsert for Idempotent Creates

When the same operation might be called twice (webhook replay, retry), use `upsert` not `create`.

```typescript
// WRONG — throws P2002 on duplicate webhook
await this.prisma.processedWebhookEvent.create({
  data: { razorpayEventId, orderId }
})

// CORRECT — idempotent, safe to call multiple times
await this.prisma.processedWebhookEvent.upsert({
  where: { razorpayEventId },
  create: { razorpayEventId, orderId },
  update: {},  // ← no-op if already exists (intentional)
})

// CORRECT — create or update a user profile on login
await this.prisma.user.upsert({
  where: { phone },
  create: { phone, role: 'CUSTOMER' },
  update: { lastLoginAt: new Date() },
})
```

---

## LAW 5 — Soft Delete (always filter isActive)

All models use `isActive` flag for soft delete, not hard `DELETE`.

```typescript
// WRONG — finds deleted records too
const products = await this.prisma.product.findMany()

// CORRECT — always filter active records
const products = await this.prisma.product.findMany({
  where: { isActive: true }
})

// Soft delete — never hard delete
async remove(id: string): Promise<void> {
  await this.prisma.product.update({
    where: { id },
    data: { isActive: false }
  })
}
```

**Exceptions:** internal admin queries may need `isActive: false` results (e.g., restore feature).
Always document when you intentionally skip the filter.

---

## LAW 6 — Pagination (always limit results)

Never `findMany` without a limit. Without pagination, a single request can return 10,000 rows.

```typescript
// WRONG — unbounded query
const products = await this.prisma.product.findMany()

// CORRECT — skip/take with orderBy
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

async findAll(page = 1, limit = DEFAULT_PAGE_SIZE) {
  const take = Math.min(limit, MAX_PAGE_SIZE)
  const skip = (page - 1) * take

  const [items, total] = await this.prisma.$transaction([
    this.prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: { id: true, name: true, price: true, imageUrl: true }
    }),
    this.prisma.product.count({ where: { isActive: true } }),
  ])

  return {
    data: items,
    meta: {
      total,
      page,
      limit: take,
      totalPages: Math.ceil(total / take),
    }
  }
}
```

**Cursor pagination** for infinite scroll (more efficient on large tables):
```typescript
const products = await this.prisma.product.findMany({
  take: 20,
  skip: cursor ? 1 : 0,
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { createdAt: 'desc' },
})
```

---

## LAW 7 — Error Mapping (Prisma codes → HTTP)

Raw Prisma errors return `500 Internal Server Error`. Always catch and map.

```typescript
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common'
import { Prisma } from '@prisma/client'

async create(data: CreateProductDto): Promise<Product> {
  try {
    return await this.prisma.product.create({ data })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') throw new ConflictException('Product with this SKU already exists')
      if (e.code === 'P2025') throw new NotFoundException('Related record not found')
      if (e.code === 'P2003') throw new BadRequestException('Foreign key constraint failed')
    }
    throw e  // unknown errors — re-throw, never swallow
  }
}
```

| Prisma Code | Meaning | HTTP Response |
|-------------|---------|---------------|
| P2002 | Unique constraint violation | `ConflictException` (409) |
| P2025 | Record not found | `NotFoundException` (404) |
| P2003 | FK constraint violation | `BadRequestException` (400) |
| P2014 | Required relation violated | `BadRequestException` (400) |
| P2016 | Query interpretation error | `BadRequestException` (400) |

---

## LAW 8 — Type Safety (use Prisma-generated types)

Never use `any`. Prisma generates complete types from your schema.

```typescript
// WRONG — manual typing, misses DB-generated fields
const createOrder = async (data: any): Promise<any> => { ... }

// CORRECT — use generated types
import { Order, Prisma } from '@prisma/client'

// For full model return
async findOne(id: string): Promise<Order | null> {
  return this.prisma.order.findUnique({ where: { id } })
}

// For custom select shape — use Prisma.OrderGetPayload
type OrderListItem = Prisma.OrderGetPayload<{
  select: { id: true; orderNumber: true; status: true; total: true }
}>
async findAll(): Promise<OrderListItem[]> { ... }

// For create input
async create(data: Prisma.OrderCreateInput): Promise<Order> { ... }
```

**Pattern:** If you need a custom shape, define it with `Prisma.XGetPayload<{ select: ... }>` — it's derived from the schema and stays in sync automatically.

---

## LAW 9 — Decimal Handling (INR → paise)

Prices are stored as `Decimal(10,2)` in PostgreSQL. Razorpay requires integers in paise.

```typescript
import { Prisma } from '@prisma/client'

// WRONG — JavaScript float arithmetic on money
const total = 0.1 + 0.2  // 0.30000000000000004
const paise = total * 100  // wrong

// CORRECT — keep as Decimal until final conversion
const price = new Prisma.Decimal('99.99')
const tax = new Prisma.Decimal('17.99')
const total = price.plus(tax)  // Decimal arithmetic — exact

// Convert to paise for Razorpay (integer, no decimals)
const amountInPaise = Math.round(total.toNumber() * 100)  // 11798

// CORRECT — reading from DB and converting
const order = await this.prisma.order.findUnique({ where: { id } })
const razorpayAmount = Math.round(order.total.toNumber() * 100)
```

**Rule:** Never do arithmetic on `.toNumber()` results — only convert to number for final Razorpay API call.

---

## LAW 10 — Index Strategy (query performance)

Every FK must be indexed. Every field used in `WHERE`, `ORDER BY`, or `findUnique` must be indexed.

```prisma
// WRONG — FK with no index (full table scan on every join)
model OrderItem {
  id       String @id @default(cuid())
  orderId  String  // ← no index — joining orders to items is slow
  order    Order  @relation(fields: [orderId], references: [id])
}

// CORRECT — index all FKs and query fields
model OrderItem {
  id        String  @id @default(cuid())
  orderId   String
  productId String
  order     Order   @relation(fields: [orderId], references: [id])
  product   Product @relation(fields: [productId], references: [id])

  @@index([orderId])    // ← join performance
  @@index([productId])  // ← join performance
}

// Index composite queries
model Order {
  userId    String
  status    OrderStatus
  createdAt DateTime

  @@index([userId, createdAt])  // ← "my orders" query
  @@index([status])              // ← admin filter by status
}
```

**Check slow queries:** `EXPLAIN ANALYZE SELECT ...` in psql.
Any `Seq Scan` on a large table = missing index.

---

## SCHEMA CONVENTIONS (enforce in every model)

```prisma
model Product {
  id          String    @id @default(cuid())     // ← CUID PKs always
  createdAt   DateTime  @default(now())           // ← timestamps required
  updatedAt   DateTime  @updatedAt                // ← auto-update
  isActive    Boolean   @default(true)            // ← soft delete flag
  name        String
  price       Decimal   @db.Decimal(10, 2)        // ← money: Decimal not Float
  slug        String    @unique                   // ← unique identifier

  categoryId  String
  category    Category  @relation(fields: [categoryId], references: [id])

  @@index([categoryId])                           // ← FK always indexed
  @@index([slug])                                 // ← lookup field indexed
  @@map("products")                               // ← snake_case table name
}
```

---

## SEARCH-FIRST CHECKLIST

Before writing any Prisma query:

- [ ] Am I fetching full relations I don't need? → `select` instead of `include` (Law 1)
- [ ] Am I writing to 2+ tables? → wrap in `$transaction` (Law 2)
- [ ] Am I calling Prisma inside a loop? → batch the query (Law 3)
- [ ] Could this be called twice? → `upsert` instead of `create` (Law 4)
- [ ] Am I querying without `isActive: true`? → add the filter (Law 5)
- [ ] Is there a `take` limit on this `findMany`? → add pagination (Law 6)
- [ ] Am I catching `PrismaClientKnownRequestError`? → map codes to HTTP (Law 7)
- [ ] Returning `any`? → use `Prisma.XGetPayload` or the model type (Law 8)
- [ ] Doing math on `Decimal`? → keep as `Prisma.Decimal`, convert only for Razorpay (Law 9)
- [ ] New model/relation? → add `@@index` for every FK and query field (Law 10)

---

## COMMON MISTAKES CLAUDE MAKES WITH PRISMA

| Mistake | Correct pattern |
|---------|-----------------|
| `include: { product: true }` on list | `select` only needed fields (Law 1) |
| Two sequential writes without `$transaction` | Wrap in `$transaction` (Law 2) |
| `findMany` inside `for` loop | Single `findMany` with `where: { id: { in: ids } }` (Law 3) |
| `create` on idempotent operation | `upsert` with no-op `update: {}` (Law 4) |
| `findMany()` without `isActive: true` | Always filter active (Law 5) |
| `findMany()` without `take` | Add pagination (Law 6) |
| Not catching `P2002` → raw 500 | `ConflictException` (Law 7) |
| `Promise<any>` return type | `Promise<Order>` or `Promise<Prisma.OrderGetPayload<...>>` (Law 8) |
| `order.total * 100` for Razorpay | `Math.round(order.total.toNumber() * 100)` (Law 9) |
| New `@relation` field with no `@@index` | Add `@@index([foreignKeyField])` (Law 10) |
