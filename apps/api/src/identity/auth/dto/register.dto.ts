/**
 * Register DTO - User registration request
 *
 * Validates email uniqueness, password strength, and organization context.
 * Supports two registration flows:
 * 1. Create new organization (first user becomes OWNER)
 * 2. Join existing organization (requires valid organizationId)
 *
 * @module RegisterDto
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  /**
   * User email - Must be unique within organization
   * Format validation via IsEmail
   */
  @ApiProperty({
    description: 'User email address (must be unique)',
    example: 'jane.smith@company.com',
    format: 'email',
    maxLength: 255,
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email!: string;

  /**
   * Plain text password - Will be hashed with Argon2id
   *
   * Requirements:
   * - Minimum 8 characters
   * - At least 1 uppercase letter
   * - At least 1 lowercase letter
   * - At least 1 number
   * - At least 1 symbol
   */
  @ApiProperty({
    description: 'Strong password (min 8 chars, uppercase, lowercase, number, symbol)',
    example: 'SecurePass123!',
    format: 'password',
    minLength: 8,
  })
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'Password must be at least 8 characters and contain uppercase, lowercase, number, and symbol',
    },
  )
  password!: string;

  /**
   * User's first name
   */
  @ApiProperty({
    description: "User's first name",
    example: 'Jane',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MinLength(1, { message: 'First name must not be empty' })
  @MaxLength(100, { message: 'First name must not exceed 100 characters' })
  firstName!: string;

  /**
   * User's last name
   */
  @ApiProperty({
    description: "User's last name",
    example: 'Smith',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @MinLength(1, { message: 'Last name must not be empty' })
  @MaxLength(100, { message: 'Last name must not exceed 100 characters' })
  lastName!: string;

  /**
   * Organization ID - Join existing organization
   *
   * Optional: If not provided, a new organization will be created
   * and the user will become the OWNER.
   *
   * If provided, organization must exist and be ACTIVE.
   */
  @ApiPropertyOptional({
    description: 'Organization ID to join (optional - creates new org if omitted)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID(4, { message: 'Invalid organization ID format' })
  organizationId?: string;

  /**
   * Organization name - Used when creating new organization
   *
   * Required if organizationId is not provided.
   * Ignored if organizationId is provided (joining existing org).
   */
  @ApiPropertyOptional({
    description: 'Organization name (required if creating new organization)',
    example: 'Acme Corporation',
    minLength: 1,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Organization name must not be empty' })
  @MaxLength(200, { message: 'Organization name must not exceed 200 characters' })
  organizationName?: string;
}
