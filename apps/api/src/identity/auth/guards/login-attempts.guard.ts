/**
 * Login Attempts Guard
 *
 * Prevents brute force attacks by tracking failed login attempts per email.
 * Implements temporary lockout after exceeding maximum attempts.
 *
 * Security Features:
 * - Max 5 failed attempts per email in 15 minutes
 * - 15-minute lockout after exceeding limit
 * - Counter resets after successful login
 * - In-memory storage (TODO: migrate to Redis for distributed systems)
 *
 * @module LoginAttemptsGuard
 */

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

interface LoginAttempt {
  count: number;
  lockedUntil: number | null;
  firstAttemptAt: number;
}

@Injectable()
export class LoginAttemptsGuard implements CanActivate {
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes
  private readonly attempts = new Map<string, LoginAttempt>();

  /**
   * Checks if the email is locked out due to too many failed attempts
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const email = request.body?.email;

    if (!email) {
      return true; // Let validation handle missing email
    }

    const normalizedEmail = email.toLowerCase().trim();
    const now = Date.now();
    const attempt = this.attempts.get(normalizedEmail);

    // Check if account is locked
    if (attempt?.lockedUntil && attempt.lockedUntil > now) {
      const remainingSeconds = Math.ceil((attempt.lockedUntil - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many failed login attempts. Please try again later.',
          error: 'Too Many Requests',
          details: {
            lockedUntil: new Date(attempt.lockedUntil).toISOString(),
            retryAfter: remainingSeconds,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
        {
          cause: {
            headers: {
              'Retry-After': remainingSeconds.toString(),
            },
          },
        },
      );
    }

    // Reset if locked period expired
    if (attempt?.lockedUntil && attempt.lockedUntil <= now) {
      this.attempts.delete(normalizedEmail);
    }

    return true;
  }

  /**
   * Records a failed login attempt
   * Called by AuthService after password verification fails
   */
  recordFailedAttempt(email: string): void {
    const normalizedEmail = email.toLowerCase().trim();
    const now = Date.now();
    const attempt = this.attempts.get(normalizedEmail);

    if (!attempt) {
      // First failed attempt
      this.attempts.set(normalizedEmail, {
        count: 1,
        lockedUntil: null,
        firstAttemptAt: now,
      });
      return;
    }

    // Check if we're outside the attempt window - reset counter
    if (now - attempt.firstAttemptAt > this.ATTEMPT_WINDOW) {
      this.attempts.set(normalizedEmail, {
        count: 1,
        lockedUntil: null,
        firstAttemptAt: now,
      });
      return;
    }

    // Increment counter
    attempt.count += 1;

    // Lock account if max attempts exceeded
    if (attempt.count >= this.MAX_ATTEMPTS) {
      attempt.lockedUntil = now + this.LOCKOUT_DURATION;
    }

    this.attempts.set(normalizedEmail, attempt);
  }

  /**
   * Resets failed attempts for an email
   * Called by AuthService after successful login
   */
  resetAttempts(email: string): void {
    const normalizedEmail = email.toLowerCase().trim();
    this.attempts.delete(normalizedEmail);
  }

  /**
   * Gets current attempt count for an email (for testing)
   */
  getAttemptCount(email: string): number {
    const normalizedEmail = email.toLowerCase().trim();
    return this.attempts.get(normalizedEmail)?.count || 0;
  }

  /**
   * Gets lockout status for an email (for testing)
   */
  isLocked(email: string): boolean {
    const normalizedEmail = email.toLowerCase().trim();
    const attempt = this.attempts.get(normalizedEmail);
    if (!attempt?.lockedUntil) return false;
    return attempt.lockedUntil > Date.now();
  }

  /**
   * Clears all attempts (for testing)
   */
  clearAll(): void {
    this.attempts.clear();
  }
}
