/**
 * Authentication Controller
 *
 * Handles authentication endpoints: register, login, refresh, logout.
 * All endpoints except logout are public (no JWT required).
 *
 * @module AuthController
 */

import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ForgotPasswordResponseDto } from './dto/forgot-password-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordResponseDto } from './dto/reset-password-response.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginAttemptsGuard } from './guards/login-attempts.guard';
import { PasswordResetService } from './password-reset.service';

@ApiTags('identity')
@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  /**
   * POST /v1/auth/register - Register new user
   *
   * Public endpoint (no authentication required).
   * Creates new user and optionally new organization.
   *
   * Rate Limiting: 10 requests per minute per IP
   *
   * @param dto - Registration data
   * @returns AuthResponseDto with tokens and user info
   * @throws ConflictException if email already exists (409)
   * @throws NotFoundException if organizationId invalid (404)
   * @throws BadRequestException if validation fails (400)
   * @throws ThrottlerException if rate limit exceeded (429)
   */
  @ApiOperation({
    summary: 'Register new user',
    description:
      'Creates new user and optionally new organization. Returns JWT tokens and user info.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email already exists',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization ID not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded (10 requests per minute)',
  })
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 req/min
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    dto: RegisterDto,
  ): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  /**
   * POST /v1/auth/login - User login
   *
   * Public endpoint (no authentication required).
   * Validates credentials and returns JWT tokens.
   *
   * Rate Limiting:
   * - 5 requests per minute per IP (Throttler)
   * - Max 5 failed attempts per email in 15 min (LoginAttemptsGuard)
   * - 15-minute lockout after exceeding email-based limit
   *
   * Security:
   * - Generic error messages prevent user enumeration
   * - Constant-time password verification prevents timing attacks
   * - Dual-layer rate limiting prevents brute force attacks
   *
   * @param dto - Login credentials
   * @returns AuthResponseDto with tokens and user info
   * @throws UnauthorizedException if credentials invalid (401)
   * @throws BadRequestException if validation fails (400)
   * @throws ThrottlerException if IP rate limit exceeded (429)
   * @throws TooManyRequestsException if email-based limit exceeded (429)
   */
  @ApiOperation({
    summary: 'User login',
    description:
      'Validates credentials and returns JWT tokens. Dual-layer rate limiting prevents brute force attacks.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded (5 requests per minute or 5 failed attempts in 15 minutes)',
  })
  @Public()
  @UseGuards(LoginAttemptsGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 req/min (stricter than register)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    dto: LoginDto,
  ): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  /**
   * POST /v1/auth/refresh - Refresh access token
   *
   * Public endpoint (no authentication required).
   * Exchanges refresh token for new access + refresh tokens.
   *
   * Rate Limiting: 20 requests per minute per IP
   *
   * Security - Refresh Token Rotation:
   * - Each refresh generates a NEW refresh token
   * - Old refresh token is blacklisted immediately
   * - Reusing a blacklisted token results in 401 Unauthorized
   * - Prevents replay attacks and token theft
   *
   * Implementation Note:
   * - Currently uses in-memory blacklist (single instance)
   * - TODO: Migrate to Redis for distributed blacklist (#120)
   *
   * @param dto - Refresh token
   * @returns AuthResponseDto with new tokens and fresh user info
   * @throws UnauthorizedException if token invalid, expired, or already used (401)
   * @throws BadRequestException if validation fails (400)
   * @throws ThrottlerException if rate limit exceeded (429)
   */
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Exchanges refresh token for new access + refresh tokens. Implements refresh token rotation for security.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token refreshed successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid, expired, or already used refresh token',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded (20 requests per minute)',
  })
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 req/min
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    dto: RefreshDto,
  ): Promise<AuthResponseDto> {
    return this.authService.refresh(dto);
  }

  /**
   * POST /v1/auth/logout - Logout user
   *
   * Protected endpoint (requires authentication).
   * Invalidates both access and refresh tokens via blacklisting.
   *
   * Rate Limiting: 10 requests per minute per IP
   *
   * Security - Token Blacklisting:
   * - Extracts access token from Authorization header
   * - Extracts refresh token from request body
   * - Both tokens are added to blacklist with appropriate TTL
   * - Tokens remain blacklisted until their natural expiration
   * - Prevents token reuse after logout
   *
   * Implementation Note:
   * - Currently uses in-memory blacklist (single instance)
   * - TODO: Migrate to Redis for distributed blacklist (#120)
   *
   * @param authorization - Authorization header with Bearer token
   * @param dto - Logout data containing refresh token
   * @returns 204 No Content
   * @throws UnauthorizedException if tokens invalid (401)
   * @throws BadRequestException if validation fails (400)
   * @throws ThrottlerException if rate limit exceeded (429)
   */
  @ApiOperation({
    summary: 'Logout user',
    description:
      'Invalidates both access and refresh tokens via blacklisting. Prevents token reuse after logout.',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Logout successful',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid tokens or missing authorization header',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded (10 requests per minute)',
  })
  @ApiBearerAuth()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 req/min
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Headers('authorization') authorization: string,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    dto: LogoutDto,
  ): Promise<void> {
    // Extract access token from Authorization header
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header missing or invalid');
    }

    const accessToken = authorization.substring(7); // Remove 'Bearer ' prefix

    return this.authService.logout(accessToken, dto);
  }

  /**
   * POST /v1/auth/forgot-password - Request password reset
   *
   * Public endpoint (no authentication required).
   * Generates secure reset token and sends email.
   *
   * Rate Limiting: 3 requests per hour per IP
   *
   * Security - Preventing User Enumeration:
   * - Generic success message for all requests
   * - No indication whether email exists in system
   * - Same response time regardless of email validity
   * - Reset email only sent if user exists and is active
   *
   * Token Security:
   * - Cryptographically secure random token (32 bytes)
   * - Token hashed with SHA-256 before storage
   * - 1-hour expiration
   * - Single-use enforcement
   *
   * @param dto - Email address requesting password reset
   * @returns Generic success message
   * @throws BadRequestException if validation fails (400)
   * @throws ThrottlerException if rate limit exceeded (429)
   */
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Generates secure reset token and sends email. Generic response prevents user enumeration.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Generic success message (always returned regardless of email existence)',
    type: ForgotPasswordResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded (3 requests per hour)',
  })
  @Public()
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 req/hour (strict to prevent abuse)
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    dto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponseDto> {
    return this.passwordResetService.forgotPassword(dto);
  }

  /**
   * POST /v1/auth/reset-password - Reset password with token
   *
   * Public endpoint (no authentication required).
   * Validates token and updates password.
   *
   * Rate Limiting: 5 requests per hour per IP
   *
   * Security - Token Validation:
   * - Token must match SHA-256 hash in database
   * - Token must not be expired (1-hour TTL)
   * - Token is deleted after successful use (single-use)
   * - Password complexity requirements enforced by DTO validation
   *
   * Password Requirements:
   * - Minimum 8 characters
   * - At least one uppercase letter
   * - At least one lowercase letter
   * - At least one number
   *
   * @param dto - Reset token and new password
   * @returns Success message
   * @throws UnauthorizedException if token invalid, expired, or already used (401)
   * @throws BadRequestException if validation fails (400)
   * @throws ThrottlerException if rate limit exceeded (429)
   */
  @ApiOperation({
    summary: 'Reset password with token',
    description:
      'Validates token and updates password. Token is single-use and expires after 1 hour.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset successfully',
    type: ResetPasswordResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid, expired, or already used reset token',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed (invalid password format or token)',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded (5 requests per hour)',
  })
  @Public()
  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 req/hour
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    dto: ResetPasswordDto,
  ): Promise<ResetPasswordResponseDto> {
    return this.passwordResetService.resetPassword(dto);
  }
}
