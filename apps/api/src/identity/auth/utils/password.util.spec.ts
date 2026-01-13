/**
 * Password Utilities Tests
 *
 * Tests for Argon2id password hashing and verification
 */

import { hashPassword, needsRehash, verifyPassword } from './password.util';

describe('Password Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'SecurePassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).toContain('$argon2id$');
    });

    it('should generate different hashes for same password', async () => {
      const password = 'SamePassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should hash empty string', async () => {
      const hash = await hashPassword('');
      expect(hash).toBeDefined();
      expect(hash).toContain('$argon2id$');
    });

    it('should hash very long password', async () => {
      const longPassword = 'a'.repeat(1000);
      const hash = await hashPassword(longPassword);
      expect(hash).toBeDefined();
      expect(hash).toContain('$argon2id$');
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'CorrectPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(hash, password);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'CorrectPassword123!';
      const wrongPassword = 'WrongPassword456!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(hash, wrongPassword);

      expect(isValid).toBe(false);
    });

    it('should reject empty password against valid hash', async () => {
      const password = 'CorrectPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(hash, '');

      expect(isValid).toBe(false);
    });

    it('should handle invalid hash format gracefully', async () => {
      const invalidHash = 'not-a-valid-hash';
      const isValid = await verifyPassword(invalidHash, 'password');

      expect(isValid).toBe(false);
    });

    it('should be case-sensitive', async () => {
      const password = 'Password123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(hash, 'password123!');

      expect(isValid).toBe(false);
    });
  });

  describe('needsRehash', () => {
    it('should return false for freshly hashed password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const needs = needsRehash(hash);

      expect(needs).toBe(false);
    });

    it('should return true for invalid hash', () => {
      const invalidHash = 'invalid-hash-format';
      const needs = needsRehash(invalidHash);

      expect(needs).toBe(true);
    });

    it('should return true for empty string', () => {
      const needs = needsRehash('');
      expect(needs).toBe(true);
    });
  });

  describe('Security Properties', () => {
    it('should use Argon2id variant', async () => {
      const hash = await hashPassword('test');
      expect(hash).toContain('$argon2id$');
    });

    it('should include correct version', async () => {
      const hash = await hashPassword('test');
      expect(hash).toContain('v=19');
    });

    it('should include memory cost parameter', async () => {
      const hash = await hashPassword('test');
      expect(hash).toMatch(/m=\d+/);
    });

    it('should include time cost parameter', async () => {
      const hash = await hashPassword('test');
      expect(hash).toMatch(/t=\d+/);
    });

    it('should include parallelism parameter', async () => {
      const hash = await hashPassword('test');
      expect(hash).toMatch(/p=\d+/);
    });
  });

  describe('Performance', () => {
    it('should hash password in reasonable time', async () => {
      const start = Date.now();
      await hashPassword('TestPassword123');
      const duration = Date.now() - start;

      // Argon2 should take some time but not too long
      // Typically 50-500ms on modern hardware
      expect(duration).toBeLessThan(2000);
      expect(duration).toBeGreaterThan(10);
    });

    it('should verify password in reasonable time', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);

      const start = Date.now();
      await verifyPassword(hash, password);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000);
    });
  });
});
