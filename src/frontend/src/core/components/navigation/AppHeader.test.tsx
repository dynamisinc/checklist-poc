/**
 * AppHeader Component Tests
 *
 * Tests for the top navigation bar including:
 * - Logo/branding display
 * - Mobile menu toggle
 * - Profile menu integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { AppHeader } from './AppHeader';
import { cobraTheme } from '../../../theme/cobraTheme';
import { PermissionRole } from '../../../types';
import { SysAdminProvider } from '../../../admin/contexts/SysAdminContext';

// Mock usePositions
vi.mock('../../../shared/positions', () => ({
  usePositions: () => ({
    positionNames: ['Safety Officer', 'Logistics Chief', 'Operations Chief'],
    loading: false,
  }),
}));

// Mock experiment config
vi.mock('../../../tools/checklist/experiments', () => ({
  checklistVariants: [{ id: 'classic', name: 'Classic', description: 'Classic view' }],
  landingPageVariants: [{ id: 'control', name: 'Control', description: 'Control view' }],
  getCurrentVariant: () => 'classic',
  setVariant: vi.fn(),
  getCurrentLandingVariant: () => 'control',
  setLandingVariant: vi.fn(),
}));

// Mock api service
vi.mock('../../services/api', () => ({
  setMockUser: vi.fn(),
  getCurrentUser: () => ({
    email: 'admin@cobra.mil',
    fullName: 'Admin User',
    position: 'Safety Officer',
    positions: ['Safety Officer'],
  }),
}));

// Helper to render with providers
const renderAppHeader = (props = {}) => {
  const defaultProps = {
    onMobileMenuToggle: vi.fn(),
    onProfileChange: vi.fn(),
  };

  return render(
    <ThemeProvider theme={cobraTheme}>
      <MemoryRouter>
        <SysAdminProvider>
          <AppHeader {...defaultProps} {...props} />
        </SysAdminProvider>
      </MemoryRouter>
    </ThemeProvider>
  );
};

describe('AppHeader', () => {
  const mockLocalStorage: Record<string, string> = {};

  beforeEach(() => {
    Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]);

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
      return mockLocalStorage[key] || null;
    });

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      mockLocalStorage[key] = value;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders the app header', () => {
      renderAppHeader();

      const header = screen.getByTestId('app-header');
      expect(header).toBeInTheDocument();
    });

    it('displays the app title', () => {
      renderAppHeader();

      const title = screen.getByTestId('app-title');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Dynamis Reference App');
    });

    it('renders mobile menu toggle button', () => {
      renderAppHeader();

      const mobileToggle = screen.getByTestId('mobile-menu-toggle');
      expect(mobileToggle).toBeInTheDocument();
    });
  });

  describe('mobile menu', () => {
    it('calls onMobileMenuToggle when mobile menu button is clicked', () => {
      const onMobileMenuToggle = vi.fn();
      renderAppHeader({ onMobileMenuToggle });

      const mobileToggle = screen.getByTestId('mobile-menu-toggle');
      fireEvent.click(mobileToggle);

      expect(onMobileMenuToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('styling', () => {
    it('uses correct header height from theme', () => {
      renderAppHeader();

      const header = screen.getByTestId('app-header');
      const styles = window.getComputedStyle(header);

      // Header height should match theme.cssStyling.headerHeight (54px)
      expect(styles.height).toBe('54px');
    });

    it('has fixed positioning', () => {
      renderAppHeader();

      const header = screen.getByTestId('app-header');
      const styles = window.getComputedStyle(header);

      expect(styles.position).toBe('fixed');
    });

    it('uses correct z-index to stay above sidebar', () => {
      renderAppHeader();

      const header = screen.getByTestId('app-header');
      const styles = window.getComputedStyle(header);

      // Z-index should be higher than drawer
      expect(parseInt(styles.zIndex)).toBeGreaterThan(1200);
    });
  });
});
