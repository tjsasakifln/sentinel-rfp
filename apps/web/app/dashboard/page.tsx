/**
 * Dashboard Page
 *
 * Main dashboard view showing key metrics and proposals.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { FileText, Clock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { MetricCard } from '@/components/dashboard/metric-card';
import { ProposalList } from '@/components/dashboard/proposal-list';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { Button } from '@/components/ui/button';
import { getDashboardMetrics } from '@/lib/api/dashboard';

/**
 * Dashboard error state with retry
 */
function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-destructive bg-destructive/10 p-6 transition-all duration-200">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h3 className="mb-2 text-lg font-semibold text-destructive">Failed to load dashboard</h3>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
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
    refetch,
  } = useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: () => getDashboardMetrics(mockToken),
    // Refetch every 30 seconds
    refetchInterval: 30000,
    // Disable automatic retry for better error state visibility
    retry: false,
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <DashboardError error={error as Error} onRetry={() => refetch()} />
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

      {/* Metrics Cards with smooth transition */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 transition-opacity duration-200">
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

      {/* Proposals List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Proposals</h2>
            <p className="text-sm text-muted-foreground">View and manage all your proposals</p>
          </div>
        </div>
        <ProposalList token={mockToken} />
      </div>
    </div>
  );
}
