/**
 * Query Proposal DTO - Query parameters for listing proposals
 *
 * @module QueryProposalDto
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query parameters for listing proposals with filters and pagination
 */
export class QueryProposalDto {
  /**
   * Filter by proposal status
   * @example "draft"
   */
  @ApiPropertyOptional({
    enum: ['draft', 'in_progress', 'completed'],
    description: 'Filter by proposal status',
    example: 'draft',
  })
  @IsOptional()
  @IsString()
  @IsIn(['draft', 'in_progress', 'completed'])
  status?: 'draft' | 'in_progress' | 'completed';

  /**
   * Search by title (case-insensitive partial match)
   * @example "federal contract"
   */
  @ApiPropertyOptional({
    description: 'Search by proposal title (case-insensitive)',
    example: 'federal contract',
  })
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * Sort by field
   * @example "createdAt"
   */
  @ApiPropertyOptional({
    enum: ['createdAt', 'updatedAt', 'title', 'status'],
    description: 'Sort by field',
    default: 'updatedAt',
    example: 'updatedAt',
  })
  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'updatedAt', 'title', 'status'])
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'status';

  /**
   * Sort order
   * @example "desc"
   */
  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    description: 'Sort order',
    default: 'desc',
    example: 'desc',
  })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  /**
   * Page number (1-indexed)
   * @example 1
   */
  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    default: 1,
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  /**
   * Items per page
   * @example 20
   */
  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
    example: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
