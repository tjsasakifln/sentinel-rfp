import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';

/**
 * AI Module
 *
 * Provides LLM integration services for the application
 * Uses @sentinel-rfp/ai package for provider abstraction
 */
@Module({
  imports: [ConfigModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
