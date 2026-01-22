/**
 * Reset Password Response DTO
 *
 * Response for successful password reset.
 *
 * @module ResetPasswordResponseDto
 */

import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordResponseDto {
  /**
   * Success message
   */
  @ApiProperty({
    description: 'Success message confirming password reset',
    example: 'Password has been reset successfully. You can now log in with your new password.',
  })
  message!: string;
}
