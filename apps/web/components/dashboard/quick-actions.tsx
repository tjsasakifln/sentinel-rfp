/**
 * QuickActions Component
 *
 * Provides quick access buttons for common dashboard actions.
 * Includes prominent Create Proposal button and dropdown menu with shortcuts.
 */

'use client';

import { Plus, Upload, Library, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * QuickActions - Primary action buttons for dashboard
 */
export function QuickActions() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {/* Primary action: Create Proposal */}
      <Button size="lg" onClick={() => router.push('/proposals/new')}>
        <Plus className="mr-2 h-4 w-4" /> Create Proposal
      </Button>

      {/* Quick Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="lg">
            Quick Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => router.push('/rfps/upload')}>
            <Upload className="mr-2 h-4 w-4" />
            <span>Upload RFP</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/knowledge')}>
            <Library className="mr-2 h-4 w-4" />
            <span>View Library</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
