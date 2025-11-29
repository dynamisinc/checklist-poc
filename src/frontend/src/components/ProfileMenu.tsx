/**
 * ProfileMenu Component
 *
 * Replaces PositionSelector with enhanced profile management.
 * Allows selection of:
 * - Position(s) - ICS roles
 * - Permission Role - Access level (Readonly, Contributor, Manage)
 *
 * For POC/demo purposes only - in production, roles come from authentication.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Menu,
  Typography,
  Divider,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  Chip,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faChevronDown, faPalette } from '@fortawesome/free-solid-svg-icons';
import { ICS_POSITIONS, PermissionRole } from '../types';
import { cobraTheme } from '../theme/cobraTheme';
import {
  checklistVariants,
  type ChecklistVariant,
  getCurrentVariant,
  setVariant as setStoredVariant,
  landingPageVariants,
  type LandingPageVariant,
  getCurrentLandingVariant,
  setLandingVariant as setStoredLandingVariant,
} from '../experiments';
import { setMockUser, getCurrentUser } from '../services/api';

interface ProfileMenuProps {
  onProfileChange: (positions: string[], role: PermissionRole) => void;
}

/**
 * Get default mock user data from localStorage or use defaults
 */
const getStoredProfile = () => {
  try {
    const stored = localStorage.getItem('mockUserProfile');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load stored profile:', error);
  }

  // Default profile
  return {
    positions: ['Safety Officer'],
    role: PermissionRole.CONTRIBUTOR,
  };
};

/**
 * Save mock user profile to localStorage
 */
const saveProfile = (positions: string[], role: PermissionRole) => {
  try {
    localStorage.setItem('mockUserProfile', JSON.stringify({ positions, role }));
    // Trigger custom event for same-tab updates
    window.dispatchEvent(new Event('profileChanged'));
  } catch (error) {
    console.error('Failed to save profile:', error);
  }
};

/**
 * ProfileMenu Component
 */
export const ProfileMenu: React.FC<ProfileMenuProps> = ({ onProfileChange }) => {
  const storedProfile = getStoredProfile();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPositions, setSelectedPositions] = useState<string[]>(storedProfile.positions);
  const [selectedRole, setSelectedRole] = useState<PermissionRole>(storedProfile.role);
  const [selectedVariant, setSelectedVariant] = useState<ChecklistVariant>(getCurrentVariant());
  const [selectedLandingVariant, setSelectedLandingVariant] = useState<LandingPageVariant>(getCurrentLandingVariant());

  const open = Boolean(anchorEl);

  // Sync variant state with storage
  useEffect(() => {
    const handleVariantChange = () => {
      setSelectedVariant(getCurrentVariant());
    };
    window.addEventListener('variantChanged', handleVariantChange);
    return () => window.removeEventListener('variantChanged', handleVariantChange);
  }, []);

  // Sync landing variant state with storage
  useEffect(() => {
    const handleLandingVariantChange = () => {
      setSelectedLandingVariant(getCurrentLandingVariant());
    };
    window.addEventListener('landingVariantChanged', handleLandingVariantChange);
    return () => window.removeEventListener('landingVariantChanged', handleLandingVariantChange);
  }, []);

  // Sync mock user context with stored profile on mount
  useEffect(() => {
    const currentMockUser = getCurrentUser();
    if (storedProfile.positions.length > 0) {
      setMockUser({
        ...currentMockUser,
        position: storedProfile.positions[0],
        positions: storedProfile.positions,
      });
    }
  }, []); // Only run on mount

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handlePositionToggle = (position: string) => {
    setSelectedPositions((prev) => {
      const newPositions = prev.includes(position)
        ? prev.filter((p) => p !== position)
        : [...prev, position];

      // Ensure at least one position is selected
      if (newPositions.length === 0) {
        return prev;
      }

      // Update mock user context for API requests (include all positions)
      const currentMockUser = getCurrentUser();
      setMockUser({
        ...currentMockUser,
        position: newPositions[0],
        positions: newPositions,
      });

      // Save and notify
      saveProfile(newPositions, selectedRole);
      onProfileChange(newPositions, selectedRole);

      return newPositions;
    });
  };

  const handleRoleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRole = event.target.value as PermissionRole;
    setSelectedRole(newRole);

    // Save and notify
    saveProfile(selectedPositions, newRole);
    onProfileChange(selectedPositions, newRole);
  };

  const handleVariantChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVariant = event.target.value as ChecklistVariant;
    setSelectedVariant(newVariant);
    setStoredVariant(newVariant);
  };

  const handleLandingVariantChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVariant = event.target.value as LandingPageVariant;
    setSelectedLandingVariant(newVariant);
    setStoredLandingVariant(newVariant);
  };

  // Display text
  const primaryPosition = selectedPositions[0] || 'No Position';
  const roleDisplay = selectedRole;

  return (
    <>
      <Button
        onClick={handleClick}
        sx={{
          color: 'white',
          textTransform: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        <FontAwesomeIcon icon={faUser} />
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
            {primaryPosition}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8, lineHeight: 1.2 }}>
            {roleDisplay}
          </Typography>
        </Box>
        <FontAwesomeIcon icon={faChevronDown} size="sm" />
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            minWidth: 320,
            maxWidth: 400,
          },
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
            Profile Settings (POC)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            For demo purposes - in production, this comes from authentication
          </Typography>
        </Box>

        <Divider />

        {/* Position Selection */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            Position(s)
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Select one or more ICS positions
          </Typography>
          <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
            {ICS_POSITIONS.map((position) => (
              <FormControlLabel
                key={position}
                control={
                  <Checkbox
                    checked={selectedPositions.includes(position)}
                    onChange={() => handlePositionToggle(position)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2">
                    {position}
                    {position === primaryPosition && (
                      <Chip label="Primary" size="small" sx={{ ml: 1, height: 18, fontSize: '0.7rem' }} />
                    )}
                  </Typography>
                }
                sx={{ display: 'flex', width: '100%', mx: 0 }}
              />
            ))}
          </Box>
        </Box>

        <Divider />

        {/* Permission Role Selection */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ fontWeight: 'bold', fontSize: '0.875rem', mb: 0.5 }}>
              Permission Role
            </FormLabel>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Controls access to features
            </Typography>
            <RadioGroup value={selectedRole} onChange={handleRoleChange}>
              <FormControlLabel
                value={PermissionRole.READONLY}
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      Readonly
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      View checklists only
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value={PermissionRole.CONTRIBUTOR}
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      Contributor
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Create instances, work on items
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value={PermissionRole.MANAGE}
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      Manage
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Full admin access
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>
        </Box>

        <Divider />

        {/* UX Variant Selection */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ fontWeight: 'bold', fontSize: '0.875rem', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <FontAwesomeIcon icon={faPalette} style={{ fontSize: 14 }} />
              Checklist UX Variant
            </FormLabel>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Switch between different checklist experiences for testing
            </Typography>
            <RadioGroup value={selectedVariant} onChange={handleVariantChange}>
              {checklistVariants.map((variant) => (
                <FormControlLabel
                  key={variant.id}
                  value={variant.id}
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {variant.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {variant.description}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </RadioGroup>
          </FormControl>
        </Box>

        <Divider />

        {/* Landing Page Variant Selection */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ fontWeight: 'bold', fontSize: '0.875rem', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <FontAwesomeIcon icon={faPalette} style={{ fontSize: 14 }} />
              Landing Page Variant
            </FormLabel>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Switch between different home page layouts for testing
            </Typography>
            <RadioGroup value={selectedLandingVariant} onChange={handleLandingVariantChange}>
              {landingPageVariants.map((variant) => (
                <FormControlLabel
                  key={variant.id}
                  value={variant.id}
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {variant.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {variant.description}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </RadioGroup>
          </FormControl>
        </Box>

        <Divider />

        {/* Current Selection Summary */}
        <Box sx={{ px: 2, py: 1.5, backgroundColor: cobraTheme.palette.action.selected }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
            Current Profile:
          </Typography>
          <Typography variant="caption">
            <strong>Positions:</strong> {selectedPositions.join(', ')}
          </Typography>
          <br />
          <Typography variant="caption">
            <strong>Role:</strong> {selectedRole}
          </Typography>
        </Box>
      </Menu>
    </>
  );
};
