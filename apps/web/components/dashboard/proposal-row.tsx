/**
 * ProposalRow Component
 *
 * Individual row in the proposals table showing title, status, deadline, and progress.
 */

'use client';

import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TableCell, TableRow } from '@/components/ui/table';
import type { Proposal, ProposalStatus } from '@/lib/api/proposals';

interface ProposalRowProps {
  proposal: Proposal;
}

/**
 * Get badge variant based on proposal status
 */
function getStatusVariant(
  status: ProposalStatus,
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'draft':
      return 'secondary';
    case 'in_progress':
      return 'default';
    case 'completed':
      return 'outline';
    default:
      return 'default';
  }
}

/**
 * Get badge color classes based on proposal status
 */
function getStatusColorClass(status: ProposalStatus): string {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    default:
      return '';
  }
}

/**
 * Format status for display
 */
function formatStatus(status: ProposalStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    default:
      return status;
  }
}

/**
 * Format date for display
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return '—';

  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `${Math.abs(diffDays)}d overdue`;
  } else if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Tomorrow';
  } else if (diffDays <= 7) {
    return `${diffDays}d`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}

/**
 * ProposalRow Component
 */
export function ProposalRow({ proposal }: ProposalRowProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/proposals/${proposal.id}`);
  };

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={handleClick}
    >
      <TableCell className="font-medium">{proposal.title}</TableCell>
      <TableCell>
        <Badge variant={getStatusVariant(proposal.status)} className={getStatusColorClass(proposal.status)}>
          {formatStatus(proposal.status)}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDate(proposal.dueDate)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Progress value={proposal.progress} className="h-2 w-full max-w-[120px]" />
          <span className="text-sm text-muted-foreground w-10 text-right">
            {proposal.progress}%
          </span>
        </div>
      </TableCell>
    </TableRow>
  );
}
