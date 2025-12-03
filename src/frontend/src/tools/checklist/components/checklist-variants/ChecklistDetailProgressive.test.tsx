/**
 * ChecklistDetailProgressive Component Tests
 *
 * Tests for the Progressive Disclosure variant of the checklist detail view.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ChecklistDetailProgressive } from './ChecklistDetailProgressive';
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

describe('ChecklistDetailProgressive', () => {
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
      renderWithRouter(<ChecklistDetailProgressive {...defaultProps} />);
      expect(screen.getByText('Test Checklist')).toBeInTheDocument();
    });

    it('renders event name', () => {
      renderWithRouter(<ChecklistDetailProgressive {...defaultProps} />);
      expect(screen.getByText(/Test Event/)).toBeInTheDocument();
    });

    it('renders operational period', () => {
      renderWithRouter(<ChecklistDetailProgressive {...defaultProps} />);
      expect(screen.getByText(/Op Period 1/)).toBeInTheDocument();
    });
  });

  describe('progress bar', () => {
    it('renders progress percentage', () => {
      renderWithRouter(<ChecklistDetailProgressive {...defaultProps} />);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('renders item count', () => {
      renderWithRouter(<ChecklistDetailProgressive {...defaultProps} />);
      // Using showCount prop format: "X / Y items"
      expect(screen.getByText('5 / 10 items')).toBeInTheDocument();
    });

    it('renders required items when present', () => {
      renderWithRouter(<ChecklistDetailProgressive {...defaultProps} />);
      expect(screen.getByText(/Required: 1\/3 complete/)).toBeInTheDocument();
    });
  });

  describe('items list', () => {
    it('renders all checklist items', () => {
      renderWithRouter(<ChecklistDetailProgressive {...defaultProps} />);

      expect(screen.getByText('First item')).toBeInTheDocument();
      expect(screen.getByText('Second item')).toBeInTheDocument();
    });

    it('shows empty state when no items', () => {
      const checklist = createMockChecklist({ items: [] });
      renderWithRouter(<ChecklistDetailProgressive {...defaultProps} checklist={checklist} />);

      expect(screen.getByText('No items in this checklist')).toBeInTheDocument();
    });

    it('shows instruction hint', () => {
      renderWithRouter(<ChecklistDetailProgressive {...defaultProps} />);
      expect(screen.getByText(/Tap an item to expand/)).toBeInTheDocument();
    });
  });
});

describe('ChecklistDetailProgressive - Sticky Progress Bar', () => {
  const defaultProps = {
    checklist: createMockChecklist(),
    onToggleComplete: vi.fn(),
    onStatusChange: vi.fn(),
    onSaveNotes: vi.fn(),
    onCopy: vi.fn(),
    isProcessing: () => false,
  };

  it('progress bar container should be sticky to remain visible while scrolling', () => {
    renderWithRouter(<ChecklistDetailProgressive {...defaultProps} />);

    // Find the progress bar container by test id
    const progressContainer = screen.getByTestId('progress-bar-container');

    // The progress bar should have sticky positioning
    expect(progressContainer).toHaveStyle({
      position: 'sticky',
      top: '0px',
    });
  });

  it('sticky progress bar should have z-index to stay above scrolling items', () => {
    renderWithRouter(<ChecklistDetailProgressive {...defaultProps} />);

    const progressContainer = screen.getByTestId('progress-bar-container');

    expect(progressContainer).toHaveStyle({
      zIndex: '10',
    });
  });

  it('sticky progress bar should have background to prevent content showing through', () => {
    renderWithRouter(<ChecklistDetailProgressive {...defaultProps} />);

    const progressContainer = screen.getByTestId('progress-bar-container');

    const styles = window.getComputedStyle(progressContainer);
    expect(styles.backgroundColor).not.toBe('transparent');
    expect(styles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });
});
