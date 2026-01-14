/**
 * Authentication Service
 *
 * Handles user registration, login, token management, and logout.
 * Integrates with JWT module and Argon2id password hashing.
 *
 * @module AuthService
 */

import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole , PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();

import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginAttemptsGuard } from './guards/login-attempts.guard';
import { JwtPayload } from './strategies/jwt.strategy';
import { TokenBlacklistService } from './token-blacklist.service';
import { hashPassword, verifyPassword } from './utils/password.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenBlacklist: TokenBlacklistService,
    private readonly loginAttemptsGuard: LoginAttemptsGuard,
  ) {}

  /**
   * Register a new user
   *
   * Flow:
   * 1. Check if email already exists in organization
   * 2. If organizationId provided, validate organization exists
   * 3. If organizationId not provided, create new organization (user becomes OWNER)
   * 4. Hash password with Argon2id
   * 5. Create user in database
   * 6. Generate JWT tokens
   * 7. Return tokens and user data
   *
   * @param dto - Registration data
   * @returns AuthResponseDto with tokens and user info
   * @throws ConflictException if email already exists
   * @throws NotFoundException if organizationId invalid
   */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const {
      email,
      password,
      firstName,
      lastName,
      organizationId,
      organizationName,
    } = dto;

    this.logger.log(`Registration attempt for email: ${email}`);

    // Validate organization context
    let targetOrganizationId: string;
    let userRole: UserRole;
    let orgName: string;

    if (organizationId) {
      // Join existing organization
      const existingOrg = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true, status: true },
      });

      if (!existingOrg) {
        this.logger.warn(`Invalid organization ID: ${organizationId}`);
        throw new NotFoundException('Organization not found');
      }

      if (existingOrg.status !== 'ACTIVE') {
        this.logger.warn(
          `Attempt to join inactive organization: ${organizationId}`,
        );
        throw new UnauthorizedException(
          'Cannot join inactive organization',
        );
      }

      // Check if email already exists in this organization
      const existingUser = await prisma.user.findUnique({
        where: {
          organizationId_email: {
            organizationId: existingOrg.id,
            email,
          },
        },
      });

      if (existingUser) {
        this.logger.warn(
          `Email ${email} already exists in organization ${organizationId}`,
        );
        throw new ConflictException(
          'Email already exists in this organization',
        );
      }

      targetOrganizationId = existingOrg.id;
      userRole = UserRole.MEMBER; // Default role when joining existing org
      orgName = existingOrg.name;

      this.logger.log(
        `User ${email} joining existing organization: ${orgName}`,
      );
    } else {
      // Create new organization
      if (!organizationName || organizationName.trim().length === 0) {
        throw new UnauthorizedException(
          'Organization name required when creating new organization',
        );
      }

      // Generate unique slug from organization name
      const slug = organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 100);

      // Ensure slug is unique
      let uniqueSlug = slug;
      let counter = 1;
      while (
        await prisma.organization.findUnique({ where: { slug: uniqueSlug } })
      ) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }

      const newOrg = await prisma.organization.create({
        data: {
          name: organizationName,
          slug: uniqueSlug,
          plan: 'PROFESSIONAL',
          status: 'ACTIVE',
        },
        select: { id: true, name: true },
      });

      targetOrganizationId = newOrg.id;
      userRole = UserRole.OWNER; // First user becomes OWNER
      orgName = newOrg.name;

      this.logger.log(
        `Created new organization: ${orgName} (${targetOrganizationId})`,
      );
    }

    // Hash password with Argon2id
    const passwordHash = await hashPassword(password);

    // Create user
    const fullName = `${firstName} ${lastName}`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: fullName,
        role: userRole,
        status: 'ACTIVE',
        organizationId: targetOrganizationId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        createdAt: true,
      },
    });

    this.logger.log(
      `User created successfully: ${user.email} (${user.id}) as ${user.role}`,
    );

    // Generate JWT tokens
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    // Refresh token: 7 days expiration
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    // Return authentication response
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: orgName,
      },
    };
  }

  /**
   * Login user with email and password
   *
   * Flow:
   * 1. Find user by email (without organization filter)
   * 2. Verify password with Argon2id
   * 3. Check user and organization status
   * 4. Generate JWT tokens
   * 5. Return tokens and user data
   *
   * Security:
   * - Generic error messages prevent user enumeration
   * - Constant-time password verification prevents timing attacks
   * - Rate limiting enforced at controller level
   *
   * @param dto - Login credentials
   * @returns AuthResponseDto with tokens and user info
   * @throws UnauthorizedException if credentials invalid or user/org inactive
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = dto;

    this.logger.log(`Login attempt for email: ${email}`);

    // Find user by email (includes organization data)
    const user = await prisma.user.findFirst({
      where: { email },
      include: {
        organization: {
          select: { id: true, name: true, status: true },
        },
      },
    });

    // Generic error message to prevent user enumeration
    if (!user || !user.passwordHash) {
      this.logger.warn(`Login failed: User not found or no password for email ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password with constant-time comparison
    const isPasswordValid = await verifyPassword(user.passwordHash, password);

    if (!isPasswordValid) {
      this.logger.warn(`Login failed: Invalid password for email ${email}`);
      // Record failed attempt for email-based rate limiting
      this.loginAttemptsGuard.recordFailedAttempt(email);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check user status (ACTIVE, INVITED, SUSPENDED)
    if (user.status !== 'ACTIVE') {
      this.logger.warn(
        `Login failed: User status is ${user.status} for email ${email}`,
      );
      throw new UnauthorizedException('Account is not active');
    }

    // Check organization status (ACTIVE, SUSPENDED, CHURNED)
    if (user.organization.status !== 'ACTIVE') {
      this.logger.warn(
        `Login failed: Organization status is ${user.organization.status} for email ${email}`,
      );
      throw new UnauthorizedException('Organization is not active');
    }

    this.logger.log(
      `User logged in successfully: ${user.email} (${user.id}) from organization ${user.organization.name}`,
    );

    // Reset failed login attempts after successful login
    this.loginAttemptsGuard.resetAttempts(email);

    // Generate JWT tokens
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    // Refresh token: 7 days expiration
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    // Return authentication response
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
      },
    };
  }

  /**
   * Refresh access token using refresh token
   *
   * Flow:
   * 1. Verify refresh token signature and expiration
   * 2. Check if token is blacklisted (already used)
   * 3. Blacklist the old refresh token (rotation)
   * 4. Fetch fresh user data from database
   * 5. Generate new token pair
   * 6. Return new tokens
   *
   * Security - Refresh Token Rotation:
   * - Each refresh generates a NEW refresh token
   * - Old refresh token is immediately blacklisted
   * - If blacklisted token is reused → reject with 401
   * - Prevents replay attacks and token theft
   *
   * TODO: Replace in-memory blacklist with Redis (#120)
   *
   * @param dto - Refresh token
   * @returns AuthResponseDto with new tokens and user info
   * @throws UnauthorizedException if token invalid, expired, or blacklisted
   */
  async refresh(dto: RefreshDto): Promise<AuthResponseDto> {
    const { refreshToken } = dto;

    try {
      // Verify JWT signature and expiration
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
      );

      this.logger.log(
        `Refresh token request for user: ${payload.email} (${payload.sub})`,
      );

      // Check if token is blacklisted (already used)
      if (this.tokenBlacklist.isBlacklisted(refreshToken)) {
        this.logger.warn(
          `Attempted reuse of blacklisted refresh token by user ${payload.email}`,
        );
        throw new UnauthorizedException('Token already used');
      }

      // Blacklist the old refresh token (7 days = 604800000 ms)
      const expirationTime = Date.now() + 7 * 24 * 60 * 60 * 1000;
      this.tokenBlacklist.addToBlacklist(refreshToken, expirationTime);

      this.logger.log(
        `Blacklisted refresh token for user ${payload.email}. Blacklist size: ${this.tokenBlacklist.getBlacklistSize()}`,
      );

      // Fetch fresh user data from database
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          organization: {
            select: { id: true, name: true, status: true },
          },
        },
      });

      // Validate user still exists
      if (!user) {
        this.logger.warn(
          `Refresh failed: User ${payload.sub} no longer exists`,
        );
        throw new UnauthorizedException('User not found');
      }

      // Check user status
      if (user.status !== 'ACTIVE') {
        this.logger.warn(
          `Refresh failed: User ${user.email} status is ${user.status}`,
        );
        throw new UnauthorizedException('Account is not active');
      }

      // Check organization status
      if (user.organization.status !== 'ACTIVE') {
        this.logger.warn(
          `Refresh failed: Organization ${user.organization.name} status is ${user.organization.status}`,
        );
        throw new UnauthorizedException('Organization is not active');
      }

      // Generate NEW token pair (rotation)
      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
      };

      const accessToken = this.jwtService.sign(newPayload);

      // New refresh token with 7 days expiration
      const newRefreshToken = this.jwtService.sign(newPayload, {
        expiresIn: '7d',
      });

      this.logger.log(
        `Refresh successful for user ${user.email}. New tokens generated.`,
      );

      // Return authentication response
      return {
        accessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organization.name,
        },
      };
    } catch (error) {
      // Handle JWT verification errors
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Refresh token verification failed: ${errorMessage}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout user by blacklisting both access and refresh tokens
   *
   * Flow:
   * 1. Extract access token from Authorization header
   * 2. Extract refresh token from request body
   * 3. Decode both tokens to get expiration times
   * 4. Blacklist both tokens with appropriate TTL
   * 5. Return 204 No Content
   *
   * Security - Token Blacklisting:
   * - Both access and refresh tokens are invalidated
   * - Tokens are blacklisted until their natural expiration
   * - TTL is calculated based on remaining time until expiration
   * - Prevents token reuse after logout
   * - JwtAuthGuard checks blacklist before allowing access
   *
   * Implementation Note:
   * - Currently uses in-memory blacklist (single instance)
   * - TODO: Migrate to Redis for distributed blacklist (#120)
   *
   * @param accessToken - Access token from Authorization header
   * @param dto - Logout data containing refresh token
   * @throws UnauthorizedException if tokens are invalid
   */
  async logout(accessToken: string, dto: LogoutDto): Promise<void> {
    const { refreshToken } = dto;

    try {
      // Decode access token to get expiration
      const accessPayload = this.jwtService.decode(accessToken) as JwtPayload & { exp: number };
      if (!accessPayload || !accessPayload.exp) {
        throw new UnauthorizedException('Invalid access token');
      }

      // Decode refresh token to get expiration
      const refreshPayload = this.jwtService.decode(refreshToken) as JwtPayload & { exp: number };
      if (!refreshPayload || !refreshPayload.exp) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      this.logger.log(
        `Logout request for user: ${accessPayload.email} (${accessPayload.sub})`,
      );

      const now = Math.floor(Date.now() / 1000); // Unix timestamp in seconds

      // Blacklist access token (remaining TTL in milliseconds)
      const accessTtl = accessPayload.exp - now;
      if (accessTtl > 0) {
        const accessExpirationTime = Date.now() + accessTtl * 1000;
        this.tokenBlacklist.addToBlacklist(accessToken, accessExpirationTime);
        this.logger.log(
          `Blacklisted access token for user ${accessPayload.email}. TTL: ${accessTtl}s`,
        );
      }

      // Blacklist refresh token (remaining TTL in milliseconds)
      const refreshTtl = refreshPayload.exp - now;
      if (refreshTtl > 0) {
        const refreshExpirationTime = Date.now() + refreshTtl * 1000;
        this.tokenBlacklist.addToBlacklist(refreshToken, refreshExpirationTime);
        this.logger.log(
          `Blacklisted refresh token for user ${accessPayload.email}. TTL: ${refreshTtl}s`,
        );
      }

      this.logger.log(
        `Logout successful for user ${accessPayload.email}. Blacklist size: ${this.tokenBlacklist.getBlacklistSize()}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Logout failed: ${errorMessage}`);
      throw new UnauthorizedException('Logout failed');
    }
  }
}
