/**
 * ChecklistDetailCompact Component Tests
 *
 * Tests for the Compact Cards variant of the checklist detail view.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ChecklistDetailCompact } from './ChecklistDetailCompact';
import type { ChecklistInstanceDto } from '../../services/checklistService';

// Mock the usePermissions hook
vi.mock('../../../../shared/hooks/usePermissions', () => ({
  usePermissions: () => ({
    canInteractWithItems: true,
    isReadonly: false,
  }),
}));

// Helper to create a mock checklist
const createMockChecklist = (overrides?: Partial<ChecklistInstanceDto>): ChecklistInstanceDto => ({
  id: 'checklist-1',
  name: 'Test Checklist',
  eventId: 'event-1',
  eventName: 'Test Event',
  operationalPeriodId: 'op-1',
  operationalPeriodName: 'Op Period 1',
  templateId: 'template-1',
  totalItems: 10,
  completedItems: 5,
  progressPercentage: 50,
  requiredItems: 3,
  requiredItemsCompleted: 1,
  isArchived: false,
  createdAt: '2024-01-01T00:00:00Z',
  createdBy: 'test@example.com',
  createdByPosition: 'Safety Officer',
  items: [
    {
      id: 'item-1',
      checklistInstanceId: 'checklist-1',
      templateItemId: 'template-item-1',
      itemText: 'First item',
      itemType: 'checkbox',
      isRequired: true,
      isCompleted: false,
      displayOrder: 0,
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'item-2',
      checklistInstanceId: 'checklist-1',
      templateItemId: 'template-item-2',
      itemText: 'Second item',
      itemType: 'checkbox',
      isRequired: false,
      isCompleted: true,
      completedBy: 'user@example.com',
      completedByPosition: 'Safety Officer',
      completedAt: '2024-01-02T00:00:00Z',
      displayOrder: 1,
      createdAt: '2024-01-01T00:00:00Z',
    },
  ],
  ...overrides,
});

// Wrapper component with Router
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('ChecklistDetailCompact', () => {
  const defaultProps = {
    checklist: createMockChecklist(),
    onToggleComplete: vi.fn(),
    onStatusChange: vi.fn(),
    onSaveNotes: vi.fn(),
    onCopy: vi.fn(),
    isProcessing: () => false,
  };

  describe('header rendering', () => {
    it('renders checklist name', () => {
      renderWithRouter(<ChecklistDetailCompact {...defaultProps} />);
      expect(screen.getByText('Test Checklist')).toBeInTheDocument();
    });

    it('renders event name', () => {
      renderWithRouter(<ChecklistDetailCompact {...defaultProps} />);
      expect(screen.getByText(/Test Event/)).toBeInTheDocument();
    });
  });

  describe('progress bar', () => {
    it('renders progress percentage', () => {
      renderWithRouter(<ChecklistDetailCompact {...defaultProps} />);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('renders item count', () => {
      renderWithRouter(<ChecklistDetailCompact {...defaultProps} />);
      // Using showCount prop format: "X / Y items"
      expect(screen.getByText('5 / 10 items')).toBeInTheDocument();
    });
  });

  describe('items list', () => {
    it('renders all checklist items', () => {
      renderWithRouter(<ChecklistDetailCompact {...defaultProps} />);

      expect(screen.getByText('First item')).toBeInTheDocument();
      expect(screen.getByText('Second item')).toBeInTheDocument();
    });

    it('shows empty state when no items', () => {
      const checklist = createMockChecklist({ items: [] });
      renderWithRouter(<ChecklistDetailCompact {...defaultProps} checklist={checklist} />);

      expect(screen.getByText('No items')).toBeInTheDocument();
    });
  });
});

describe('ChecklistDetailCompact - Sticky Progress Bar', () => {
  const defaultProps = {
    checklist: createMockChecklist(),
    onToggleComplete: vi.fn(),
    onStatusChange: vi.fn(),
    onSaveNotes: vi.fn(),
    onCopy: vi.fn(),
    isProcessing: () => false,
  };

  it('progress bar container should be sticky to remain visible while scrolling', () => {
    renderWithRouter(<ChecklistDetailCompact {...defaultProps} />);

    // Find the progress bar container by test id
    const progressContainer = screen.getByTestId('progress-bar-container');

    // The progress bar should have sticky positioning
    expect(progressContainer).toHaveStyle({
      position: 'sticky',
      top: '0px',
    });
  });

  it('sticky progress bar should have z-index to stay above scrolling items', () => {
    renderWithRouter(<ChecklistDetailCompact {...defaultProps} />);

    const progressContainer = screen.getByTestId('progress-bar-container');

    expect(progressContainer).toHaveStyle({
      zIndex: '10',
    });
  });

  it('sticky progress bar should have background to prevent content showing through', () => {
    renderWithRouter(<ChecklistDetailCompact {...defaultProps} />);

    const progressContainer = screen.getByTestId('progress-bar-container');

    const styles = window.getComputedStyle(progressContainer);
    expect(styles.backgroundColor).not.toBe('transparent');
    expect(styles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });
});
