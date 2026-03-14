# nestjs-patterns — NestJS Accuracy Patterns
> Load this before writing any NestJS code: controllers, services, modules, guards, pipes, interceptors.
> Applies to: cortex-build, cortex-fix, cortex-feature, cortex-review, dev-backend-endpoint

---

## The NestJS Accuracy Laws

These are the patterns Claude most commonly gets wrong in NestJS.
Read before writing. Check after writing.

---

## LAW 1 — Layer Separation (most violated)

```
Request → Controller (HTTP only) → Service (logic) → Prisma (DB)
```

**Controller:** routes, param extraction, guard/role decoration, return HTTP response. Nothing else.
**Service:** all business logic, all DB queries, all calculations.
**Never:** `this.prisma` in a controller. `@Inject(HttpService)` in a service that could use a module.

```typescript
// WRONG — prisma in controller
@Get(':id')
async getOrder(@Param('id') id: string) {
  return this.prisma.order.findUnique({ where: { id } }); // ✖
}

// CORRECT — delegates to service
@Get(':id')
async getOrder(@Param('id') id: string) {
  return this.ordersService.findOne(id); // ✔
}
```

---

## LAW 2 — Guard Ordering (always this exact order)

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)  // ✔ JWT first, then roles
@UseGuards(RolesGuard, JwtAuthGuard)  // ✖ roles can't run without auth
```

Public endpoints: use `@Public()` decorator (or skip `JwtAuthGuard`), not by removing guards.

---

## LAW 3 — DTO Validation (whitelist strips unknowns)

Every controller input uses a DTO class. `app.module.ts` must have:
```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,       // strips unknown fields — required
  forbidNonWhitelisted: false,
  transform: true,       // auto-transform types (string → number)
}));
```

DTO pattern:
```typescript
export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsString()
  @IsNotEmpty()
  addressId: string;

  @IsString()
  @IsOptional()
  couponCode?: string;
}
```

Rules:
- Every field has a validator decorator
- Optional fields have `@IsOptional()` FIRST, then type validator
- Enum fields use `@IsEnum()` not `@IsString()`
- Nested objects use `@ValidateNested()` + `@Type()`

---

## LAW 4 — Module Wiring (common mistakes)

```typescript
@Module({
  imports: [
    PrismaModule,          // always — for DB access
    BullModule.registerQueue({ name: 'notifications' }),  // if using queues
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],  // export if used by other modules
})
export class OrdersModule {}
```

**MailerModule is `@Global()`** — never import it. It's already available everywhere.
**PrismaService** — import `PrismaModule` or inject directly if `PrismaModule` exports it.
**BullMQ** — `BullModule.registerQueue` in the using module, `BullModule.forRoot` only in AppModule.

---

## LAW 5 — Error Mapping (Prisma → HTTP)

Always catch Prisma errors and map them. Raw Prisma errors return 500.

```typescript
async create(dto: CreateOrderDto): Promise<Order> {
  try {
    return await this.prisma.order.create({ data: { ...dto } });
  } catch (e) {
    if (e.code === 'P2002') throw new ConflictException('Order already exists');
    if (e.code === 'P2025') throw new NotFoundException('Related record not found');
    throw e; // re-throw unknown errors
  }
}
```

| Prisma Code | HTTP Exception | When |
|-------------|----------------|------|
| P2002 | `ConflictException` (409) | Unique constraint violation |
| P2025 | `NotFoundException` (404) | Record not found |
| P2003 | `BadRequestException` (400) | FK constraint violation |
| P2014 | `BadRequestException` (400) | Required relation violated |

---

## LAW 6 — $transaction for Multi-Table Writes

Any operation that touches 2+ tables must use `$transaction`:

```typescript
// WRONG — two separate writes, inconsistent if second fails
await this.prisma.order.update({ where: { id }, data: { status: 'CONFIRMED' } });
await this.prisma.payment.update({ where: { orderId: id }, data: { status: 'PAID' } });

// CORRECT — atomic
await this.prisma.$transaction([
  this.prisma.order.update({ where: { id }, data: { status: 'CONFIRMED' } }),
  this.prisma.payment.update({ where: { orderId: id }, data: { status: 'PAID' } }),
]);

// CORRECT — interactive transaction (when second op depends on first)
await this.prisma.$transaction(async (tx) => {
  const order = await tx.order.update({ ... });
  await tx.payment.create({ data: { orderId: order.id, ... } });
  return order;
});
```

---

## LAW 7 — BullMQ Queue Patterns

```typescript
// Inject queue in service
@InjectQueue('notifications') private notificationQueue: Queue

// Add job — always with retry config
await this.notificationQueue.add('order-placed', {
  userId, orderNumber, phone, email, total,
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
});

// Processor — always re-throw on error
@Process('order-placed')
async handleOrderPlaced(job: Job): Promise<void> {
  try {
    await this.smsService.send(job.data);
  } catch (err) {
    this.logger.error(`order-placed failed: ${err.message}`, { jobId: job.id });
    throw err; // ← required — lets BullMQ retry + DLQ capture
  }
}
```

**Rule:** Side effects (SMS, email, push) are NEVER inline in a service method.
Always queue them. If the queue is down, order creation must still succeed.

---

## LAW 8 — Typing (no `any`)

```typescript
// WRONG
async findOrders(): Promise<any[]> { ... }
const result: any = await this.prisma.order.findMany();

// CORRECT — use Prisma-generated types
import { Order, Prisma } from '@prisma/client';
async findOrders(): Promise<Order[]> { ... }
async createOrder(data: Prisma.OrderCreateInput): Promise<Order> { ... }

// For unknown shapes — use unknown + type guard
function isPaymentWebhook(data: unknown): data is RazorpayWebhook {
  return typeof data === 'object' && data !== null && 'event' in data;
}
```

---

## LAW 9 — Interceptors and Pipes (module-level vs global)

- `ValidationPipe` → global (in `main.ts` via `app.useGlobalPipes`)
- `LoggingInterceptor` → global (in `AppModule` via `APP_INTERCEPTOR`)
- Domain-specific pipes/interceptors → controller or method level only
- Never register the same interceptor both globally and on a controller

---

## LAW 10 — Module Circular Dependency (forwardRef)

When two modules depend on each other:
```typescript
// In ModuleA
imports: [forwardRef(() => ModuleB)]

// In ModuleB
imports: [forwardRef(() => ModuleA)]
```

Better: extract shared logic into a SharedModule that neither depends on.

---

## SEARCH-FIRST CHECKLIST

Before writing any new NestJS code, answer these:

- [ ] Does this controller method belong in the service? (Law 1)
- [ ] Is there already a DTO for this input shape? Search `src/**/*.dto.ts`
- [ ] Is there already a service method that does this? Search the service file
- [ ] Does this touch 2+ tables? → needs `$transaction` (Law 6)
- [ ] Does this call an external service? → needs BullMQ queue (Law 7)
- [ ] Am I returning a Prisma model? → use the generated type, not `any` (Law 8)

---

## COMMON MISTAKES CLAUDE MAKES IN NESTJS

| Mistake | Correct pattern |
|---------|-----------------|
| Putting `prisma` in controller | Always in service |
| Forgetting `@IsOptional()` before type validator | `@IsOptional() @IsString()` |
| Missing `$transaction` on payment confirmation | Wrap order+payment update |
| Inline `await smsService.send()` | Queue it |
| `catch (e: any)` | `catch (e: unknown)` |
| `RolesGuard` before `JwtAuthGuard` | JWT always first |
| Forgetting `exports: [ServiceName]` in module | Add exports for cross-module use |
| `parseInt()` on Decimal price | Use `new Decimal()` or keep as string |
| Not catching P2002 → raw 500 | Catch → `ConflictException` |
| `findUnique` without null check | Check result before using |
