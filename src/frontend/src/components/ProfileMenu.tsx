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
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faPalette, faUserPen } from '@fortawesome/free-solid-svg-icons';
import { useSearchParams } from 'react-router-dom';
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
 * Get user initials from full name
 * Returns first letter of first name and first letter of last name
 */
const getInitials = (fullName: string): string => {
  const names = fullName.trim().split(/\s+/);
  if (names.length === 0 || !names[0]) return '?';
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

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
 * Get stored account info (email and name)
 */
const getStoredAccount = () => {
  try {
    const stored = localStorage.getItem('mockUserAccount');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load stored account:', error);
  }
  return {
    email: 'admin@cobra.mil',
    fullName: 'Admin User',
  };
};

/**
 * Save account info to localStorage
 */
const saveAccount = (email: string, fullName: string) => {
  try {
    localStorage.setItem('mockUserAccount', JSON.stringify({ email, fullName }));
    window.dispatchEvent(new Event('accountChanged'));
  } catch (error) {
    console.error('Failed to save account:', error);
  }
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
  const storedAccount = getStoredAccount();
  const [searchParams, setSearchParams] = useSearchParams();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPositions, setSelectedPositions] = useState<string[]>(storedProfile.positions);
  const [selectedRole, setSelectedRole] = useState<PermissionRole>(storedProfile.role);
  const [selectedVariant, setSelectedVariant] = useState<ChecklistVariant>(getCurrentVariant());
  const [selectedLandingVariant, setSelectedLandingVariant] = useState<LandingPageVariant>(getCurrentLandingVariant());

  // Account switch state
  const [accountEmail, setAccountEmail] = useState<string>(storedAccount.email);
  const [accountFullName, setAccountFullName] = useState<string>(storedAccount.fullName);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [tempEmail, setTempEmail] = useState('');
  const [tempFullName, setTempFullName] = useState('');

  const open = Boolean(anchorEl);

  // Sync variant state with storage
  useEffect(() => {
    const handleVariantChange = () => {
      setSelectedVariant(getCurrentVariant());
    };
    window.addEventListener('variantChanged', handleVariantChange);
    return () => window.removeEventListener('variantChanged', handleVariantChange);
  }, []);

  // Sync landing variant state with storage and URL changes
  useEffect(() => {
    const handleLandingVariantChange = () => {
      setSelectedLandingVariant(getCurrentLandingVariant());
    };
    window.addEventListener('landingVariantChanged', handleLandingVariantChange);
    return () => window.removeEventListener('landingVariantChanged', handleLandingVariantChange);
  }, []);

  // Re-sync when URL search params change (e.g., navigating with ?landing=control)
  useEffect(() => {
    setSelectedLandingVariant(getCurrentLandingVariant());
  }, [searchParams]);

  // Sync mock user context with stored profile and account on mount
  useEffect(() => {
    const currentMockUser = getCurrentUser();
    setMockUser({
      ...currentMockUser,
      email: storedAccount.email,
      fullName: storedAccount.fullName,
      position: storedProfile.positions.length > 0 ? storedProfile.positions[0] : currentMockUser.position,
      positions: storedProfile.positions.length > 0 ? storedProfile.positions : currentMockUser.positions,
    });
  }, []); // Only run on mount

  // Listen for account changes from other components
  useEffect(() => {
    const handleAccountChange = () => {
      const account = getStoredAccount();
      setAccountEmail(account.email);
      setAccountFullName(account.fullName);
    };
    window.addEventListener('accountChanged', handleAccountChange);
    return () => window.removeEventListener('accountChanged', handleAccountChange);
  }, []);

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
    // Clear URL param so localStorage takes precedence
    if (searchParams.has('landing')) {
      searchParams.delete('landing');
      setSearchParams(searchParams, { replace: true });
    }
  };

  // Account switch handlers
  const handleOpenAccountDialog = () => {
    setTempEmail(accountEmail);
    setTempFullName(accountFullName);
    setAccountDialogOpen(true);
  };

  const handleCloseAccountDialog = () => {
    setAccountDialogOpen(false);
    setTempEmail('');
    setTempFullName('');
  };

  const handleSaveAccount = () => {
    const newEmail = tempEmail.trim() || 'user@cobra.mil';
    const newFullName = tempFullName.trim() || newEmail.split('@')[0];

    // Update local state
    setAccountEmail(newEmail);
    setAccountFullName(newFullName);

    // Save to localStorage
    saveAccount(newEmail, newFullName);

    // Update mock user context for API requests
    const currentMockUser = getCurrentUser();
    setMockUser({
      ...currentMockUser,
      email: newEmail,
      fullName: newFullName,
    });

    console.log('[ProfileMenu] Account switched to:', { email: newEmail, fullName: newFullName });
    handleCloseAccountDialog();

    // Trigger app refresh to reflect new user
    window.dispatchEvent(new Event('profileChanged'));
  };

  // Display text
  const primaryPosition = selectedPositions[0] || 'No Position';
  const roleDisplay = selectedRole;
  const userInitials = getInitials(accountFullName);

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
        <Avatar
          sx={{
            width: 32,
            height: 32,
            fontSize: '0.875rem',
            fontWeight: 'bold',
            backgroundColor: cobraTheme.palette.secondary.main,
            color: cobraTheme.palette.secondary.contrastText,
          }}
        >
          {userInitials}
        </Avatar>
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
        {/* Header with Avatar and Account Info */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                fontSize: '1.25rem',
                fontWeight: 'bold',
                backgroundColor: cobraTheme.palette.primary.main,
                color: cobraTheme.palette.primary.contrastText,
              }}
            >
              {userInitials}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                {accountFullName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {accountEmail}
              </Typography>
            </Box>
            <Button
              size="small"
              onClick={handleOpenAccountDialog}
              sx={{ minWidth: 'auto', p: 1 }}
              title="Switch Account"
            >
              <FontAwesomeIcon icon={faUserPen} />
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Profile Settings (POC) - For demo purposes only
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
            <strong>Account:</strong> {accountFullName} ({accountEmail})
          </Typography>
          <br />
          <Typography variant="caption">
            <strong>Positions:</strong> {selectedPositions.join(', ')}
          </Typography>
          <br />
          <Typography variant="caption">
            <strong>Role:</strong> {selectedRole}
          </Typography>
        </Box>
      </Menu>

      {/* Account Switch Dialog */}
      <Dialog
        open={accountDialogOpen}
        onClose={handleCloseAccountDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Switch Account</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter an email address and optionally a name to simulate a different user.
            This is for testing SignalR notifications and checklist item attribution.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={tempEmail}
            onChange={(e) => setTempEmail(e.target.value)}
            placeholder="user@cobra.mil"
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Full Name (optional)"
            type="text"
            fullWidth
            variant="outlined"
            value={tempFullName}
            onChange={(e) => setTempFullName(e.target.value)}
            placeholder="John Doe"
            helperText="If left blank, will use email prefix as name"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAccountDialog}>Cancel</Button>
          <Button onClick={handleSaveAccount} variant="contained">
            Switch Account
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
