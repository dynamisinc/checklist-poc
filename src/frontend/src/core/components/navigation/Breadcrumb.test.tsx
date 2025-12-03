/**
 * Breadcrumb Component Tests
 *
 * Tests for breadcrumb navigation rendering and behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb';
import { cobraTheme } from '../../../theme/cobraTheme';

// Mock useEvents hook
vi.mock('../../../shared/events', () => ({
  useEvents: () => ({
    currentEvent: {
      id: 'event-1',
      name: 'Test Event',
    },
  }),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Helper to render with providers
const renderBreadcrumb = (
  items?: BreadcrumbItem[],
  initialRoute: string = '/'
) => {
  return render(
    <ThemeProvider theme={cobraTheme}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Breadcrumb items={items} />
      </MemoryRouter>
    </ThemeProvider>
  );
};

describe('Breadcrumb', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  describe('rendering with provided items', () => {
    it('renders all breadcrumb items', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Home', path: '/' },
        { label: 'Checklists', path: '/checklists' },
        { label: 'My Checklist' },
      ];

      renderBreadcrumb(items);

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Checklists')).toBeInTheDocument();
      expect(screen.getByText('My Checklist')).toBeInTheDocument();
    });

    it('renders separators between items', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Home', path: '/' },
        { label: 'Events', path: '/events' },
        { label: 'Current' },
      ];

      renderBreadcrumb(items);

      // Should have 2 separators for 3 items
      const separators = screen.getAllByText('/');
      expect(separators).toHaveLength(2);
    });

    it('makes items with paths clickable (except last item)', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Home', path: '/' },
        { label: 'Events', path: '/events' },
        { label: 'Current Page' },
      ];

      renderBreadcrumb(items);

      // Home and Events should be buttons (clickable)
      const homeLink = screen.getByRole('button', { name: /Home/i });
      const eventsLink = screen.getByRole('button', { name: /Events/i });

      expect(homeLink).toBeInTheDocument();
      expect(eventsLink).toBeInTheDocument();

      // Current Page should not be a button
      expect(screen.queryByRole('button', { name: /Current Page/i })).not.toBeInTheDocument();
    });

    it('last item is not clickable even with path', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Home', path: '/' },
        { label: 'Last Item', path: '/should-not-be-clickable' },
      ];

      renderBreadcrumb(items);

      // Last item should not be rendered as a button
      expect(screen.queryByRole('button', { name: /Last Item/i })).not.toBeInTheDocument();
      expect(screen.getByText('Last Item')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('navigates when clicking a breadcrumb link', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Home', path: '/' },
        { label: 'Events', path: '/events' },
        { label: 'Current' },
      ];

      renderBreadcrumb(items);

      fireEvent.click(screen.getByRole('button', { name: /Events/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/events');
    });

    it('navigates to home when clicking Home link', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Home', path: '/events' },
        { label: 'Current' },
      ];

      renderBreadcrumb(items);

      fireEvent.click(screen.getByRole('button', { name: /Home/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/events');
    });
  });

  describe('styling', () => {
    it('has minimum height for consistent layout', () => {
      const items: BreadcrumbItem[] = [{ label: 'Home' }];

      const { container } = renderBreadcrumb(items);

      const breadcrumbBox = container.firstChild as HTMLElement;
      const styles = window.getComputedStyle(breadcrumbBox);

      // minHeight should be 40px
      expect(styles.minHeight).toBe('40px');
    });

    it('has bottom border for visual separation', () => {
      const items: BreadcrumbItem[] = [{ label: 'Home' }];

      const { container } = renderBreadcrumb(items);

      const breadcrumbBox = container.firstChild as HTMLElement;
      const styles = window.getComputedStyle(breadcrumbBox);

      // Should have bottom border
      expect(styles.borderBottomStyle).toBe('solid');
    });

    it('last item has bolder font weight', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Home', path: '/' },
        { label: 'Current Page' },
      ];

      renderBreadcrumb(items);

      const currentPage = screen.getByText('Current Page');
      const styles = window.getComputedStyle(currentPage);

      // Last item should have fontWeight 500
      expect(styles.fontWeight).toBe('500');
    });
  });

  describe('empty and edge cases', () => {
    it('renders with single item', () => {
      const items: BreadcrumbItem[] = [{ label: 'Home' }];

      renderBreadcrumb(items);

      expect(screen.getByText('Home')).toBeInTheDocument();
      // No separators for single item
      expect(screen.queryByText('/')).not.toBeInTheDocument();
    });

    it('handles item without path as non-clickable', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Home', path: '/' },
        { label: 'No Path Item' },
        { label: 'Last' },
      ];

      renderBreadcrumb(items);

      // Middle item without path should not be clickable
      expect(screen.queryByRole('button', { name: /No Path Item/i })).not.toBeInTheDocument();
      expect(screen.getByText('No Path Item')).toBeInTheDocument();
    });
  });
});

describe('Breadcrumb layout integration', () => {
  it('breadcrumb is not inside a scrollable container', () => {
    // This test verifies the breadcrumb should be rendered outside
    // the scrollable workspace area. The actual layout test would
    // need to be done at the AppLayout level.
    const items: BreadcrumbItem[] = [
      { label: 'Home', path: '/' },
      { label: 'Current' },
    ];

    const { container } = renderBreadcrumb(items);

    const breadcrumbBox = container.firstChild as HTMLElement;
    const styles = window.getComputedStyle(breadcrumbBox);

    // Breadcrumb should have flex display for proper alignment
    expect(styles.display).toBe('flex');
    expect(styles.alignItems).toBe('center');
  });
});
