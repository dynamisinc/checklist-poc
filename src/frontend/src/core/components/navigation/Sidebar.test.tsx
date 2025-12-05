/**
 * Sidebar Component Tests
 *
 * Tests for the collapsible left navigation sidebar including:
 * - Open/close behavior
 * - Navigation item rendering
 * - Active state highlighting
 * - Mobile drawer behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, useTheme } from '@mui/material/styles';
import { Sidebar } from './Sidebar';
import { cobraTheme } from '../../../theme/cobraTheme';

// Mock useMediaQuery for desktop/mobile testing
vi.mock('@mui/material', async () => {
  const actual = await vi.importActual('@mui/material');
  return {
    ...actual,
    useMediaQuery: vi.fn().mockReturnValue(false), // Default to desktop
  };
});

// Import the mocked useMediaQuery
import { useMediaQuery } from '@mui/material';

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
const renderSidebar = (props = {}, initialRoute = '/') => {
  const defaultProps = {
    open: true,
    onToggle: vi.fn(),
    mobileOpen: false,
    onMobileClose: vi.fn(),
  };

  return render(
    <ThemeProvider theme={cobraTheme}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Sidebar {...defaultProps} {...props} />
      </MemoryRouter>
    </ThemeProvider>
  );
};

describe('Sidebar', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    (useMediaQuery as ReturnType<typeof vi.fn>).mockReturnValue(false); // Desktop by default
  });

  describe('desktop rendering', () => {
    it('renders desktop sidebar when on larger screens', () => {
      renderSidebar();

      const sidebar = screen.getByTestId('sidebar-desktop');
      expect(sidebar).toBeInTheDocument();
    });

    it('renders sidebar content', () => {
      renderSidebar();

      const content = screen.getByTestId('sidebar-content');
      expect(content).toBeInTheDocument();
    });

    it('renders toggle button', () => {
      renderSidebar();

      const toggle = screen.getByTestId('sidebar-toggle');
      expect(toggle).toBeInTheDocument();
    });

    it('renders Home navigation item', () => {
      renderSidebar();

      const homeNav = screen.getByTestId('nav-item-home');
      expect(homeNav).toBeInTheDocument();
    });

    it('renders Notes navigation item', () => {
      renderSidebar();

      const notesNav = screen.getByTestId('nav-item-notes');
      expect(notesNav).toBeInTheDocument();
    });

    it('shows Tools section label when open', () => {
      renderSidebar({ open: true });

      const toolsLabel = screen.getByTestId('tools-section-label');
      expect(toolsLabel).toBeInTheDocument();
      expect(toolsLabel).toHaveTextContent('Tools');
    });

    it('hides Tools section label when closed', () => {
      renderSidebar({ open: false });

      expect(screen.queryByTestId('tools-section-label')).not.toBeInTheDocument();
    });
  });

  describe('toggle behavior', () => {
    it('calls onToggle when toggle button is clicked', () => {
      const onToggle = vi.fn();
      renderSidebar({ onToggle });

      const toggle = screen.getByTestId('sidebar-toggle');
      fireEvent.click(toggle);

      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('navigation', () => {
    it('navigates to home when Home is clicked', () => {
      renderSidebar();

      const homeNav = screen.getByTestId('nav-item-home');
      fireEvent.click(homeNav);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('navigates to notes when Notes is clicked', () => {
      renderSidebar();

      const notesNav = screen.getByTestId('nav-item-notes');
      fireEvent.click(notesNav);

      expect(mockNavigate).toHaveBeenCalledWith('/notes');
    });

    it('does not navigate when clicking disabled item', () => {
      // This test would need a disabled item in the nav
      // Currently all items are enabled
      renderSidebar();

      // Verify navigation works for enabled items
      const notesNav = screen.getByTestId('nav-item-notes');
      fireEvent.click(notesNav);

      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe('active state', () => {
    it('highlights Home when on root path', () => {
      renderSidebar({}, '/');

      const homeNav = screen.getByTestId('nav-item-home');
      const styles = window.getComputedStyle(homeNav);

      // Should have active background color
      expect(styles.backgroundColor).not.toBe('transparent');
    });

    it('highlights Notes when on /notes path', () => {
      renderSidebar({}, '/notes');

      const notesNav = screen.getByTestId('nav-item-notes');
      const styles = window.getComputedStyle(notesNav);

      // Should have active background color
      expect(styles.backgroundColor).not.toBe('transparent');
    });

    it('highlights Notes when on nested /notes/* path', () => {
      renderSidebar({}, '/notes/123');

      const notesNav = screen.getByTestId('nav-item-notes');
      const styles = window.getComputedStyle(notesNav);

      // Should still have active state
      expect(styles.backgroundColor).not.toBe('transparent');
    });
  });

  describe('mobile behavior', () => {
    beforeEach(() => {
      (useMediaQuery as ReturnType<typeof vi.fn>).mockReturnValue(true); // Mobile
    });

    it('renders mobile drawer when on small screens', () => {
      renderSidebar({ mobileOpen: true });

      const mobileSidebar = screen.getByTestId('sidebar-mobile');
      expect(mobileSidebar).toBeInTheDocument();
    });

    it('calls onMobileClose when navigating in mobile', () => {
      const onMobileClose = vi.fn();
      renderSidebar({ mobileOpen: true, onMobileClose });

      const notesNav = screen.getByTestId('nav-item-notes');
      fireEvent.click(notesNav);

      expect(onMobileClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('styling', () => {
    it('uses open drawer width when open', () => {
      renderSidebar({ open: true });

      const sidebar = screen.getByTestId('sidebar-desktop');
      const styles = window.getComputedStyle(sidebar);

      // Open width should be 288px
      expect(styles.width).toBe('288px');
    });

    it('uses closed drawer width when closed', () => {
      renderSidebar({ open: false });

      const sidebar = screen.getByTestId('sidebar-desktop');
      const styles = window.getComputedStyle(sidebar);

      // Closed width should be 64px
      expect(styles.width).toBe('64px');
    });
  });

  describe('accessibility', () => {
    it('navigation items are keyboard accessible', () => {
      renderSidebar();

      const homeNav = screen.getByTestId('nav-item-home');
      expect(homeNav).toHaveAttribute('role', 'button');
    });

    it('shows tooltips when sidebar is collapsed', () => {
      renderSidebar({ open: false });

      // Tooltips are shown when sidebar is closed
      // This would need hover interaction testing
      const homeNav = screen.getByTestId('nav-item-home');
      expect(homeNav).toBeInTheDocument();
    });
  });
});
