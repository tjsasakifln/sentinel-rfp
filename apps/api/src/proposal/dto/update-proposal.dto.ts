/**
 * UpdateProposal DTO - Request to update an existing proposal
 *
 * All fields are optional since this is a partial update.
 * Uses PartialType pattern from @nestjs/mapped-types for DRY.
 *
 * @module UpdateProposalDto
 */

import { PartialType } from '@nestjs/mapped-types';

import { CreateProposalDto } from './create-proposal.dto';

/**
 * UpdateProposalDto extends CreateProposalDto with all fields optional
 *
 * This allows PATCH-style updates where clients can send only
 * the fields they want to modify.
 */
export class UpdateProposalDto extends PartialType(CreateProposalDto) {}
