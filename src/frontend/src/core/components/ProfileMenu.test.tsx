/**
 * ProfileMenu Component Tests
 *
 * Tests for user profile menu functionality including:
 * - Avatar rendering and initials
 * - Menu open/close behavior
 * - Role selection
 * - Account switching dialog
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { ProfileMenu } from './ProfileMenu';
import { cobraTheme } from '../../theme/cobraTheme';
import { PermissionRole } from '../../types';

// Mock usePositions
vi.mock('../../shared/positions', () => ({
  usePositions: () => ({
    positionNames: ['Safety Officer', 'Logistics Chief', 'Operations Chief'],
    loading: false,
  }),
}));

// Mock useSysAdmin
vi.mock('../../admin/contexts/SysAdminContext', () => ({
  useSysAdmin: () => ({
    isSysAdmin: false,
  }),
}));

// Mock experiment config
vi.mock('../../tools/checklist/experiments', () => ({
  checklistVariants: [{ id: 'classic', name: 'Classic', description: 'Classic view' }],
  landingPageVariants: [{ id: 'control', name: 'Control', description: 'Control view' }],
  getCurrentVariant: () => 'classic',
  setVariant: vi.fn(),
  getCurrentLandingVariant: () => 'control',
  setLandingVariant: vi.fn(),
}));

// Mock api service
vi.mock('../services/api', () => ({
  setMockUser: vi.fn(),
  getCurrentUser: () => ({
    email: 'admin@cobra.mil',
    fullName: 'Admin User',
    position: 'Safety Officer',
    positions: ['Safety Officer'],
  }),
}));

// Helper to render with providers
const renderProfileMenu = (onProfileChange = vi.fn()) => {
  return render(
    <ThemeProvider theme={cobraTheme}>
      <MemoryRouter>
        <ProfileMenu onProfileChange={onProfileChange} />
      </MemoryRouter>
    </ThemeProvider>
  );
};

describe('ProfileMenu', () => {
  const mockLocalStorage: Record<string, string> = {};

  beforeEach(() => {
    // Clear and mock localStorage
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

  describe('initial rendering', () => {
    it('renders profile menu button with avatar', () => {
      renderProfileMenu();

      // Button should exist and contain an avatar
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();

      // Should show position text
      expect(screen.getByText('Safety Officer')).toBeInTheDocument();
    });

    it('shows default user initials when no profile saved', () => {
      renderProfileMenu();

      // Default user is "Admin User" -> "AU"
      expect(screen.getByText('AU')).toBeInTheDocument();
    });
  });

  describe('menu interactions', () => {
    it('opens dropdown menu when clicking the button', async () => {
      renderProfileMenu();

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        // Menu should be open - look for content that appears in the menu
        expect(screen.getByText('Profile Settings (POC) - For demo purposes only')).toBeInTheDocument();
      });
    });

    it('shows current user info in dropdown', async () => {
      renderProfileMenu();

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
        expect(screen.getByText('admin@cobra.mil')).toBeInTheDocument();
      });
    });
  });

  describe('role selection', () => {
    it('shows permission role section', async () => {
      renderProfileMenu();

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Permission Role')).toBeInTheDocument();
      });
    });

    it('displays role options', async () => {
      renderProfileMenu();

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        // Find radio buttons for roles
        const radios = screen.getAllByRole('radio');
        expect(radios.length).toBeGreaterThan(0);
      });
    });
  });

  describe('switch account dialog', () => {
    it('shows switch account button when menu is open', async () => {
      renderProfileMenu();

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        // Find the switch account button by title
        const switchButton = screen.getByTitle('Switch Account');
        expect(switchButton).toBeInTheDocument();
      });
    });
  });

  describe('position selection', () => {
    it('shows position section label', async () => {
      renderProfileMenu();

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Position(s)')).toBeInTheDocument();
      });
    });
  });
});
