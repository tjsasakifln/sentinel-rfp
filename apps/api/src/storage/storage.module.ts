/**
 * Storage Module
 *
 * Provides object storage services (Cloudflare R2, AWS S3, etc.).
 * Exports R2Service for use across the application.
 *
 * @module StorageModule
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { R2Service } from './r2.service';

@Module({
  imports: [ConfigModule],
  providers: [R2Service],
  exports: [R2Service],
})
export class StorageModule {}
