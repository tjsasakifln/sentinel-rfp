/**
 * UpdateProposal DTO - Request to update an existing proposal
 *
 * All fields are optional since this is a partial update.
 * Uses PartialType pattern from @nestjs/swagger for DRY and Swagger documentation.
 *
 * @module UpdateProposalDto
 */

import { PartialType } from '@nestjs/swagger';

import { CreateProposalDto } from './create-proposal.dto';

/**
 * UpdateProposalDto extends CreateProposalDto with all fields optional
 *
 * This allows PATCH-style updates where clients can send only
 * the fields they want to modify.
 *
 * Using PartialType from @nestjs/swagger ensures that:
 * - All fields from CreateProposalDto are inherited
 * - All fields become optional
 * - Swagger documentation is properly generated
 */
export class UpdateProposalDto extends PartialType(CreateProposalDto) {}
