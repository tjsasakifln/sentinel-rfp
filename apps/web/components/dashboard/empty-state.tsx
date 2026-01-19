/**
 * EmptyState Component
 *
 * Generic empty state component for dashboard sections with no data.
 */

'use client';

import { FileText, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  /**
   * Custom icon to display (defaults to FileText)
   */
  icon?: ReactNode;

  /**
   * Main heading text
   */
  title: string;

  /**
   * Description text
   */
  description: string;

  /**
   * Show CTA button
   */
  showCTA?: boolean;

  /**
   * CTA button text (defaults to "Create Proposal")
   */
  ctaText?: string;

  /**
   * CTA button action (defaults to navigate to /proposals/new)
   */
  onCTAClick?: () => void;
}

/**
 * EmptyState Component
 */
export function EmptyState({
  icon,
  title,
  description,
  showCTA = false,
  ctaText = 'Create Proposal',
  onCTAClick,
}: EmptyStateProps) {
  const router = useRouter();

  const handleCTAClick = () => {
    if (onCTAClick) {
      onCTAClick();
    } else {
      router.push('/proposals/new');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4 transition-colors duration-200">
        {icon ?? <FileText className="h-8 w-8 text-muted-foreground" />}
      </div>

      <h3 className="text-lg font-semibold mb-2">{title}</h3>

      <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>

      {showCTA && (
        <Button onClick={handleCTAClick} className="transition-all duration-200">
          <Plus className="mr-2 h-4 w-4" />
          {ctaText}
        </Button>
      )}
    </div>
  );
}
