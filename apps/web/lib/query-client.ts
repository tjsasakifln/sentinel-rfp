import { QueryClient } from '@tanstack/react-query';

/**
 * Creates a new QueryClient instance with custom defaults optimized for Sentinel RFP.
 *
 * Configuration:
 * - staleTime: 5 minutes - Data is considered fresh for 5 minutes to reduce unnecessary refetches
 * - retry: 2 - Failed queries will be retried up to 2 times
 * - refetchOnWindowFocus: false - Prevent automatic refetch when user returns to tab
 *
 * @returns Configured QueryClient instance
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 5 minutes
        staleTime: 5 * 60 * 1000,
        // Retry failed queries up to 2 times
        retry: 2,
        // Don't refetch automatically when window regains focus
        refetchOnWindowFocus: false,
      },
    },
  });
}
