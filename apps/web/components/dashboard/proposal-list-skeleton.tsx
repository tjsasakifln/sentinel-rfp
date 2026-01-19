/**
 * ProposalListSkeleton Component
 *
 * Loading skeleton for the proposal list section.
 */

'use client';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton for proposal list
 */
export function ProposalListSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-16 rounded-lg border bg-card p-4 shadow-sm transition-opacity duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
