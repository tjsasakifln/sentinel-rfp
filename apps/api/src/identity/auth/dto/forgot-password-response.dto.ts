/**
 * Forgot Password Response DTO
 *
 * Generic response to prevent user enumeration.
 * Always returns success message regardless of email existence.
 *
 * @module ForgotPasswordResponseDto
 */

import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordResponseDto {
  /**
   * Generic success message
   */
  @ApiProperty({
    description: 'Generic success message (always returned to prevent user enumeration)',
    example: 'If an account exists with this email, a password reset link has been sent.',
  })
  message!: string;
}
