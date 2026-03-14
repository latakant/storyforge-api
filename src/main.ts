import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  const origins = config.get<string>('CORS_ORIGINS', '');
  app.enableCors({
    origin: origins.split(',').map((o) => o.trim()),
    credentials: true,
  });

  // Global validation pipe — strips unknown fields, enforces DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter — structured error responses, no raw 500s
  app.useGlobalFilters(new AllExceptionsFilter());

  // Request-ID middleware (applied globally via AppModule)

  const port = config.get<number>('PORT', 4000);
  await app.listen(port);

  console.log(`StoryForge API running on port ${port}`);
}

bootstrap();
