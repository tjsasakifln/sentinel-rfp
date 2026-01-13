/**
 * JWT Authentication Guard
 *
 * Guards routes requiring authentication.
 * Use @UseGuards(JwtAuthGuard) to protect endpoints.
 *
 * @module JwtAuthGuard
 */

import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JWT Authentication Guard
 *
 * Automatically applied to all routes except those marked with @Public().
 * Validates JWT token from Authorization header.
 *
 * @example
 * // Protect a single endpoint
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@Req() req) {
 *   return req.user;
 * }
 *
 * @example
 * // Apply globally in main.ts
 * app.useGlobalGuards(new JwtAuthGuard(reflector));
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Determine if authentication is required
   *
   * Skip authentication for routes marked with @Public()
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Proceed with JWT validation
    return super.canActivate(context);
  }
}
