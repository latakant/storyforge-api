import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
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
    // Global rate limiter — default: 60 req/min per IP
    // Specific endpoints override via @Throttle({ default: { limit, ttl } })
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 60 },
      { name: 'claps',    ttl: 60_000, limit: 50 },  // 50 claps/min
      { name: 'comments', ttl: 3_600_000, limit: 10 }, // 10 comments/hr
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
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
