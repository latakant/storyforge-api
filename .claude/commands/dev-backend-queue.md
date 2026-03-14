```
╔══════════════════════════════════════════════════════════════════════╗
║  CERT  /dev-backend-queue  |  v8.0  |  TIER: 10  |  BUDGET: MODERATE ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L3 · L7 · L8                                        ║
║ AUTHORITY     ║ BUILDER                                              ║
║ CAN           ║ - Read + write src/modules/                         ║
║               ║ - Create worker processors in src/workers/ or module ║
║               ║ - Run npx tsc --noEmit                              ║
║               ║ - Run npx jest --testPathPattern=<module>           ║
║ CANNOT        ║ - Modify schema.prisma without PA                   ║
║               ║ - Add new Redis queues without updating infra docs  ║
║ REQUIRES      ║ - MASTER-v8.0.md loaded                            ║
║               ║ - BullMQ + @nestjs/bullmq installed                 ║
║ ESCALATES     ║ - Processor swallows error (no re-throw) → HALT     ║
║               ║ - Side-effect inlined in $transaction → HALT        ║
║ OUTPUTS       ║ - Queue producer + processor + module registration  ║
║               ║ - Completion block: COMPLETE or HARD HALT           ║
╚═══════════════╩══════════════════════════════════════════════════════╝
```

BullMQ queue patterns for NestJS — producer, processor, DLQ, retry policy. Side-effects only, no business logic in queues.

$ARGUMENTS

Parse: `queue-name` (required) — e.g. `email` | `notifications` | `pdf` · `job-type` — what the job does

---

## CONTEXT: Exena Queue Architecture

```
Queues (Redis-backed via BullMQ):
  email          → send transactional email via Resend
  notifications  → in-app notifications (5 types)
  pdf            → invoice PDF generation via PDFKit
  sms            → OTP / order updates via MSG91 (optional)

Worker entrypoint: src/worker.ts (separate process from API)
Queues registered in: AppModule → imports BullModule.forRoot(...)
```

---

## PATTERN 1 — Define the queue

```typescript
// In the module that PRODUCES jobs (e.g. orders.module.ts)
import { BullModule } from '@nestjs/bullmq'

@Module({
  imports: [
    BullModule.registerQueue({ name: 'email' }),
    BullModule.registerQueue({ name: 'notifications' }),
  ],
  ...
})
export class OrdersModule {}
```

---

## PATTERN 2 — Producer (enqueue jobs)

```typescript
// src/modules/orders/orders.service.ts
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'

@Injectable()
export class OrdersService {
  constructor(
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('notifications') private notifQueue: Queue,
  ) {}

  async createOrder(dto: CreateOrderDto, userId: string): Promise<Order> {
    // Business logic + DB write in transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // ... create order, decrement stock, create payment ...
      return order
    })

    // Side-effects AFTER transaction — NOT inside $transaction
    await this.emailQueue.add('order-confirmation', {
      orderId: order.id,
      userId,
      email: order.user.email,
    }, {
      attempts: 3,                  // retry up to 3 times
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,        // keep last 100 completed jobs
      removeOnFail: 500,            // keep last 500 failed for debugging
    })

    await this.notifQueue.add('new-order', {
      userId,
      orderId: order.id,
      message: `Order #${order.id} confirmed`,
    })

    return order
  }
}
```

**Critical rule:** Side-effects (email, notifications, PDF) go in the queue AFTER the `$transaction` commits. Never inside `$transaction` — a failed email would roll back a successful order.

---

## PATTERN 3 — Processor (consume jobs)

```typescript
// src/modules/mailer/processors/email.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import { Logger } from '@nestjs/common'

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name)

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.name} [${job.id}]`)

    try {
      switch (job.name) {
        case 'order-confirmation':
          await this.sendOrderConfirmation(job.data)
          break
        case 'otp':
          await this.sendOtp(job.data)
          break
        default:
          this.logger.warn(`Unknown job type: ${job.name}`)
      }
    } catch (error) {
      this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack)
      throw error  // ← REQUIRED: re-throw so BullMQ retries
    }
  }

  private async sendOrderConfirmation(data: { orderId: string; email: string }): Promise<void> {
    // Call Resend / mailer service
  }
}
```

**Rules:**
- Processors MUST re-throw errors — swallowing = silent failure, job marked "completed" incorrectly
- Log job ID on start and on failure (for temporal correlation in debugging)
- Use `job.name` to route to different handlers (not separate queues per email type)

---

## PATTERN 4 — Register processor in module

```typescript
// src/modules/mailer/mailer.module.ts
import { BullModule } from '@nestjs/bullmq'
import { EmailProcessor } from './processors/email.processor'

@Module({
  imports: [
    BullModule.registerQueue({ name: 'email' }),
  ],
  providers: [EmailProcessor, MailerService],
})
export class MailerModule {}
```

---

## PATTERN 5 — Dead Letter Queue (DLQ) monitoring

After `attempts` exhausted, job moves to `failed` state. Monitor it:

```typescript
// In AppModule or a dedicated health service
import { Queue } from 'bullmq'

async getQueueHealth(): Promise<{ waiting: number; active: number; failed: number }> {
  const counts = await this.emailQueue.getJobCounts('waiting', 'active', 'failed')
  if (counts.failed > 10) {
    this.logger.error(`Email queue has ${counts.failed} failed jobs — inspect BullMQ dashboard`)
  }
  return counts
}
```

**Retry policy guidance:**
| Job type | attempts | backoff |
|----------|----------|---------|
| Email | 3 | exponential 2s |
| SMS | 3 | exponential 1s |
| PDF generation | 2 | fixed 5s |
| Notification | 5 | exponential 1s |

---

## PATTERN 6 — Worker entrypoint (separate process)

```typescript
// src/worker.ts — loaded by PM2/K8s worker pod, NOT the API process
import { NestFactory } from '@nestjs/core'
import { WorkerModule } from './worker.module'

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule)
  // No HTTP server — queue workers only
  await app.init()
}

bootstrap()
```

```typescript
// src/worker.module.ts
@Module({
  imports: [
    BullModule.forRoot({ connection: { host: process.env.REDIS_HOST, port: 6379 } }),
    MailerModule,          // contains EmailProcessor
    NotificationsModule,   // contains NotificationProcessor
  ],
})
export class WorkerModule {}
```

---

## COMPLETION BLOCK

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /dev-backend-queue              COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Queue      [name] — [job-type]
Files      [producer file] + [processor file] + [module update]
Side-effect [OUTSIDE $transaction ✅]
Re-throw   [processor re-throws on error ✅]
Verified   tsc ✅ | tests ✅
Next       /cortex-commit "feat(<module>): add [queue-name] queue for [purpose]"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
