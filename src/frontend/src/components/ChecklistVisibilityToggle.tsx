/**
 * ChecklistVisibilityToggle - Toggle between "My Checklists" and "All Checklists" views
 *
 * Only visible to users with Manage role.
 * Allows oversight users to quickly switch between:
 * - "My Checklists" - Position-filtered view (default)
 * - "All Checklists" - See all checklists in the event
 *
 * Uses a segmented button design for stable width (i18n friendly)
 * State is persisted to localStorage and shared across all pages/variants
 */

import React from 'react';
import { Box, ToggleButtonGroup, ToggleButton, Tooltip } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faUsers } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '@mui/material/styles';
import { usePermissions } from '../hooks/usePermissions';

const STORAGE_KEY = 'checklistVisibilityShowAll';

/**
 * Get persisted visibility preference from localStorage
 */
export const getStoredVisibilityPreference = (): boolean => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  } catch {
    return false;
  }
};

/**
 * Set visibility preference in localStorage and dispatch event for cross-component sync
 */
export const setStoredVisibilityPreference = (showAll: boolean): void => {
  try {
    localStorage.setItem(STORAGE_KEY, String(showAll));
    // Dispatch event for other components to sync
    window.dispatchEvent(new CustomEvent('visibilityPreferenceChanged', { detail: showAll }));
  } catch {
    // Ignore storage errors
  }
};

interface ChecklistVisibilityToggleProps {
  /** Current toggle state - true = show all, false = show my checklists */
  showAll: boolean;
  /** Callback when toggle changes */
  onChange: (showAll: boolean) => void;
  /** Optional loading state */
  disabled?: boolean;
}

/**
 * Visibility toggle for Manage role users
 *
 * Features:
 * - Only renders for Manage role users
 * - Segmented button design (stable width for i18n)
 * - Icon-based with tooltip labels
 * - Clear visual indication of current state
 * - Persists preference to localStorage
 */
export const ChecklistVisibilityToggle: React.FC<ChecklistVisibilityToggleProps> = ({
  showAll,
  onChange,
  disabled = false,
}) => {
  const { isManage } = usePermissions();
  const theme = useTheme();

  // Only show for Manage role users
  if (!isManage) {
    return null;
  }

  const handleChange = (_: React.MouseEvent<HTMLElement>, newValue: string | null) => {
    if (newValue !== null) {
      const newShowAll = newValue === 'all';
      setStoredVisibilityPreference(newShowAll);
      onChange(newShowAll);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <ToggleButtonGroup
        value={showAll ? 'all' : 'mine'}
        exclusive
        onChange={handleChange}
        size="small"
        disabled={disabled}
        sx={{
          '& .MuiToggleButton-root': {
            px: 1.5,
            py: 0.5,
            border: `1px solid ${theme.palette.divider}`,
            '&.Mui-selected': {
              backgroundColor: theme.palette.buttonPrimary.main,
              color: theme.palette.buttonPrimary.contrastText,
              '&:hover': {
                backgroundColor: theme.palette.buttonPrimary.dark,
              },
            },
          },
        }}
      >
        <ToggleButton value="mine" aria-label="My checklists">
          <Tooltip title="My Checklists (position-filtered)" placement="bottom">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <FontAwesomeIcon icon={faUser} style={{ fontSize: '0.875rem' }} />
              <span style={{ fontSize: '0.8125rem' }}>Mine</span>
            </Box>
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="all" aria-label="All checklists">
          <Tooltip title="All Checklists (oversight mode)" placement="bottom">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <FontAwesomeIcon icon={faUsers} style={{ fontSize: '0.875rem' }} />
              <span style={{ fontSize: '0.8125rem' }}>All</span>
            </Box>
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};
