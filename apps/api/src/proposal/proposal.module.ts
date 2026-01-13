/**
 * Proposal Module - Manages proposal CRUD operations
 *
 * Provides REST API endpoints for creating, reading, updating, and deleting proposals.
 * Enforces multi-tenancy and JWT authentication.
 *
 * @module ProposalModule
 */

import { Module } from '@nestjs/common';

import { ProposalController } from './proposal.controller';
import { ProposalService } from './proposal.service';

@Module({
  controllers: [ProposalController],
  providers: [ProposalService],
  exports: [ProposalService],
})
export class ProposalModule {}
