/**
 * Dashboard Controller - REST API endpoints for dashboard metrics
 *
 * Provides dashboard aggregations with JWT authentication.
 * All endpoints enforce multi-tenancy via JWT user context.
 *
 * @module DashboardController
 */

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard';

import { DashboardService } from './dashboard.service';

/**
 * User payload extracted from JWT token
 */
interface JwtPayload {
  userId: string;
  email: string;
  organizationId: string;
  role: string;
}

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Get dashboard metrics
   *
   * GET /api/v1/dashboard/metrics
   */
  @Get('metrics')
  @ApiOperation({ summary: 'Get dashboard metrics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard metrics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalProposals: {
          type: 'number',
          description: 'Total active proposals',
          example: 42,
        },
        inProgress: {
          type: 'number',
          description: 'Proposals in progress',
          example: 15,
        },
        completed: {
          type: 'number',
          description: 'Completed proposals',
          example: 27,
        },
        dueSoon: {
          type: 'number',
          description: 'Proposals due within 7 days',
          example: 3,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getMetrics(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getMetrics(user.organizationId);
  }
}
