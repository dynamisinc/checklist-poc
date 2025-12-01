/**
 * SysAdmin Login Dialog
 *
 * Modal dialog for system administrator authentication.
 * Used to access customer-level configuration like feature flags.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  Box,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldHalved,
  faEye,
  faEyeSlash,
  faLock,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '@mui/material/styles';
import {
  CobraTextField,
  CobraPrimaryButton,
  CobraLinkButton,
} from '../../theme/styledComponents';
import CobraStyles from '../../theme/CobraStyles';
import { useSysAdmin } from '../../contexts/SysAdminContext';

interface SysAdminLoginDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SysAdminLoginDialog: React.FC<SysAdminLoginDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const theme = useTheme();
  const { login } = useSysAdmin();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const success = await login(username, password);
      if (success) {
        setUsername('');
        setPassword('');
        onSuccess?.();
        onClose();
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setUsername('');
    setPassword('');
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          pb: 2,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1,
            backgroundColor: theme.palette.warning.light,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FontAwesomeIcon
            icon={faShieldHalved}
            style={{ color: theme.palette.warning.dark }}
          />
        </Box>
        <Box>
          <Typography variant="h6" component="span">
            System Administrator Login
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Access customer-level configuration
          </Typography>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={CobraStyles.Spacing.FormFields}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <CobraTextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              required
              autoFocus
              autoComplete="username"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FontAwesomeIcon
                      icon={faUser}
                      style={{ color: theme.palette.text.secondary }}
                    />
                  </InputAdornment>
                ),
              }}
            />

            <CobraTextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              autoComplete="current-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FontAwesomeIcon
                      icon={faLock}
                      style={{ color: theme.palette.text.secondary }}
                    />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      <FontAwesomeIcon
                        icon={showPassword ? faEyeSlash : faEye}
                        style={{ fontSize: '0.875rem' }}
                      />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              System administrator access is required for customer-level
              configuration such as feature flags and system settings.
            </Typography>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <CobraLinkButton onClick={handleClose} disabled={isLoading}>
            Cancel
          </CobraLinkButton>
          <CobraPrimaryButton
            type="submit"
            disabled={isLoading || !username || !password}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </CobraPrimaryButton>
        </DialogActions>
      </form>
    </Dialog>
  );
};
