/**
 * User Service
 *
 * Handles user-organization relationship management for multi-tenancy.
 * Enables users to belong to multiple organizations with different roles.
 *
 * @module UserService
 */

import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  /**
   * Add user to organization
   *
   * Creates a UserOrganization relationship with specified role.
   * Validates that relationship doesn't already exist.
   *
   * @param userId - User UUID
   * @param organizationId - Organization UUID
   * @param role - User role in the organization (default: MEMBER)
   * @returns Created UserOrganization with user and organization data
   * @throws NotFoundException if user or organization not found
   * @throws ConflictException if relationship already exists
   */
  async addToOrganization(
    userId: string,
    organizationId: string,
    role: UserRole = UserRole.MEMBER,
  ) {
    this.logger.log(`Adding user ${userId} to organization ${organizationId} with role ${role}`);

    // Validate user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Validate organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId, deletedAt: null },
    });
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    // Check if relationship already exists
    const existing = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `User ${userId} is already a member of organization ${organizationId}`,
      );
    }

    const userOrg = await prisma.userOrganization.create({
      data: {
        userId,
        organizationId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    this.logger.log(`User ${userId} successfully added to organization ${organizationId}`);

    return userOrg;
  }

  /**
   * Remove user from organization
   *
   * Deletes the UserOrganization relationship.
   * User and Organization entities remain intact.
   *
   * @param userId - User UUID
   * @param organizationId - Organization UUID
   * @returns Deleted UserOrganization
   * @throws NotFoundException if relationship not found
   */
  async removeFromOrganization(userId: string, organizationId: string) {
    this.logger.log(`Removing user ${userId} from organization ${organizationId}`);

    const existing = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `User ${userId} is not a member of organization ${organizationId}`,
      );
    }

    const deleted = await prisma.userOrganization.delete({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    this.logger.log(`User ${userId} successfully removed from organization ${organizationId}`);

    return deleted;
  }

  /**
   * Get all organizations for a user
   *
   * Returns list of organizations the user belongs to with their roles.
   *
   * @param userId - User UUID
   * @returns Array of UserOrganization relationships with organization details
   */
  async getUserOrganizations(userId: string) {
    this.logger.log(`Fetching organizations for user ${userId}`);

    return prisma.userOrganization.findMany({
      where: { userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  /**
   * Get user's role in a specific organization
   *
   * @param userId - User UUID
   * @param organizationId - Organization UUID
   * @returns User's role in the organization
   * @throws NotFoundException if user is not a member of the organization
   */
  async getUserRole(userId: string, organizationId: string): Promise<UserRole> {
    this.logger.log(`Fetching role for user ${userId} in organization ${organizationId}`);

    const userOrg = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!userOrg) {
      throw new NotFoundException(
        `User ${userId} is not a member of organization ${organizationId}`,
      );
    }

    return userOrg.role;
  }

  /**
   * Update user's role in an organization
   *
   * @param userId - User UUID
   * @param organizationId - Organization UUID
   * @param role - New role
   * @returns Updated UserOrganization
   * @throws NotFoundException if relationship not found
   */
  async updateUserRole(userId: string, organizationId: string, role: UserRole) {
    this.logger.log(
      `Updating role for user ${userId} in organization ${organizationId} to ${role}`,
    );

    const existing = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `User ${userId} is not a member of organization ${organizationId}`,
      );
    }

    const updated = await prisma.userOrganization.update({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    this.logger.log(
      `Role updated successfully for user ${userId} in organization ${organizationId}`,
    );

    return updated;
  }
}
