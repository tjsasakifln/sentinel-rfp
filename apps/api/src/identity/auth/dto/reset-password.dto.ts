/**
 * Reset Password DTO
 *
 * Used to complete password reset flow with token validation.
 * Validates reset token and new password strength.
 *
 * @module ResetPasswordDto
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  /**
   * Reset token received via email
   */
  @ApiProperty({
    description: 'Reset token received via email (64 hex characters)',
    example: 'a1b2c3d4e5f6...', // 64 hex chars
    minLength: 64,
    maxLength: 64,
  })
  @IsString()
  @IsNotEmpty({ message: 'Token is required' })
  @Matches(/^[a-f0-9]{64}$/, {
    message: 'Invalid token format',
  })
  token!: string;

  /**
   * New password for user account
   * Must meet complexity requirements
   */
  @ApiProperty({
    description: 'New password (min 8 characters, must include uppercase, lowercase, number)',
    example: 'NewSecure123!',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword!: string;
}
