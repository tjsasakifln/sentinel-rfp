/**
 * Auth Response DTO - Authentication response with tokens and user info
 *
 * Returned by register, login, and refresh endpoints.
 * Contains JWT tokens and sanitized user data (no sensitive fields).
 *
 * @module AuthResponseDto
 */

import { ApiProperty } from '@nestjs/swagger';

class UserDto {
  @ApiProperty({
    description: 'User UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'User email',
    example: 'john.doe@example.com',
    format: 'email',
  })
  email!: string;

  @ApiProperty({
    description: 'User full name (firstName + lastName)',
    example: 'John Doe',
  })
  name!: string;

  @ApiProperty({
    description: 'User role within organization',
    example: 'OWNER',
    enum: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'],
  })
  role!: string;

  @ApiProperty({
    description: 'Organization UUID',
    example: '660e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  organizationId!: string;

  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Corporation',
  })
  organizationName!: string;
}

export class AuthResponseDto {
  /**
   * JWT Access Token - Short-lived (15 minutes)
   * Used in Authorization header: Bearer <accessToken>
   */
  @ApiProperty({
    description: 'JWT Access Token (15-minute expiration)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  /**
   * JWT Refresh Token - Long-lived (7 days)
   * Used to obtain new access tokens
   * Stored securely in httpOnly cookie (recommended) or client storage
   */
  @ApiProperty({
    description: 'JWT Refresh Token (7-day expiration)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken!: string;

  /**
   * Sanitized user data (no sensitive fields like passwordHash)
   */
  @ApiProperty({
    description: 'Sanitized user data (no sensitive fields)',
    type: UserDto,
  })
  user!: UserDto;
}
