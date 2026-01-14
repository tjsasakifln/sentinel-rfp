/**
 * Proposal Controller - REST API endpoints for proposal management
 *
 * Provides CRUD endpoints with JWT authentication and Swagger documentation.
 * All endpoints enforce multi-tenancy via JWT user context.
 *
 * @module ProposalController
 */

import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard';

import { CreateProposalDto, UpdateProposalDto } from './dto';
import { ProposalService } from './proposal.service';

/**
 * User payload extracted from JWT token
 */
interface JwtPayload {
  userId: string;
  email: string;
  organizationId: string;
  role: string;
}

@ApiTags('proposals')
@Controller('proposals')
@UseGuards(JwtAuthGuard)
export class ProposalController {
  constructor(private readonly proposalService: ProposalService) {}

  /**
   * Create a new proposal
   *
   * POST /api/v1/proposals
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new proposal' })
  @ApiResponse({
    status: 201,
    description: 'Proposal created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async create(@Body() createProposalDto: CreateProposalDto, @CurrentUser() user: JwtPayload) {
    return this.proposalService.create(createProposalDto, user.organizationId);
  }

  /**
   * Get all proposals for the authenticated user's organization
   *
   * GET /api/v1/proposals?page=1&limit=20
   */
  @Get()
  @ApiOperation({ summary: 'List all proposals with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Proposals retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.proposalService.findAll(user.organizationId, page, limit);
  }

  /**
   * Get a single proposal by ID
   *
   * GET /api/v1/proposals/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a proposal by ID' })
  @ApiResponse({
    status: 200,
    description: 'Proposal retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.proposalService.findOne(id, user.organizationId);
  }

  /**
   * Update a proposal
   *
   * PUT /api/v1/proposals/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a proposal' })
  @ApiResponse({
    status: 200,
    description: 'Proposal updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProposalDto: UpdateProposalDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.proposalService.update(id, updateProposalDto, user.organizationId);
  }

  /**
   * Delete a proposal (soft delete)
   *
   * DELETE /api/v1/proposals/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a proposal' })
  @ApiResponse({
    status: 204,
    description: 'Proposal deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.proposalService.remove(id, user.organizationId);
  }
}
