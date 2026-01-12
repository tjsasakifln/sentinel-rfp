import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '@/components/layout/header';
import { useUIStore } from '@/stores/ui-store';

// Mock Next.js Link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('Header', () => {
  beforeEach(() => {
    // Reset Zustand store before each test
    useUIStore.setState({
      isMobile: false,
      sidebarOpen: true,
      sidebarCollapsed: false,
      theme: 'system',
    });
  });

  it('renders logo and brand name', () => {
    render(<Header />);

    expect(screen.getByLabelText('Sentinel RFP Home')).toBeInTheDocument();
    expect(screen.getByText('Sentinel')).toBeInTheDocument();
    expect(screen.getByText('RFP')).toBeInTheDocument();
  });

  it('renders user menu button', () => {
    render(<Header />);

    expect(screen.getByLabelText('User account')).toBeInTheDocument();
  });

  it('shows hamburger menu on mobile', () => {
    useUIStore.setState({ isMobile: true });
    render(<Header />);

    expect(screen.getByLabelText('Toggle navigation menu')).toBeInTheDocument();
  });

  it('hides hamburger menu on desktop', () => {
    useUIStore.setState({ isMobile: false });
    render(<Header />);

    expect(screen.queryByLabelText('Toggle navigation menu')).not.toBeInTheDocument();
  });

  it('toggles sidebar when hamburger is clicked', async () => {
    useUIStore.setState({ isMobile: true });
    const user = userEvent.setup();
    render(<Header />);

    const hamburger = screen.getByLabelText('Toggle navigation menu');
    await user.click(hamburger);

    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });

  it('has proper ARIA attributes', () => {
    render(<Header />);

    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();

    const logo = screen.getByLabelText('Sentinel RFP Home');
    expect(logo).toHaveAttribute('href', '/');
  });

  it('has keyboard accessible elements', () => {
    render(<Header />);

    const logo = screen.getByLabelText('Sentinel RFP Home');
    const userButton = screen.getByLabelText('User account');

    expect(logo).toHaveAttribute('href');
    expect(userButton).toBeVisible();
  });
});
