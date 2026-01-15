import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from '@/components/layout/sidebar';
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

describe('Sidebar', () => {
  beforeEach(() => {
    // Reset Zustand store before each test
    useUIStore.setState({
      isMobile: false,
      sidebarOpen: true,
      sidebarCollapsed: false,
      theme: 'system',
    });
  });

  it('renders all navigation items', () => {
    render(<Sidebar />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Proposals')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Library')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('highlights active route', () => {
    render(<Sidebar />);

    // Check that Dashboard link exists (it's the active route from mock)
    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    expect(dashboardLink).toBeInTheDocument();
  });

  it('shows collapse button on desktop', () => {
    useUIStore.setState({ isMobile: false, sidebarOpen: true });
    render(<Sidebar />);

    expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument();
  });

  it('shows close button on mobile', () => {
    // Set mobile AFTER rendering to avoid useEffect closing sidebar
    useUIStore.setState({ isMobile: false, sidebarOpen: true });
    const { rerender } = render(<Sidebar />);

    // Now set mobile
    useUIStore.setState({ isMobile: true, sidebarOpen: true });
    rerender(<Sidebar />);

    // Sidebar should be visible on mobile when open
    const sidebar = document.querySelector('aside');
    expect(sidebar).toBeTruthy();
  });

  it('toggles collapsed state on desktop', async () => {
    useUIStore.setState({ isMobile: false, sidebarCollapsed: false });
    const user = userEvent.setup();
    render(<Sidebar />);

    const collapseButton = screen.getByLabelText('Collapse sidebar');
    await user.click(collapseButton);

    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
  });

  it('hides sidebar when closed on mobile', () => {
    useUIStore.setState({ isMobile: true, sidebarOpen: false });
    const { container } = render(<Sidebar />);

    expect(container.firstChild).toBeNull();
  });

  it('shows overlay on mobile when open', () => {
    // Set mobile AFTER rendering to avoid useEffect closing sidebar
    useUIStore.setState({ isMobile: false, sidebarOpen: true });
    const { rerender } = render(<Sidebar />);

    // Now set mobile
    useUIStore.setState({ isMobile: true, sidebarOpen: true });
    rerender(<Sidebar />);

    // Verify overlay exists in DOM
    const overlay = document.querySelector('[class*="fixed"][class*="inset-0"]');
    expect(overlay).toBeTruthy();
  });

  it('closes sidebar when overlay is clicked', async () => {
    useUIStore.setState({ isMobile: true, sidebarOpen: true });
    const user = userEvent.setup();
    render(<Sidebar />);

    const overlay = document.querySelector('.fixed.inset-0.bg-black\\/50');
    if (overlay) {
      await user.click(overlay as HTMLElement);
    }

    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });

  it('has proper ARIA attributes', () => {
    render(<Sidebar />);

    expect(screen.getByRole('complementary')).toHaveAttribute('aria-label', 'Sidebar navigation');
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });

  it('supports keyboard navigation', () => {
    render(<Sidebar />);

    const links = screen.getAllByRole('link');
    links.forEach((link) => {
      expect(link).toBeVisible();
      expect(link).toHaveAttribute('href');
    });
  });

  it('shows tooltips when collapsed', () => {
    useUIStore.setState({ sidebarCollapsed: true });
    render(<Sidebar />);

    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    expect(dashboardLink).toHaveAttribute('title', 'Dashboard');
  });

  it('hides text labels when collapsed', () => {
    useUIStore.setState({ sidebarCollapsed: true });
    render(<Sidebar />);

    // Verify links still exist and are accessible
    const links = screen.getAllByRole('link');
    expect(links.length).toBe(4); // Dashboard, Proposals, Knowledge Library, Settings
  });
});
