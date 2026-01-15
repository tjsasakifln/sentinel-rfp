import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface UIState {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Mobile
  isMobile: boolean;
  setIsMobile: (mobile: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Theme state
      theme: 'system',
      setTheme: (theme) => set({ theme }),

      // Sidebar state
      sidebarOpen: true,
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // Mobile state
      isMobile: false,
      setIsMobile: (mobile) => set({ isMobile: mobile }),
    }),
    {
      name: 'sentinel-ui-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist theme and sidebar preferences, not runtime state like isMobile
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);
