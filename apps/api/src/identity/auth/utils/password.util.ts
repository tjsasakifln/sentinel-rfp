/**
 * Password utilities using Argon2id
 *
 * Argon2id is a memory-hard hashing algorithm designed to resist
 * GPU-based attacks and side-channel attacks. It combines the data-independent
 * and data-dependent memory access patterns.
 *
 * @see https://github.com/P-H-C/phc-winner-argon2
 * @module PasswordUtil
 */

import * as argon2 from 'argon2';

/**
 * Hash a password using Argon2id
 *
 * Configuration:
 * - Type: Argon2id (hybrid mode)
 * - Memory cost: 64 MB (65536 KiB)
 * - Time cost: 3 iterations
 * - Parallelism: 4 threads
 *
 * @param password - Plain text password to hash
 * @returns Promise<string> - Hashed password with salt
 * @throws Error if hashing fails
 *
 * @example
 * const hashedPassword = await hashPassword('mySecurePassword123');
 * // Returns: $argon2id$v=19$m=65536,t=3,p=4$...
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    return await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3,
      parallelism: 4,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to hash password: ${errorMessage}`);
  }
}

/**
 * Verify a password against its hash
 *
 * Uses constant-time comparison to prevent timing attacks.
 * Automatically handles salt extraction from the hash.
 *
 * @param hash - Stored password hash (from database)
 * @param password - Plain text password to verify
 * @returns Promise<boolean> - True if password matches, false otherwise
 * @throws Error if verification fails (not including mismatch)
 *
 * @example
 * const isValid = await verifyPassword(storedHash, userInputPassword);
 * if (isValid) {
 *   // Password is correct
 * }
 */
export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    // If verification fails due to invalid hash format, return false
    // This prevents information leakage about hash validity
    if (error instanceof Error && error.message?.includes('Invalid hash')) {
      return false;
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to verify password: ${errorMessage}`);
  }
}

/**
 * Check if a password hash needs rehashing
 *
 * This is useful for upgrading password security over time.
 * Returns true if the hash was created with different parameters
 * than the current configuration.
 *
 * @param hash - Stored password hash
 * @returns boolean - True if rehashing is recommended
 *
 * @example
 * if (needsRehash(user.passwordHash)) {
 *   user.passwordHash = await hashPassword(plainPassword);
 *   await userRepo.save(user);
 * }
 */
export function needsRehash(hash: string): boolean {
  try {
    return argon2.needsRehash(hash, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  } catch {
    // If hash is invalid, it definitely needs rehashing
    return true;
  }
}
