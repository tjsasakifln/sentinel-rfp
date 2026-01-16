/**
 * Organization Controller
 *
 * REST API endpoints for organization CRUD operations.
 * All routes protected by JWT authentication.
 * Administrative operations restricted to OWNER/ADMIN roles.
 *
 * @module OrganizationController
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';

import { CreateOrganizationDto, UpdateOrganizationDto } from './dto';
import { OrganizationService } from './organization.service';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('v1/organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationController {
  constructor(private readonly service: OrganizationService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create organization',
    description: 'Create a new organization. Restricted to OWNER/ADMIN roles.',
  })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions (OWNER/ADMIN required)',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Organization slug already exists',
  })
  create(@Body() dto: CreateOrganizationDto) {
    return this.service.create(dto);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'List organizations',
    description: 'Get all active organizations with user counts. Restricted to OWNER/ADMIN roles.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active organizations',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions (OWNER/ADMIN required)',
  })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get organization',
    description: 'Get organization details by ID with users. Restricted to OWNER/ADMIN roles.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization details',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions (OWNER/ADMIN required)',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Organization does not exist or is deleted',
  })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update organization',
    description:
      'Update organization details. Slug cannot be modified. Restricted to OWNER/ADMIN roles.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions (OWNER/ADMIN required)',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Organization does not exist or is deleted',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Attempted to modify immutable slug',
  })
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete organization (soft)',
    description: 'Soft delete organization. Restricted to OWNER role only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization soft-deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions (OWNER required)',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Organization does not exist or already deleted',
  })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
