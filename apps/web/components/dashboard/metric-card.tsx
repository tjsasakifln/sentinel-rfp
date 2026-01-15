/**
 * MetricCard Component
 *
 * Displays a metric value with title and icon.
 * Used in dashboard for key performance indicators.
 */

import { type LucideIcon } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MetricCardProps {
  /**
   * Metric title (e.g., "Total Proposals")
   */
  title: string;

  /**
   * Metric value to display
   */
  value: number | string;

  /**
   * Optional icon from lucide-react
   */
  icon?: LucideIcon;

  /**
   * Optional description/subtitle
   */
  description?: string;

  /**
   * Optional custom className for styling
   */
  className?: string;
}

/**
 * MetricCard - Displays a key metric with icon and title
 */
export function MetricCard({ title, value, icon: Icon, description, className }: MetricCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}
