/**
 * Organization Service
 *
 * Handles CRUD operations for organizations (multi-tenant root entities).
 * Implements soft delete pattern and automatic tenant isolation via Prisma middleware.
 *
 * @module OrganizationService
 */

import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaClient, OrgStatus } from '@prisma/client';

import { CreateOrganizationDto, UpdateOrganizationDto } from './dto';

const prisma = new PrismaClient();

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  /**
   * Create a new organization
   *
   * Flow:
   * 1. Validate slug uniqueness (auto-generate if not provided)
   * 2. Create organization with default settings
   * 3. Return created organization
   *
   * @param dto - Organization creation data
   * @returns Created organization
   * @throws ConflictException if slug already exists
   */
  async create(dto: CreateOrganizationDto) {
    let slug = dto.slug;

    // Auto-generate slug if not provided
    if (!slug) {
      slug = dto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 100);
    }

    // Ensure slug is unique
    let uniqueSlug = slug;
    let counter = 1;
    while (await prisma.organization.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    this.logger.log(`Creating organization: ${dto.name} (slug: ${uniqueSlug})`);

    const organization = await prisma.organization.create({
      data: {
        name: dto.name,
        slug: uniqueSlug,
        plan: dto.plan || 'PROFESSIONAL',
        status: OrgStatus.ACTIVE,
        settings: dto.settings || {},
      },
    });

    this.logger.log(`Organization created successfully: ${organization.id}`);

    return organization;
  }

  /**
   * Find all active organizations
   *
   * Returns all organizations that are not soft-deleted.
   * Includes user count for each organization.
   *
   * @returns Array of organizations with user counts
   */
  async findAll() {
    this.logger.log('Fetching all active organizations');

    return prisma.organization.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find one organization by ID
   *
   * Returns organization with related users and settings.
   *
   * @param id - Organization UUID
   * @returns Organization with users
   * @throws NotFoundException if organization not found or soft-deleted
   */
  async findOne(id: string) {
    this.logger.log(`Fetching organization: ${id}`);

    const organization = await prisma.organization.findUnique({
      where: { id, deletedAt: null },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!organization) {
      this.logger.warn(`Organization not found: ${id}`);
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return organization;
  }

  /**
   * Update organization
   *
   * Updates organization data. Slug cannot be changed after creation
   * to prevent breaking external integrations.
   *
   * @param id - Organization UUID
   * @param dto - Update data
   * @returns Updated organization
   * @throws NotFoundException if organization not found or soft-deleted
   */
  async update(id: string, dto: UpdateOrganizationDto) {
    this.logger.log(`Updating organization: ${id}`);

    // Verify organization exists
    const existing = await prisma.organization.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      this.logger.warn(`Organization not found for update: ${id}`);
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    // Prevent slug modification (slug is immutable after creation)
    const { slug, ...updateData } = dto;
    if (slug && slug !== existing.slug) {
      this.logger.warn(`Attempt to modify slug for organization ${id}`);
      throw new ConflictException('Cannot modify organization slug after creation');
    }

    const updated = await prisma.organization.update({
      where: { id, deletedAt: null },
      data: updateData,
    });

    this.logger.log(`Organization updated successfully: ${id}`);

    return updated;
  }

  /**
   * Soft delete organization
   *
   * Marks organization as deleted without removing from database.
   * Cascades to all related entities via Prisma relations.
   *
   * Security:
   * - Soft delete prevents accidental data loss
   * - Related data (users, proposals, etc.) remain intact
   * - Organization can be restored by setting deletedAt to null
   *
   * @param id - Organization UUID
   * @returns Soft-deleted organization
   * @throws NotFoundException if organization not found or already deleted
   */
  async remove(id: string) {
    this.logger.log(`Soft deleting organization: ${id}`);

    const existing = await prisma.organization.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      this.logger.warn(`Organization not found for deletion: ${id}`);
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    const deleted = await prisma.organization.update({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Organization soft-deleted successfully: ${id}`);

    return deleted;
  }
}
