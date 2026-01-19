/**
 * DashboardSkeleton Component
 *
 * Loading skeleton for the main dashboard view, including metric cards and proposals section.
 */

'use client';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton for metric cards
 */
function MetricCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between space-x-4">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-10 w-10 rounded-md" />
      </div>
    </div>
  );
}

/**
 * Skeleton for proposals section header
 */
function ProposalsSectionSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      {/* Filters skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-10 w-[180px]" />
      </div>

      {/* Proposal rows skeleton */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/**
 * Complete dashboard skeleton
 */
export function DashboardSkeleton() {
  return (
    <div className="container mx-auto space-y-6 p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Metric cards skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      {/* Proposals section skeleton */}
      <ProposalsSectionSkeleton />
    </div>
  );
}
