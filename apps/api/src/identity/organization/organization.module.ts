/**
 * Organization Module
 *
 * Provides CRUD operations for organizations (multi-tenant root entities).
 * Exports OrganizationService for use in other modules.
 *
 * @module OrganizationModule
 */

import { Module } from '@nestjs/common';

import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';

@Module({
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
