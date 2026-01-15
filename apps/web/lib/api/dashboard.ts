/**
 * Dashboard API client
 *
 * Provides methods to fetch dashboard metrics.
 */

import { apiFetch } from './client';

export interface DashboardMetrics {
  totalProposals: number;
  inProgress: number;
  completed: number;
  dueSoon: number;
}

/**
 * Get dashboard metrics
 *
 * @param token - JWT authentication token
 * @returns Dashboard metrics
 */
export async function getDashboardMetrics(token: string): Promise<DashboardMetrics> {
  return apiFetch<DashboardMetrics>('/dashboard/metrics', {
    method: 'GET',
    token,
  });
}
