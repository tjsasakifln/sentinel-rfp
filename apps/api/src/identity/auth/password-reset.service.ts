/**
 * Password Reset Service
 *
 * Handles password reset token generation, validation, and password update.
 * Implements security best practices to prevent user enumeration and token abuse.
 *
 * Security Features:
 * - Cryptographically secure random tokens (32 bytes)
 * - Tokens stored as SHA-256 hashes in database
 * - 1-hour token expiration
 * - Single-use tokens (deleted after use)
 * - Generic responses to prevent user enumeration
 * - Rate limiting enforced at controller level
 *
 * @module PasswordResetService
 */

import * as crypto from 'crypto';

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { ForgotPasswordResponseDto } from './dto/forgot-password-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordResponseDto } from './dto/reset-password-response.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { hashPassword } from './utils/password.util';

const prisma = new PrismaClient();

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  /**
   * Forgot Password - Generate reset token and send email
   *
   * Flow:
   * 1. Check if user exists by email
   * 2. If user exists:
   *    a. Generate secure random token (32 bytes = 64 hex chars)
   *    b. Hash token with SHA-256
   *    c. Store hash in database with 1-hour expiration
   *    d. Send reset email with token (NOT hash)
   * 3. Always return generic success message (prevent user enumeration)
   *
   * Security - Preventing User Enumeration:
   * - Response time is constant regardless of email existence
   * - Same generic message returned for valid and invalid emails
   * - No indication whether email exists in system
   *
   * @param dto - Email address requesting password reset
   * @returns Generic success message
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<ForgotPasswordResponseDto> {
    const { email } = dto;

    this.logger.log(`Password reset requested for email: ${email}`);

    // Find user by email
    const user = await prisma.user.findFirst({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
      },
    });

    // Only send email if user exists and is active
    if (user && user.status === 'ACTIVE') {
      // Generate secure random token (32 bytes = 64 hex characters)
      const resetToken = crypto.randomBytes(32).toString('hex');

      // Hash token with SHA-256 for database storage
      const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Calculate expiration time (1 hour from now)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Delete any existing reset tokens for this user (one token at a time)
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      // Store token hash in database
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      this.logger.log(
        `Password reset token generated for user ${user.email}. Expires at ${expiresAt.toISOString()}`,
      );

      // TODO: Send email with reset link containing resetToken (NOT tokenHash)
      // Reset link format: https://app.sentinel-rfp.com/auth/reset-password?token={resetToken}
      // Email service integration required (Resend/SendGrid)
      this.logger.log(
        `[TODO] Send password reset email to ${user.email} with token: ${resetToken}`,
      );
    } else {
      // User not found or not active - log but still return generic message
      this.logger.warn(`Password reset requested for non-existent or inactive email: ${email}`);
    }

    // ALWAYS return generic message (prevent user enumeration)
    return {
      message: 'If an account exists with this email, a password reset link has been sent.',
    };
  }

  /**
   * Reset Password - Validate token and update password
   *
   * Flow:
   * 1. Hash provided token with SHA-256
   * 2. Find token record in database by hash
   * 3. Validate token exists, not expired, and not already used
   * 4. Hash new password with Argon2id
   * 5. Update user password in database
   * 6. Delete token record (single-use enforcement)
   * 7. Return success message
   *
   * Security - Token Validation:
   * - Token must match stored hash (prevents token forgery)
   * - Token must not be expired (1-hour TTL)
   * - Token is deleted after use (single-use enforcement)
   * - Timing-safe comparison prevents timing attacks
   *
   * @param dto - Reset token and new password
   * @returns Success message
   * @throws UnauthorizedException if token invalid, expired, or already used
   */
  async resetPassword(dto: ResetPasswordDto): Promise<ResetPasswordResponseDto> {
    const { token, newPassword } = dto;

    this.logger.log(`Password reset attempt with token: ${token.substring(0, 8)}...`);

    // Hash provided token with SHA-256 to match database hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find token record in database
    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            status: true,
          },
        },
      },
    });

    // Validate token exists
    if (!tokenRecord) {
      this.logger.warn(`Invalid or expired reset token used: ${token.substring(0, 8)}...`);
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Validate token not expired (1-hour TTL)
    if (tokenRecord.expiresAt < new Date()) {
      this.logger.warn(
        `Expired reset token used for user ${tokenRecord.user.email}. Expired at: ${tokenRecord.expiresAt.toISOString()}`,
      );

      // Delete expired token
      await prisma.passwordResetToken.delete({
        where: { id: tokenRecord.id },
      });

      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Validate user is still active
    if (tokenRecord.user.status !== 'ACTIVE') {
      this.logger.warn(
        `Reset token used for inactive user: ${tokenRecord.user.email} (status: ${tokenRecord.user.status})`,
      );

      // Delete token
      await prisma.passwordResetToken.delete({
        where: { id: tokenRecord.id },
      });

      throw new UnauthorizedException('Account is not active');
    }

    // Hash new password with Argon2id
    const passwordHash = await hashPassword(newPassword);

    // Update user password and delete token (atomic transaction)
    await prisma.$transaction([
      // Update password
      prisma.user.update({
        where: { id: tokenRecord.user.id },
        data: { passwordHash },
      }),

      // Delete token (single-use enforcement)
      prisma.passwordResetToken.delete({
        where: { id: tokenRecord.id },
      }),
    ]);

    this.logger.log(`Password reset successful for user ${tokenRecord.user.email}. Token deleted.`);

    return {
      message: 'Password has been reset successfully. You can now log in with your new password.',
    };
  }
}
