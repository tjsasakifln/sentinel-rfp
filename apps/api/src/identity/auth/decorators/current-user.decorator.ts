/**
 * Current User Decorator
 *
 * Extract authenticated user from request.
 * Provides type-safe access to request.user
 *
 * @module CurrentUserDecorator
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { AuthenticatedUser } from '../strategies/jwt.strategy';

/**
 * Current User Decorator
 *
 * Extract the authenticated user from the request.
 * User object is populated by JwtStrategy.validate()
 *
 * @example
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@CurrentUser() user: AuthenticatedUser) {
 *   return {
 *     id: user.id,
 *     email: user.email,
 *     organizationId: user.organizationId
 *   };
 * }
 *
 * @example
 * // Extract specific field
 * @Get('my-org')
 * @UseGuards(JwtAuthGuard)
 * getMyOrganization(@CurrentUser('organizationId') orgId: string) {
 *   return this.orgService.findOne(orgId);
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    return data ? user?.[data] : user;
  },
);
