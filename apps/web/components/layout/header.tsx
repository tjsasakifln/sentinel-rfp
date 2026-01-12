'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';

export function Header() {
  const { toggleSidebar, isMobile } = useUIStore();

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      role="banner"
    >
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Left section: Hamburger (mobile) + Logo */}
        <div className="flex items-center gap-4">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label="Toggle navigation menu"
              className="md:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
          )}

          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-xl hover:opacity-80 transition-opacity"
            aria-label="Sentinel RFP Home"
          >
            <svg
              className="h-8 w-8 text-sentinel-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span className="hidden sm:inline-block text-foreground">
              Sentinel <span className="text-sentinel-600">RFP</span>
            </span>
          </Link>
        </div>

        {/* Right section: User menu placeholder */}
        <div className="flex items-center gap-2">
          <nav aria-label="User menu">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              aria-label="User account"
            >
              <span className="sr-only">User menu</span>
              <div className="h-8 w-8 rounded-full bg-sentinel-600 flex items-center justify-center text-white text-sm font-medium">
                U
              </div>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
