/**
 * Organization Module
 *
 * Provides CRUD operations for organizations (multi-tenant root entities).
 * Exports OrganizationService for use in other modules.
 *
 * @module OrganizationModule
 */

import { Module } from '@nestjs/common';

import { UserModule } from '../user/user.module';

import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';

@Module({
  imports: [UserModule],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
