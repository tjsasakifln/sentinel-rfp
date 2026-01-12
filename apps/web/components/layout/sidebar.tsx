'use client';

import {
  Home,
  FileText,
  Library,
  Settings,
  ChevronLeft,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/proposals', label: 'Proposals', icon: FileText },
  { href: '/library', label: 'Knowledge Library', icon: Library },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const {
    sidebarOpen,
    sidebarCollapsed,
    toggleSidebar,
    setSidebarCollapsed,
    isMobile,
  } = useUIStore();

  // Auto-collapse on mobile when route changes
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      toggleSidebar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!sidebarOpen && isMobile) return null;

  return (
    <>
      {/* Overlay for mobile */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full border-r border-border bg-background transition-all duration-300 md:sticky md:top-16 md:h-[calc(100vh-4rem)]',
          isMobile
            ? 'w-64'
            : sidebarCollapsed
              ? 'w-16'
              : 'w-64',
          isMobile && !sidebarOpen && 'hidden',
        )}
        role="complementary"
        aria-label="Sidebar navigation"
      >
        <div className="flex h-full flex-col">
          {/* Sidebar header */}
          <div className="flex h-16 items-center justify-between border-b border-border px-4 md:h-auto md:py-4">
            {!sidebarCollapsed && (
              <h2 className="text-lg font-semibold text-foreground">Menu</h2>
            )}

            {/* Mobile close button */}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                aria-label="Close sidebar"
                className="md:hidden"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            )}

            {/* Desktop collapse button */}
            {!isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="hidden md:flex"
              >
                <ChevronLeft
                  className={cn(
                    'h-5 w-5 transition-transform',
                    sidebarCollapsed && 'rotate-180',
                  )}
                  aria-hidden="true"
                />
              </Button>
            )}
          </div>

          {/* Navigation links */}
          <nav className="flex-1 overflow-y-auto px-2 py-4" aria-label="Main navigation">
            <ul className="space-y-1" role="list">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        isActive
                          ? 'bg-sentinel-100 text-sentinel-900 dark:bg-sentinel-900 dark:text-sentinel-100'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        sidebarCollapsed && 'justify-center',
                      )}
                      aria-current={isActive ? 'page' : undefined}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
}
