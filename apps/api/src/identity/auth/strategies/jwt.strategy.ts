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
import { ExtractJwt, Strategy } from 'passport-jwt';

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
  constructor(configService: ConfigService) {
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
    });
  }

  /**
   * Validate JWT payload
   *
   * Called automatically by Passport after token is verified.
   * Return value is attached to request.user
   *
   * @param payload - Decoded JWT payload
   * @returns AuthenticatedUser object
   * @throws UnauthorizedException if payload is invalid
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // Validate required fields
    if (!payload.sub || !payload.email || !payload.organizationId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Additional validation can be added here:
    // - Check if user still exists in database
    // - Check if user is active
    // - Check if token is blacklisted
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
