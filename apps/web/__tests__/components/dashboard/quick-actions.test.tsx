import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { useRouter } from 'next/navigation';
import React from 'react';

import { QuickActions } from '@/components/dashboard/quick-actions';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('QuickActions', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    // Reset mock before each test
    mockPush.mockClear();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  describe('Rendering', () => {
    it('renders the Create Proposal button', () => {
      render(<QuickActions />);
      expect(screen.getByText('Create Proposal')).toBeInTheDocument();
    });

    it('renders the Quick Actions dropdown button', () => {
      render(<QuickActions />);
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });

    it('renders Create Proposal button with Plus icon', () => {
      const { container } = render(<QuickActions />);
      const button = screen.getByText('Create Proposal').closest('button');
      const svg = button?.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Navigation - Create Proposal Button', () => {
    it('navigates to /proposals/new when Create Proposal button is clicked', () => {
      render(<QuickActions />);
      const createButton = screen.getByText('Create Proposal');
      fireEvent.click(createButton);
      expect(mockPush).toHaveBeenCalledWith('/proposals/new');
    });
  });

  describe('Dropdown Menu', () => {
    it('opens dropdown menu when Quick Actions button is clicked', async () => {
      const user = userEvent.setup();
      render(<QuickActions />);
      const dropdownButton = screen.getByText('Quick Actions');
      await user.click(dropdownButton);

      await waitFor(
        () => {
          expect(screen.getByText('Upload RFP')).toBeInTheDocument();
          expect(screen.getByText('View Library')).toBeInTheDocument();
          expect(screen.getByText('Settings')).toBeInTheDocument();
        },
        { timeout: 2000 },
      );
    });

    it('navigates to /rfps/upload when Upload RFP is clicked', async () => {
      const user = userEvent.setup();
      render(<QuickActions />);
      const dropdownButton = screen.getByText('Quick Actions');
      await user.click(dropdownButton);

      await waitFor(
        async () => {
          const uploadOption = screen.getByText('Upload RFP');
          await user.click(uploadOption);
          expect(mockPush).toHaveBeenCalledWith('/rfps/upload');
        },
        { timeout: 2000 },
      );
    });

    it('navigates to /knowledge when View Library is clicked', async () => {
      const user = userEvent.setup();
      render(<QuickActions />);
      const dropdownButton = screen.getByText('Quick Actions');
      await user.click(dropdownButton);

      await waitFor(
        async () => {
          const libraryOption = screen.getByText('View Library');
          await user.click(libraryOption);
          expect(mockPush).toHaveBeenCalledWith('/knowledge');
        },
        { timeout: 2000 },
      );
    });

    it('navigates to /settings when Settings is clicked', async () => {
      const user = userEvent.setup();
      render(<QuickActions />);
      const dropdownButton = screen.getByText('Quick Actions');
      await user.click(dropdownButton);

      await waitFor(
        async () => {
          const settingsOption = screen.getByText('Settings');
          await user.click(settingsOption);
          expect(mockPush).toHaveBeenCalledWith('/settings');
        },
        { timeout: 2000 },
      );
    });

    it('renders dropdown menu items with icons', async () => {
      const user = userEvent.setup();
      const { container } = render(<QuickActions />);
      const dropdownButton = screen.getByText('Quick Actions');
      await user.click(dropdownButton);

      await waitFor(
        () => {
          const uploadOption = screen.getByText('Upload RFP').closest('[role="menuitem"]');
          const libraryOption = screen.getByText('View Library').closest('[role="menuitem"]');
          const settingsOption = screen.getByText('Settings').closest('[role="menuitem"]');

          expect(uploadOption?.querySelector('svg')).toBeInTheDocument();
          expect(libraryOption?.querySelector('svg')).toBeInTheDocument();
          expect(settingsOption?.querySelector('svg')).toBeInTheDocument();
        },
        { timeout: 2000 },
      );
    });
  });

  describe('Responsive Layout', () => {
    it('applies flex-col class for mobile layout', () => {
      const { container } = render(<QuickActions />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex-col');
    });

    it('applies sm:flex-row class for desktop layout', () => {
      const { container } = render(<QuickActions />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('sm:flex-row');
    });

    it('applies gap-2 spacing between elements', () => {
      const { container } = render(<QuickActions />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('gap-2');
    });
  });

  describe('Button Variants', () => {
    it('renders Create Proposal as primary button (default variant)', () => {
      render(<QuickActions />);
      const createButton = screen.getByText('Create Proposal').closest('button');
      // Primary buttons don't have variant class, outline buttons do
      expect(createButton).not.toHaveClass('border');
    });

    it('renders Quick Actions as outline button', () => {
      render(<QuickActions />);
      const dropdownButton = screen.getByText('Quick Actions').closest('button');
      expect(dropdownButton).toHaveClass('border');
    });

    it('renders both buttons with lg size', () => {
      render(<QuickActions />);
      const createButton = screen.getByText('Create Proposal').closest('button');
      const dropdownButton = screen.getByText('Quick Actions').closest('button');

      // Both should have large button classes
      expect(createButton).toHaveClass('h-11');
      expect(dropdownButton).toHaveClass('h-11');
    });
  });

  describe('Accessibility', () => {
    it('has accessible button elements', () => {
      render(<QuickActions />);
      const createButton = screen.getByRole('button', { name: /create proposal/i });
      const dropdownButton = screen.getByRole('button', { name: /quick actions/i });

      expect(createButton).toBeInTheDocument();
      expect(dropdownButton).toBeInTheDocument();
    });

    it('dropdown menu items have menuitem role', async () => {
      const user = userEvent.setup();
      render(<QuickActions />);
      const dropdownButton = screen.getByText('Quick Actions');
      await user.click(dropdownButton);

      await waitFor(
        () => {
          const menuItems = screen.getAllByRole('menuitem');
          expect(menuItems).toHaveLength(3);
        },
        { timeout: 2000 },
      );
    });
  });

  describe('Integration', () => {
    it('maintains state across multiple interactions', async () => {
      const user = userEvent.setup();
      render(<QuickActions />);

      // Click Create Proposal
      const createButton = screen.getByText('Create Proposal');
      await user.click(createButton);
      expect(mockPush).toHaveBeenCalledWith('/proposals/new');

      // Open dropdown
      const dropdownButton = screen.getByText('Quick Actions');
      await user.click(dropdownButton);

      // Click Upload RFP
      await waitFor(
        async () => {
          const uploadOption = screen.getByText('Upload RFP');
          await user.click(uploadOption);
          expect(mockPush).toHaveBeenCalledWith('/rfps/upload');
        },
        { timeout: 2000 },
      );

      expect(mockPush).toHaveBeenCalledTimes(2);
    });

    it('does not throw errors when rapidly clicking buttons', async () => {
      const user = userEvent.setup();
      render(<QuickActions />);
      const createButton = screen.getByText('Create Proposal');

      // Rapidly click
      await user.click(createButton);
      await user.click(createButton);
      await user.click(createButton);

      expect(mockPush).toHaveBeenCalledTimes(3);
      expect(mockPush).toHaveBeenCalledWith('/proposals/new');
    });
  });
});
