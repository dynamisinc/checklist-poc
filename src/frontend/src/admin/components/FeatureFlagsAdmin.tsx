/**
 * Feature Flags Admin Component
 *
 * Admin UI for managing feature flags.
 * Supports three states: Hidden, Coming Soon, Active
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Tooltip,
  CircularProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRotateLeft,
  faClipboardList,
  faComments,
  faListCheck,
  faBrain,
  faFileLines,
  faTableCells,
  faTimeline,
  faRobot,
  faEyeSlash,
  faClock,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { CobraSecondaryButton } from '../../theme/styledComponents';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import { FeatureFlags, FeatureFlagState, featureFlagInfo, featureFlagStates } from '../types/featureFlags';

// Map flag keys to icons
const flagIcons: Record<keyof FeatureFlags, IconDefinition> = {
  checklist: faClipboardList,
  chat: faComments,
  tasking: faListCheck,
  cobraKai: faBrain,
  eventSummary: faFileLines,
  statusChart: faTableCells,
  eventTimeline: faTimeline,
  cobraAi: faRobot,
};

// Map categories to display names
const categoryLabels: Record<string, string> = {
  core: 'Core Tools',
  communication: 'Communication',
  visualization: 'Visualization',
  ai: 'AI & Intelligence',
};

// State icons and colors
const stateConfig: Record<FeatureFlagState, { icon: IconDefinition; color: string; chipColor: 'success' | 'warning' | 'default' }> = {
  Active: { icon: faCheck, color: 'success.main', chipColor: 'success' },
  ComingSoon: { icon: faClock, color: 'warning.main', chipColor: 'warning' },
  Hidden: { icon: faEyeSlash, color: 'grey.500', chipColor: 'default' },
};

export const FeatureFlagsAdmin: React.FC = () => {
  const theme = useTheme();
  const { flags, loading, error, updateFlags, resetFlags } = useFeatureFlags();
  const [saving, setSaving] = useState(false);

  const handleStateChange = async (flagKey: keyof FeatureFlags, newState: FeatureFlagState | null) => {
    if (!newState) return; // Don't allow deselection
    try {
      setSaving(true);
      const newFlags = { ...flags, [flagKey]: newState };
      await updateFlags(newFlags);
    } catch (err) {
      // Error is handled by context
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setSaving(true);
      await resetFlags();
    } catch (err) {
      // Error is handled by context
    } finally {
      setSaving(false);
    }
  };

  if (loading && !flags) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Failed to load feature flags: {error}
      </Alert>
    );
  }

  // Group flags by category
  const flagsByCategory = featureFlagInfo.reduce((acc, info) => {
    if (!acc[info.category]) {
      acc[info.category] = [];
    }
    acc[info.category].push(info);
    return acc;
  }, {} as Record<string, typeof featureFlagInfo>);

  return (
    <Box>
      {/* Header with reset button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Set tool visibility: <strong>Active</strong> (fully functional), <strong>Coming Soon</strong> (visible but disabled), or <strong>Hidden</strong> (not visible).
          Changes apply to all users immediately.
        </Typography>
        <Tooltip title="Reset all flags to appsettings.json defaults">
          <span>
            <CobraSecondaryButton
              onClick={handleReset}
              disabled={saving}
              size="small"
              startIcon={<FontAwesomeIcon icon={faRotateLeft} />}
            >
              Reset to Defaults
            </CobraSecondaryButton>
          </span>
        </Tooltip>
      </Box>

      {/* Flag cards by category */}
      {Object.entries(flagsByCategory).map(([category, categoryFlags]) => (
        <Box key={category} sx={{ mb: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{ mb: 1, color: theme.palette.text.secondary, textTransform: 'uppercase', letterSpacing: 1 }}
          >
            {categoryLabels[category] || category}
          </Typography>
          <Grid container spacing={2}>
            {categoryFlags.map((info) => {
              const currentState = flags[info.key] as FeatureFlagState;
              const config = stateConfig[currentState] || stateConfig.Hidden;

              return (
                <Grid item xs={12} sm={6} md={4} key={info.key}>
                  <Card
                    sx={{
                      height: '100%',
                      opacity: currentState === 'Hidden' ? 0.6 : 1,
                      borderLeft: `4px solid`,
                      borderLeftColor: config.color,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        {/* Icon */}
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 1,
                            backgroundColor: currentState === 'Active'
                              ? theme.palette.buttonPrimary.light
                              : currentState === 'ComingSoon'
                                ? theme.palette.warning.light
                                : theme.palette.grey[100],
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <FontAwesomeIcon
                            icon={flagIcons[info.key]}
                            style={{
                              color: currentState === 'Active'
                                ? theme.palette.buttonPrimary.main
                                : currentState === 'ComingSoon'
                                  ? theme.palette.warning.dark
                                  : theme.palette.grey[400],
                            }}
                          />
                        </Box>

                        {/* Content */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="subtitle2" noWrap>
                              {info.name}
                            </Typography>
                            <Chip
                              icon={<FontAwesomeIcon icon={config.icon} style={{ fontSize: 10 }} />}
                              label={featureFlagStates.find(s => s.value === currentState)?.label || currentState}
                              size="small"
                              color={config.chipColor}
                              sx={{ height: 20, fontSize: 10, '& .MuiChip-icon': { fontSize: 10 } }}
                            />
                          </Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {info.description}
                          </Typography>
                        </Box>
                      </Box>

                      {/* State selector */}
                      <Box sx={{ mt: 1.5 }}>
                        <ToggleButtonGroup
                          value={currentState}
                          exclusive
                          onChange={(_, value) => handleStateChange(info.key, value)}
                          disabled={saving}
                          size="small"
                          fullWidth
                          sx={{
                            '& .MuiToggleButton-root': {
                              py: 0.5,
                              fontSize: 11,
                              textTransform: 'none',
                            },
                          }}
                        >
                          <ToggleButton value="Hidden" sx={{ flex: 1 }}>
                            <FontAwesomeIcon icon={faEyeSlash} style={{ marginRight: 4, fontSize: 10 }} />
                            Hidden
                          </ToggleButton>
                          <ToggleButton value="ComingSoon" sx={{ flex: 1 }}>
                            <FontAwesomeIcon icon={faClock} style={{ marginRight: 4, fontSize: 10 }} />
                            Soon
                          </ToggleButton>
                          <ToggleButton value="Active" sx={{ flex: 1 }}>
                            <FontAwesomeIcon icon={faCheck} style={{ marginRight: 4, fontSize: 10 }} />
                            Active
                          </ToggleButton>
                        </ToggleButtonGroup>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      ))}

      {saving && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
    </Box>
  );
};

export default FeatureFlagsAdmin;
