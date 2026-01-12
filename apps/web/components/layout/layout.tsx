'use client';

import { useEffect } from 'react';

import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';

import { Header } from './header';
import { Sidebar } from './sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { sidebarCollapsed, isMobile, setIsMobile } = useUIStore();

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    // Initial check
    checkMobile();

    // Listen for resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main
          className={cn(
            'flex-1 transition-all duration-300',
            !isMobile && sidebarCollapsed && 'md:ml-0',
          )}
          role="main"
          id="main-content"
        >
          <div className="container mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
