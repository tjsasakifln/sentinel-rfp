/**
 * Dashboard Page
 *
 * Main dashboard view showing key metrics and proposals.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { FileText, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

import { MetricCard } from '@/components/dashboard/metric-card';
import { ProposalList } from '@/components/dashboard/proposal-list';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { getDashboardMetrics } from '@/lib/api/dashboard';

/**
 * Dashboard skeleton loader
 */
function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

/**
 * Dashboard error state
 */
function DashboardError({ error }: { error: Error }) {
  return (
    <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
      <h3 className="mb-2 text-lg font-semibold text-destructive">Failed to load dashboard</h3>
      <p className="text-sm text-muted-foreground">{error.message}</p>
    </div>
  );
}

/**
 * Dashboard Page Component
 */
export default function DashboardPage() {
  // TODO: Replace with actual auth token from NextAuth
  // For now, using a mock token for development
  const mockToken = 'dev-token';

  const {
    data: metrics,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: () => getDashboardMetrics(mockToken),
    // Refetch every 30 seconds
    refetchInterval: 30000,
  });

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <DashboardError error={error as Error} />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s an overview of your proposals.
          </p>
        </div>
        <QuickActions />
      </div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Proposals"
            value={metrics?.totalProposals ?? 0}
            icon={FileText}
            description="Active proposals in your organization"
          />
          <MetricCard
            title="In Progress"
            value={metrics?.inProgress ?? 0}
            icon={Clock}
            description="Proposals being worked on"
          />
          <MetricCard
            title="Completed"
            value={metrics?.completed ?? 0}
            icon={CheckCircle2}
            description="Proposals ready for submission"
          />
          <MetricCard
            title="Due Soon"
            value={metrics?.dueSoon ?? 0}
            icon={AlertCircle}
            description="Due within 7 days"
            className={
              (metrics?.dueSoon ?? 0) > 0
                ? 'border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20'
                : ''
            }
          />
        </div>
      )}

      {/* Proposals List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Proposals</h2>
            <p className="text-sm text-muted-foreground">
              View and manage all your proposals
            </p>
          </div>
        </div>
        <ProposalList token={mockToken} />
      </div>
    </div>
  );
}
