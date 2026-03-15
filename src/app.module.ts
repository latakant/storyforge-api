import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ArticlesModule } from './articles/articles.module';
import { TagsModule } from './tags/tags.module';
import { CommentsModule } from './comments/comments.module';
import { ClapsModule } from './claps/claps.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { MailerModule } from './mailer/mailer.module';
import { AdminModule } from './admin/admin.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { validateEnv } from './common/config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    // Global rate limiter — 60 req/min per IP (default only)
    // Named throttlers (claps=50/min, comments=10/hr) are applied only on
    // their specific endpoints via @Throttle decorator — NOT globally, so
    // they do NOT count against all routes.
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 60 },
    ]),
    // BullMQ — Redis-backed job queue for email notifications
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ArticlesModule,
    TagsModule,
    CommentsModule,
    ClapsModule,
    DiscoveryModule,
    MailerModule,
    AdminModule,
  ],
  providers: [
    // Bind ThrottlerGuard globally — applies to every route automatically
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
