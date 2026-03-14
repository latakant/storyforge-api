---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
# TypeScript Patterns

> Extends common/patterns.md with NestJS/TypeScript-specific patterns.

## API Response Envelope

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

## Repository / Service Pattern

```typescript
// Service: business logic only
@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrderDto): Promise<Order> {
    return this.prisma.$transaction(async (tx) => {
      // validate, create, update stock — all inside transaction
    });
  }
}

// Controller: HTTP only, no logic
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(userId, dto);
  }
}
```

## DTO Validation Pattern

```typescript
export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  addressId: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
```

## Prisma Error Mapping Pattern

```typescript
} catch (error) {
  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw new ConflictException('Resource already exists');
    if (error.code === 'P2025') throw new NotFoundException('Resource not found');
  }
  throw error;
}
```

## Financial Amount Rules

```typescript
// DB: always Decimal
amount: Decimal  // prisma.schema: Decimal @db.Decimal(10, 2)

// Razorpay API: always paise (integer)
const amountPaise = Math.round(order.total.toNumber() * 100);

// Display: always use toFixed(2) or Intl.NumberFormat
const display = `₹${amount.toFixed(2)}`;
```
