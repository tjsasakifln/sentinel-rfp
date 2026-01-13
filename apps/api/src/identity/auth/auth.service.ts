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
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { hashPassword, verifyPassword } from './utils/password.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly jwtService: JwtService) {}

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
}
