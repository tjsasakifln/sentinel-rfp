/**
 * Login Attempts Guard Tests
 *
 * Tests the login attempt tracking and lockout functionality
 */

import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';

import { LoginAttemptsGuard } from './login-attempts.guard';

describe('LoginAttemptsGuard', () => {
  let guard: LoginAttemptsGuard;

  beforeEach(() => {
    guard = new LoginAttemptsGuard();
  });

  afterEach(() => {
    guard.clearAll();
  });

  const createMockContext = (email: string): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          body: { email },
        }),
      }),
    } as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should allow requests with no previous attempts', () => {
      const context = createMockContext('test@example.com');
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow requests below max attempts threshold', () => {
      const email = 'test@example.com';
      const context = createMockContext(email);

      // Record 4 failed attempts (below threshold of 5)
      for (let i = 0; i < 4; i++) {
        guard.recordFailedAttempt(email);
      }

      expect(guard.canActivate(context)).toBe(true);
      expect(guard.getAttemptCount(email)).toBe(4);
    });

    it('should block requests after max attempts exceeded', () => {
      const email = 'blocked@example.com';
      const context = createMockContext(email);

      // Record 5 failed attempts (threshold)
      for (let i = 0; i < 5; i++) {
        guard.recordFailedAttempt(email);
      }

      // Should be locked now
      expect(guard.isLocked(email)).toBe(true);

      try {
        guard.canActivate(context);
        fail('Should have thrown HttpException');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(httpError.getResponse()).toMatchObject({
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many failed login attempts. Please try again later.',
        });
      }
    });

    it('should handle email case-insensitivity', () => {
      const email = 'Test@Example.com';

      // Record attempts with different cases
      guard.recordFailedAttempt('test@example.com');
      guard.recordFailedAttempt('TEST@EXAMPLE.COM');
      guard.recordFailedAttempt('TeSt@ExAmPlE.cOm');

      expect(guard.getAttemptCount(email)).toBe(3);
    });

    it('should allow requests with missing email', () => {
      const context = createMockContext('');
      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('recordFailedAttempt', () => {
    it('should increment attempt count', () => {
      const email = 'test@example.com';

      guard.recordFailedAttempt(email);
      expect(guard.getAttemptCount(email)).toBe(1);

      guard.recordFailedAttempt(email);
      expect(guard.getAttemptCount(email)).toBe(2);
    });

    it('should reset attempt count after 15 minutes window', () => {
      const email = 'test@example.com';

      guard.recordFailedAttempt(email);
      expect(guard.getAttemptCount(email)).toBe(1);

      // Mock time advance by 16 minutes (1000ms over the 15min window)
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 16 * 60 * 1000);

      guard.recordFailedAttempt(email);
      // Should reset to 1 (new window)
      expect(guard.getAttemptCount(email)).toBe(1);

      jest.restoreAllMocks();
    });

    it('should lock account after 5 attempts', () => {
      const email = 'test@example.com';

      for (let i = 0; i < 5; i++) {
        guard.recordFailedAttempt(email);
      }

      expect(guard.isLocked(email)).toBe(true);
    });
  });

  describe('resetAttempts', () => {
    it('should clear all attempts for email', () => {
      const email = 'test@example.com';

      guard.recordFailedAttempt(email);
      guard.recordFailedAttempt(email);
      guard.recordFailedAttempt(email);

      expect(guard.getAttemptCount(email)).toBe(3);

      guard.resetAttempts(email);

      expect(guard.getAttemptCount(email)).toBe(0);
      expect(guard.isLocked(email)).toBe(false);
    });

    it('should clear lockout status', () => {
      const email = 'test@example.com';

      // Lock the account
      for (let i = 0; i < 5; i++) {
        guard.recordFailedAttempt(email);
      }

      expect(guard.isLocked(email)).toBe(true);

      guard.resetAttempts(email);

      expect(guard.isLocked(email)).toBe(false);
    });
  });

  describe('isLocked', () => {
    it('should return false for unlocked accounts', () => {
      const email = 'test@example.com';
      expect(guard.isLocked(email)).toBe(false);
    });

    it('should return true for locked accounts', () => {
      const email = 'test@example.com';

      for (let i = 0; i < 5; i++) {
        guard.recordFailedAttempt(email);
      }

      expect(guard.isLocked(email)).toBe(true);
    });

    it('should return false after lockout period expires', () => {
      const email = 'test@example.com';

      // Lock the account
      for (let i = 0; i < 5; i++) {
        guard.recordFailedAttempt(email);
      }

      expect(guard.isLocked(email)).toBe(true);

      // Mock time advance by 16 minutes (1000ms over the 15min lockout)
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 16 * 60 * 1000);

      expect(guard.isLocked(email)).toBe(false);

      jest.restoreAllMocks();
    });
  });

  describe('clearAll', () => {
    it('should clear all tracked attempts', () => {
      guard.recordFailedAttempt('user1@example.com');
      guard.recordFailedAttempt('user2@example.com');
      guard.recordFailedAttempt('user3@example.com');

      expect(guard.getAttemptCount('user1@example.com')).toBe(1);
      expect(guard.getAttemptCount('user2@example.com')).toBe(1);

      guard.clearAll();

      expect(guard.getAttemptCount('user1@example.com')).toBe(0);
      expect(guard.getAttemptCount('user2@example.com')).toBe(0);
      expect(guard.getAttemptCount('user3@example.com')).toBe(0);
    });
  });
});
