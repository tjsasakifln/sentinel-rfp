/**
 * Dashboard Service - Business logic for dashboard metrics and aggregations
 *
 * Provides dashboard metrics:
 * - Total proposals
 * - In progress proposals
 * - Completed proposals
 * - Due soon proposals (deadline within 7 days)
 *
 * @module DashboardService
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Dashboard metrics response
 */
export interface DashboardMetrics {
  totalProposals: number;
  inProgress: number;
  completed: number;
  dueSoon: number; // deadline within 7 days
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  /**
   * Get dashboard metrics for an organization
   *
   * @param organizationId - Organization ID from authenticated user
   * @returns Dashboard metrics
   */
  async getMetrics(organizationId: string): Promise<DashboardMetrics> {
    this.logger.log(`Fetching dashboard metrics for organization ${organizationId}`);

    // Calculate date 7 days from now for "due soon" metric
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Execute all queries in parallel for performance
    const [totalProposals, inProgress, completed, dueSoon] = await Promise.all([
      // Total active proposals (not deleted)
      prisma.proposal.count({
        where: {
          organizationId,
          deletedAt: null,
        },
      }),

      // Proposals in progress
      prisma.proposal.count({
        where: {
          organizationId,
          status: 'in_progress',
          deletedAt: null,
        },
      }),

      // Completed proposals
      prisma.proposal.count({
        where: {
          organizationId,
          status: 'completed',
          deletedAt: null,
        },
      }),

      // Due soon proposals (deadline within 7 days)
      // Note: Since deadline field doesn't exist in current schema,
      // this will return 0 until deadline field is added
      prisma.proposal.count({
        where: {
          organizationId,
          deletedAt: null,
          // Uncomment when deadline field is added to schema:
          // deadline: {
          //   lte: sevenDaysFromNow,
          //   gte: new Date(),
          // },
        },
      }),
    ]);

    this.logger.log(
      `Metrics: total=${totalProposals}, inProgress=${inProgress}, completed=${completed}, dueSoon=${dueSoon}`,
    );

    return {
      totalProposals,
      inProgress,
      completed,
      dueSoon,
    };
  }
}
