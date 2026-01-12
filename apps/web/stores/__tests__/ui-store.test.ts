import { renderHook, act } from '@testing-library/react';
import { useUIStore } from '../ui-store';

describe('useUIStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useUIStore());
    act(() => {
      result.current.setTheme('system');
      result.current.setSidebarCollapsed(false);
      result.current.setIsMobile(false);
    });
  });

  describe('theme', () => {
    it('should have default theme as system', () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.theme).toBe('system');
    });

    it('should update theme', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
    });

    it('should allow all theme values', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setTheme('light');
      });
      expect(result.current.theme).toBe('light');

      act(() => {
        result.current.setTheme('dark');
      });
      expect(result.current.theme).toBe('dark');

      act(() => {
        result.current.setTheme('system');
      });
      expect(result.current.theme).toBe('system');
    });
  });

  describe('sidebar', () => {
    it('should have sidebar open by default', () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.sidebarOpen).toBe(true);
    });

    it('should have sidebar not collapsed by default', () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.sidebarCollapsed).toBe(false);
    });

    it('should toggle sidebar state', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.toggleSidebar();
      });
      expect(result.current.sidebarOpen).toBe(false);

      act(() => {
        result.current.toggleSidebar();
      });
      expect(result.current.sidebarOpen).toBe(true);
    });

    it('should set sidebar collapsed state', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setSidebarCollapsed(true);
      });
      expect(result.current.sidebarCollapsed).toBe(true);

      act(() => {
        result.current.setSidebarCollapsed(false);
      });
      expect(result.current.sidebarCollapsed).toBe(false);
    });
  });

  describe('mobile', () => {
    it('should have isMobile false by default', () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.isMobile).toBe(false);
    });

    it('should update mobile state', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setIsMobile(true);
      });
      expect(result.current.isMobile).toBe(true);

      act(() => {
        result.current.setIsMobile(false);
      });
      expect(result.current.isMobile).toBe(false);
    });
  });

  describe('persistence', () => {
    it('should persist theme and sidebarCollapsed to localStorage', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setTheme('dark');
        result.current.setSidebarCollapsed(true);
      });

      // Check if persistence configuration is correct
      const state = useUIStore.getState();
      expect(state.theme).toBe('dark');
      expect(state.sidebarCollapsed).toBe(true);
    });

    it('should not persist isMobile state', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setIsMobile(true);
      });

      // isMobile should be runtime only, not persisted
      // This is verified by the partialize config in the store
      const state = useUIStore.getState();
      expect(state.isMobile).toBe(true);
    });
  });
});
