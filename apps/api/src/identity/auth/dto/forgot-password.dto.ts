/**
 * Forgot Password DTO
 *
 * Used to initiate password reset flow.
 * Validates email address and sends reset token via email.
 *
 * @module ForgotPasswordDto
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  /**
   * Email address of user requesting password reset
   */
  @ApiProperty({
    description: 'Email address of user requesting password reset',
    example: 'user@example.com',
    maxLength: 255,
  })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @IsString()
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email!: string;
}
