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
  HttpCode,
  HttpStatus,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
   * Rate Limiting: 5 requests per minute per IP
   *
   * Security:
   * - Generic error messages prevent user enumeration
   * - Constant-time password verification prevents timing attacks
   * - Rate limiting prevents brute force attacks
   *
   * @param dto - Login credentials
   * @returns AuthResponseDto with tokens and user info
   * @throws UnauthorizedException if credentials invalid (401)
   * @throws BadRequestException if validation fails (400)
   * @throws ThrottlerException if rate limit exceeded (429)
   */
  @Public()
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
   * Rate Limiting: 10 requests per minute per IP
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
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 req/min
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    dto: RefreshDto,
  ): Promise<AuthResponseDto> {
    return this.authService.refresh(dto);
  }
}
