/**
 * ProposalList Component
 *
 * Table listing proposals with search, filters, and pagination.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { FileText, Search } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from './empty-state';
import { ProposalListSkeleton } from './proposal-list-skeleton';
import { ProposalRow } from './proposal-row';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listProposals, type ProposalStatus } from '@/lib/api/proposals';

interface ProposalListProps {
  token: string;
}

/**
 * Error state for proposal list
 */
function ErrorState({ error }: { error: Error }) {
  return (
    <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
      <h3 className="mb-2 text-lg font-semibold text-destructive">Failed to load proposals</h3>
      <p className="text-sm text-muted-foreground">{error.message}</p>
    </div>
  );
}

/**
 * Pagination controls
 */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

/**
 * ProposalList Component
 */
export function ProposalList({ token }: ProposalListProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProposalStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['proposals', { status, search, page, limit }],
    queryFn: () =>
      listProposals(token, {
        status,
        search: search || undefined,
        page,
        limit,
      }),
    // Refetch when window refocuses
    refetchOnWindowFocus: true,
  });

  const hasFilters = search !== '' || status !== 'all';

  if (error) {
    return <ErrorState error={error as Error} />;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search proposals..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // Reset to first page on search
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as ProposalStatus | 'all');
            setPage(1); // Reset to first page on filter change
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="transition-opacity duration-200">
        {isLoading ? (
          <ProposalListSkeleton />
        ) : data && data.data.length > 0 ? (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Title</TableHead>
                    <TableHead className="w-[20%]">Status</TableHead>
                    <TableHead className="w-[15%]">Deadline</TableHead>
                    <TableHead className="w-[25%]">Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((proposal) => (
                    <ProposalRow key={proposal.id} proposal={proposal} />
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {data.meta.totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={data.meta.totalPages}
                onPageChange={setPage}
              />
            )}
          </>
        ) : (
          <EmptyState
            icon={<FileText className="h-8 w-8 text-muted-foreground" />}
            title={hasFilters ? 'No proposals found' : 'No proposals yet'}
            description={
              hasFilters
                ? "Try adjusting your filters or search query to find what you're looking for."
                : 'Create your first proposal to get started with Sentinel RFP.'
            }
            showCTA={!hasFilters}
            ctaText="Create Proposal"
          />
        )}
      </div>
    </div>
  );
}
