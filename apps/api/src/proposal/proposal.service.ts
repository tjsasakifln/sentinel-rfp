/**
 * Proposal Service - Business logic for proposal management
 *
 * Handles CRUD operations for proposals with multi-tenancy enforcement.
 * CRUD methods implemented:
 * - create() - Issue #145 ✅
 * - findAll() - Issue #146 ✅
 * - findOne() - Issue #146 ✅
 * - update() - Issue #147 ✅ (current)
 * - remove() - Issue #148 (pending implementation)
 *
 * @module ProposalService
 */

import { Injectable, Logger, NotFoundException, NotImplementedException } from '@nestjs/common';
import { PrismaClient, Proposal, ProposalSection } from '@prisma/client';

import { CreateProposalDto, UpdateProposalDto } from './dto';

const prisma = new PrismaClient();

@Injectable()
export class ProposalService {
  private readonly logger = new Logger(ProposalService.name);

  /**
   * Create a new proposal
   *
   * @param createProposalDto - Proposal data
   * @param organizationId - Organization ID from authenticated user
   * @returns Created proposal
   */
  async create(createProposalDto: CreateProposalDto, organizationId: string): Promise<Proposal> {
    this.logger.log(`Creating proposal for organization ${organizationId}`);

    const proposal = await prisma.proposal.create({
      data: {
        title: createProposalDto.title,
        rfpNumber: createProposalDto.rfpNumber,
        status: createProposalDto.status || 'draft',
        organizationId,
      },
    });

    this.logger.log(`Proposal created successfully: ${proposal.id}`);

    return proposal;
  }

  /**
   * Find all proposals for an organization with pagination
   *
   * @param organizationId - Organization ID from authenticated user
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 20)
   * @returns Paginated proposals with metadata
   */
  async findAll(
    organizationId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: Proposal[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    this.logger.log(`Fetching proposals for organization ${organizationId}, page ${page}, limit ${limit}`);

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute queries in parallel
    const [data, total] = await Promise.all([
      prisma.proposal.findMany({
        where: {
          organizationId,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.proposal.count({
        where: {
          organizationId,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    this.logger.log(`Found ${data.length} proposals (total: ${total})`);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Find one proposal by ID with nested sections
   *
   * @param id - Proposal ID
   * @param organizationId - Organization ID from authenticated user
   * @returns Proposal with sections
   * @throws NotFoundException - If proposal not found or not owned by organization
   */
  async findOne(id: string, organizationId: string): Promise<Proposal & { sections: ProposalSection[] }> {
    this.logger.log(`Fetching proposal ${id} for organization ${organizationId}`);

    const proposal = await prisma.proposal.findUnique({
      where: {
        id,
      },
      include: {
        sections: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    // Check if proposal exists
    if (!proposal) {
      this.logger.warn(`Proposal ${id} not found`);
      throw new NotFoundException(`Proposal with ID ${id} not found`);
    }

    // Enforce tenant isolation
    if (proposal.organizationId !== organizationId) {
      this.logger.warn(`Unauthorized access attempt: proposal ${id} does not belong to organization ${organizationId}`);
      throw new NotFoundException(`Proposal with ID ${id} not found`);
    }

    this.logger.log(`Proposal ${id} retrieved successfully with ${proposal.sections.length} sections`);

    return proposal;
  }

  /**
   * Update a proposal
   *
   * @param id - Proposal ID
   * @param updateProposalDto - Fields to update
   * @param organizationId - Organization ID from authenticated user
   * @returns Updated proposal
   * @throws NotFoundException - If proposal not found or not owned by organization
   */
  async update(
    id: string,
    updateProposalDto: UpdateProposalDto,
    organizationId: string,
  ): Promise<Proposal> {
    this.logger.log(`Updating proposal ${id} for organization ${organizationId}`);

    // 1. Buscar proposal (verifica existência e tenant isolation)
    const existingProposal = await prisma.proposal.findUnique({
      where: { id },
    });

    if (!existingProposal) {
      this.logger.warn(`Proposal ${id} not found`);
      throw new NotFoundException(`Proposal with ID ${id} not found`);
    }

    if (existingProposal.organizationId !== organizationId) {
      this.logger.warn(`Unauthorized access attempt: proposal ${id} does not belong to organization ${organizationId}`);
      throw new NotFoundException(`Proposal with ID ${id} not found`);
    }

    // 2. Update proposal (Prisma atualiza updatedAt automaticamente)
    const updatedProposal = await prisma.proposal.update({
      where: { id },
      data: updateProposalDto,
    });

    this.logger.log(`Proposal ${id} updated successfully`);

    return updatedProposal;
  }

  /**
   * Soft delete a proposal
   *
   * @param id - Proposal ID
   * @param organizationId - Organization ID from authenticated user
   * @returns void
   * @throws NotImplementedException - To be implemented in #148
   * @throws NotFoundException - If proposal not found or not owned by organization
   */
  async remove(_id: string, _organizationId: string): Promise<void> {
    // Implementation in issue #148 (PROP-49e)
    throw new NotImplementedException('Proposal deletion not yet implemented. See issue #148');
  }
}
