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
import { UserRole } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { hashPassword } from './utils/password.util';
import { JwtPayload } from './strategies/jwt.strategy';

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
}
