import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { SentryFilter } from './common/filters/sentry.filter';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';

// Initialize Sentry BEFORE any other code
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    enabled: process.env.NODE_ENV !== 'test',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
    integrations: [nodeProfilingIntegration()],
    beforeSend(event, hint) {
      // Add requestId to tags if available in hint
      if (hint.originalException && typeof hint.originalException === 'object') {
        const exception = hint.originalException as any;
        if (exception.requestId) {
          event.tags = { ...event.tags, requestId: exception.requestId };
        }
      }

      // Add requestId from headers if available
      if (event.request?.headers?.['x-request-id']) {
        event.tags = { ...event.tags, requestId: event.request.headers['x-request-id'] as string };
      }

      return event;
    },
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use Pino logger
  app.useLogger(app.get(Logger));

  // Global prefix
  app.setGlobalPrefix('api');

  // Security
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global interceptors
  app.useGlobalInterceptors(
    new RequestIdInterceptor(), // Request ID tracking & correlation
  );

  // Global exception filters (order matters - most specific last)
  app.useGlobalFilters(
    new SentryFilter(), // Capture to Sentry first (doesn't handle, just reports)
    new AllExceptionsFilter(), // Catch-all fallback
    new PrismaExceptionFilter(), // Prisma-specific errors
    new HttpExceptionFilter(), // HTTP exceptions
  );

  // Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Sentinel RFP API')
    .setDescription('AI-Powered RFP Response Platform API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addTag('health', 'Health check endpoints')
    .addTag('identity', 'User authentication and authorization')
    .addTag('proposals', 'Proposal management')
    .addTag('knowledge', 'Knowledge library')
    .addTag('agents', 'AI agents and response generation')
    .addTag('export', 'Document export')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document, {
    jsonDocumentUrl: 'api/v1/docs-json',
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(`🚀 Application is running on: http://localhost:${port}/api`);
  logger.log(`📚 Swagger docs available at: http://localhost:${port}/api/v1/docs`);
  logger.log(`📄 Swagger JSON available at: http://localhost:${port}/api/v1/docs-json`);
}

bootstrap();
