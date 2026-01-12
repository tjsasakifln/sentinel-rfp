import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { Layout } from '@/components/layout/layout';
import { useUIStore } from '@/stores/ui-store';

// Mock Next.js modules
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('Layout', () => {
  let resizeCallback: ((event: Event) => void) | null = null;

  beforeEach(() => {
    // Reset Zustand store
    useUIStore.setState({
      isMobile: false,
      sidebarOpen: true,
      sidebarCollapsed: false,
      theme: 'system',
    });

    // Mock window.addEventListener to capture resize handler
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = jest.fn((event: string, callback: any) => {
      if (event === 'resize') {
        resizeCallback = callback;
      }
      return originalAddEventListener.call(window, event, callback);
    }) as any;
  });

  afterEach(() => {
    resizeCallback = null;
    jest.restoreAllMocks();
  });

  it('renders main content', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>,
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('has proper semantic HTML structure', () => {
    render(
      <Layout>
        <div>Content</div>
      </Layout>,
    );

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('id', 'main-content');
  });

  it('detects mobile viewport on mount', async () => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    render(
      <Layout>
        <div>Content</div>
      </Layout>,
    );

    await waitFor(() => {
      expect(useUIStore.getState().isMobile).toBe(true);
    });
  });

  it('detects desktop viewport on mount', async () => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    render(
      <Layout>
        <div>Content</div>
      </Layout>,
    );

    await waitFor(() => {
      expect(useUIStore.getState().isMobile).toBe(false);
    });
  });

  it('updates mobile state on window resize', async () => {
    // Start with desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    render(
      <Layout>
        <div>Content</div>
      </Layout>,
    );

    await waitFor(() => {
      expect(useUIStore.getState().isMobile).toBe(false);
    });

    // Resize to mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    if (resizeCallback) {
      resizeCallback(new Event('resize'));
    }

    await waitFor(() => {
      expect(useUIStore.getState().isMobile).toBe(true);
    });
  });

  it('cleans up resize listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = render(
      <Layout>
        <div>Content</div>
      </Layout>,
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
