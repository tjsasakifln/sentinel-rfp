/**
 * Authentication Module
 *
 * Provides JWT-based authentication using RS256 asymmetric signing.
 * Uses Passport.js for authentication strategy and @nestjs/jwt for token management.
 *
 * Security Features:
 * - RS256 asymmetric signing (public/private key pair)
 * - Short-lived access tokens (15 minutes)
 * - Argon2id password hashing
 * - Rate limiting on auth endpoints
 *
 * @module AuthModule
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    // Configure Passport with JWT as default strategy
    PassportModule.register({
      defaultStrategy: 'jwt',
      property: 'user',
      session: false,
    }),

    // Configure JWT module with RS256 asymmetric signing
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const privateKey = configService.get<string>('JWT_PRIVATE_KEY');
        const publicKey = configService.get<string>('JWT_PUBLIC_KEY');

        if (!privateKey || !publicKey) {
          throw new Error(
            'JWT keys not configured. Run scripts/generate-jwt-keys.sh to generate keys.',
          );
        }

        // Decode base64-encoded keys
        const decodedPrivateKey = Buffer.from(privateKey, 'base64').toString(
          'utf8',
        );
        const decodedPublicKey = Buffer.from(publicKey, 'base64').toString(
          'utf8',
        );

        return {
          privateKey: decodedPrivateKey,
          publicKey: decodedPublicKey,
          signOptions: {
            algorithm: 'RS256',
            expiresIn: '15m', // Access token expires in 15 minutes
            issuer: 'sentinel-rfp',
            audience: 'sentinel-rfp-api',
          },
          verifyOptions: {
            algorithms: ['RS256'],
            issuer: 'sentinel-rfp',
            audience: 'sentinel-rfp-api',
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule, PassportModule, AuthService],
})
export class AuthModule {}
