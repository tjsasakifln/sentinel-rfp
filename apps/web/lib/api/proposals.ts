/**
 * Proposals API client
 *
 * Provides methods to fetch and manage proposals.
 */

import { apiFetch } from './client';

export type ProposalStatus = 'draft' | 'in_progress' | 'completed';

export interface Proposal {
  id: string;
  title: string;
  description: string | null;
  status: ProposalStatus;
  dueDate: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalFilters {
  status?: ProposalStatus | 'all';
  search?: string;
  page?: number;
  limit?: number;
}

export interface ProposalListResponse {
  data: Proposal[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * List proposals with filters and pagination
 *
 * @param token - JWT authentication token
 * @param filters - Optional filters
 * @returns Paginated list of proposals
 */
export async function listProposals(
  token: string,
  filters: ProposalFilters = {},
): Promise<ProposalListResponse> {
  const params = new URLSearchParams();

  if (filters.status && filters.status !== 'all') {
    params.append('status', filters.status);
  }
  if (filters.search) {
    params.append('search', filters.search);
  }
  if (filters.page) {
    params.append('page', String(filters.page));
  }
  if (filters.limit) {
    params.append('limit', String(filters.limit));
  }

  const queryString = params.toString();
  const endpoint = queryString ? `/proposals?${queryString}` : '/proposals';

  return apiFetch<ProposalListResponse>(endpoint, {
    method: 'GET',
    token,
  });
}

/**
 * Get a single proposal by ID
 *
 * @param token - JWT authentication token
 * @param id - Proposal ID
 * @returns Proposal details
 */
export async function getProposal(token: string, id: string): Promise<Proposal> {
  return apiFetch<Proposal>(`/proposals/${id}`, {
    method: 'GET',
    token,
  });
}
