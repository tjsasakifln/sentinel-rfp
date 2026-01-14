import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { CommonModule } from './common/common.module';
import { LoggerModule } from './common/logger/logger.module';
import { configValidationSchema } from './config/config.schema';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './identity/auth/auth.module';
import { ProposalModule } from './proposal/proposal.module';

@Module({
  imports: [
    // Configuration with validation
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: configValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),

    // Structured Logging (Pino)
    LoggerModule,

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Feature modules
    CommonModule,
    HealthModule,
    AuthModule,
    ProposalModule,
    DashboardModule,
  ],
})
export class AppModule {}
