/**
 * CreateProposal DTO - Request to create a new proposal
 *
 * Validates proposal creation data including title, RFP number, and status.
 * Multi-tenancy is enforced via organizationId from authenticated user context.
 *
 * @module CreateProposalDto
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProposalDto {
  /**
   * Proposal title
   *
   * Required field that describes the proposal.
   * Maximum 500 characters to match database constraint.
   */
  @ApiProperty({
    description: 'Proposal title',
    example: 'Federal IT Modernization RFP Response 2026',
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MinLength(1, { message: 'Title must not be empty' })
  @MaxLength(500, { message: 'Title must not exceed 500 characters' })
  title!: string;

  /**
   * RFP Number - Optional identifier from the original RFP document
   *
   * Helps track which RFP this proposal responds to.
   * Maximum 100 characters to match database constraint.
   */
  @ApiPropertyOptional({
    description: 'RFP number from the original RFP document',
    example: 'RFP-2026-001',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'RFP number must not exceed 100 characters' })
  rfpNumber?: string;

  /**
   * Proposal status - Will default to 'draft' if not provided
   *
   * Valid statuses: draft, in_progress, completed
   * Note: Status validation is enforced at service layer
   */
  @ApiPropertyOptional({
    description: 'Proposal status (defaults to "draft" if not provided)',
    example: 'draft',
    enum: ['draft', 'in_progress', 'completed'],
    default: 'draft',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Status must not exceed 50 characters' })
  status?: string;
}
