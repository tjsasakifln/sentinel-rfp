import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FileText } from 'lucide-react';

import { MetricCard } from '@/components/dashboard/metric-card';

describe('MetricCard', () => {
  it('renders metric card with title and value', () => {
    render(<MetricCard title="Total Proposals" value={42} />);

    expect(screen.getByText('Total Proposals')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders metric card with icon', () => {
    const { container } = render(
      <MetricCard title="Total Proposals" value={42} icon={FileText} />
    );

    // Check if lucide icon is rendered (svg element)
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders metric card with description', () => {
    render(
      <MetricCard
        title="Total Proposals"
        value={42}
        description="Active proposals in your organization"
      />
    );

    expect(screen.getByText('Active proposals in your organization')).toBeInTheDocument();
  });

  it('renders metric card with string value', () => {
    render(<MetricCard title="Status" value="Active" />);

    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders metric card with custom className', () => {
    const { container } = render(
      <MetricCard
        title="Total Proposals"
        value={42}
        className="custom-class"
      />
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('custom-class');
  });

  it('renders all metric elements together', () => {
    render(
      <MetricCard
        title="Due Soon"
        value={5}
        icon={FileText}
        description="Due within 7 days"
        className="border-orange-500"
      />
    );

    expect(screen.getByText('Due Soon')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Due within 7 days')).toBeInTheDocument();
  });
});
