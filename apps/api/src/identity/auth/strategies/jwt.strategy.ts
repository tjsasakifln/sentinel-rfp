/**
 * JWT Authentication Strategy
 *
 * Passport strategy for validating JWT access tokens.
 * Extracts token from Authorization header (Bearer scheme).
 *
 * @module JwtStrategy
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { TokenBlacklistService } from '../token-blacklist.service';

/**
 * JWT Payload Interface
 *
 * Defines the structure of data encoded in JWT tokens.
 * Keep payload minimal to reduce token size.
 */
export interface JwtPayload {
  /** User UUID */
  sub: string;
  /** User email */
  email: string;
  /** Organization UUID */
  organizationId: string;
  /** User role */
  role: string;
  /** Token issued at (Unix timestamp) */
  iat?: number;
  /** Token expires at (Unix timestamp) */
  exp?: number;
}

/**
 * Authenticated User
 *
 * User object attached to request after successful authentication.
 * Available via @Req() decorator or request.user
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  organizationId: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly tokenBlacklist: TokenBlacklistService,
  ) {
    const publicKey = configService.get<string>('JWT_PUBLIC_KEY');

    if (!publicKey) {
      throw new Error('JWT_PUBLIC_KEY not configured');
    }

    const decodedPublicKey = Buffer.from(publicKey, 'base64').toString('utf8');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: decodedPublicKey,
      algorithms: ['RS256'],
      issuer: 'sentinel-rfp',
      audience: 'sentinel-rfp-api',
      passReqToCallback: true, // Pass request to validate method
    });
  }

  /**
   * Validate JWT payload
   *
   * Called automatically by Passport after token is verified.
   * Return value is attached to request.user
   *
   * Security Checks:
   * - Validates required fields in payload
   * - Checks if token is blacklisted (logout or refresh rotation)
   *
   * @param req - Express request object
   * @param payload - Decoded JWT payload
   * @returns AuthenticatedUser object
   * @throws UnauthorizedException if payload is invalid or token is blacklisted
   */
  async validate(req: Request, payload: JwtPayload): Promise<AuthenticatedUser> {
    // Validate required fields
    if (!payload.sub || !payload.email || !payload.organizationId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Extract token from Authorization header
    const authorization = req.headers.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header missing or invalid');
    }

    const token = authorization.substring(7); // Remove 'Bearer ' prefix

    // Check if token is blacklisted (logout or refresh rotation)
    if (this.tokenBlacklist.isBlacklisted(token)) {
      throw new UnauthorizedException('Token has been invalidated');
    }

    // Additional validation can be added here:
    // - Check if user still exists in database
    // - Check if user is active
    // - Check if organization is active

    // Return user object that will be attached to request
    return {
      id: payload.sub,
      email: payload.email,
      organizationId: payload.organizationId,
      role: payload.role,
    };
  }
}
