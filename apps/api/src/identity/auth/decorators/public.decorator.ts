/**
 * Public Route Decorator
 *
 * Mark routes as public (no authentication required).
 * Use with JwtAuthGuard to bypass authentication.
 *
 * @module PublicDecorator
 */

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Public Decorator
 *
 * Mark a route as public, bypassing JWT authentication.
 * Should be used sparingly - most routes should require auth.
 *
 * @example
 * @Public()
 * @Post('register')
 * async register(@Body() dto: RegisterDto) {
 *   return this.authService.register(dto);
 * }
 *
 * @example
 * @Public()
 * @Post('login')
 * async login(@Body() dto: LoginDto) {
 *   return this.authService.login(dto);
 * }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
