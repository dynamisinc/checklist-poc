/**
 * ChecklistProgressBar Component Tests
 *
 * Tests for progress bar color logic and rendering.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChecklistProgressBar, ChecklistProgressBarCompact } from './ChecklistProgressBar';

describe('ChecklistProgressBar', () => {
  describe('rendering', () => {
    it('renders with default props', () => {
      render(<ChecklistProgressBar value={50} />);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('shows percentage by default', () => {
      render(<ChecklistProgressBar value={75} />);
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('hides percentage when showPercentage is false', () => {
      render(<ChecklistProgressBar value={50} showPercentage={false} />);
      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });

    it('shows count when showCount is true with item counts', () => {
      render(
        <ChecklistProgressBar
          value={50}
          showCount={true}
          completedItems={5}
          totalItems={10}
        />
      );
      expect(screen.getByText('5 / 10 items')).toBeInTheDocument();
    });

    it('does not show count when completedItems/totalItems are missing', () => {
      render(<ChecklistProgressBar value={50} showCount={true} />);
      expect(screen.queryByText(/items/)).not.toBeInTheDocument();
    });
  });

  describe('value clamping', () => {
    it('clamps values above 100 to 100', () => {
      render(<ChecklistProgressBar value={150} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('clamps negative values to 0', () => {
      render(<ChecklistProgressBar value={-10} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('rounds percentage to whole number', () => {
      render(<ChecklistProgressBar value={33.7} />);
      expect(screen.getByText('34%')).toBeInTheDocument();
    });
  });
});

describe('ChecklistProgressBarCompact', () => {
  it('renders percentage text', () => {
    render(<ChecklistProgressBarCompact value={65} />);
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('clamps values to 0-100 range', () => {
    render(<ChecklistProgressBarCompact value={200} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
