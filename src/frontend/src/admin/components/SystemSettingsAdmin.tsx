/**
 * System Settings Admin Component
 *
 * Admin UI for managing customer-level configuration settings.
 * Supports integration settings (GroupMe, etc.) and AI provider settings.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  InputAdornment,
  Switch,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLink,
  faBrain,
  faGear,
  faEye,
  faEyeSlash,
  faCheck,
  faSave,
  faRefresh,
  faPlug,
  faKey,
  faGlobe,
  faCopy,
  faCircleCheck,
  faCircleXmark,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import {
  CobraTextField,
  CobraPrimaryButton,
  CobraSecondaryButton,
} from '../../theme/styledComponents';
import { systemSettingsService } from '../services/systemSettingsService';
import {
  SystemSettingDto,
  SettingCategory,
  SettingCategoryNames,
  GroupMeIntegrationStatus,
} from '../types/systemSettings';

// Category icons
const categoryIcons: Record<SettingCategory, IconDefinition> = {
  [SettingCategory.Integration]: faPlug,
  [SettingCategory.AI]: faBrain,
  [SettingCategory.System]: faGear,
};

// Setting key icons
const settingIcons: Record<string, IconDefinition> = {
  'GroupMe.AccessToken': faKey,
  'GroupMe.WebhookBaseUrl': faGlobe,
  'OpenAI.ApiKey': faKey,
  'AzureOpenAI.ApiKey': faKey,
  'AzureOpenAI.Endpoint': faGlobe,
};

interface SettingRowProps {
  setting: SystemSettingDto;
  onSave: (key: string, value: string) => Promise<void>;
  onToggle: (key: string) => Promise<void>;
  saving: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({ setting, onSave, onToggle, saving }) => {
  const theme = useTheme();
  const [value, setValue] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Reset dirty state when setting changes
  useEffect(() => {
    setValue(setting.isSecret ? '' : setting.value);
    setIsDirty(false);
    setShowSecret(false);
  }, [setting]);

  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (value.trim() || !setting.isSecret) {
      await onSave(setting.key, value);
      setIsDirty(false);
    }
  };

  const icon = settingIcons[setting.key] || (setting.isSecret ? faKey : faLink);

  return (
    <Card
      sx={{
        mb: 2,
        borderLeft: `4px solid`,
        borderLeftColor: setting.isEnabled
          ? setting.hasValue
            ? theme.palette.success.main
            : theme.palette.warning.main
          : theme.palette.grey[400],
        opacity: setting.isEnabled ? 1 : 0.6,
      }}
    >
      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          {/* Icon */}
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              backgroundColor: setting.isEnabled
                ? theme.palette.buttonPrimary.light
                : theme.palette.grey[100],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <FontAwesomeIcon
              icon={icon}
              style={{
                color: setting.isEnabled
                  ? theme.palette.buttonPrimary.main
                  : theme.palette.grey[400],
              }}
            />
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="subtitle2">{setting.displayName}</Typography>
              {setting.hasValue && (
                <Chip
                  icon={<FontAwesomeIcon icon={faCheck} style={{ fontSize: 10 }} />}
                  label="Configured"
                  size="small"
                  color="success"
                  sx={{ height: 20, fontSize: 10 }}
                />
              )}
              {!setting.hasValue && setting.isEnabled && (
                <Chip
                  label="Not Set"
                  size="small"
                  color="warning"
                  sx={{ height: 20, fontSize: 10 }}
                />
              )}
            </Box>

            {/* Description */}
            {setting.description && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {setting.description}
              </Typography>
            )}

            {/* Input field */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <CobraTextField
                size="small"
                fullWidth
                type={setting.isSecret && !showSecret ? 'password' : 'text'}
                placeholder={setting.isSecret && setting.hasValue ? '••••••••' : 'Enter value...'}
                value={value}
                onChange={(e) => handleValueChange(e.target.value)}
                disabled={!setting.isEnabled || saving}
                InputProps={{
                  endAdornment: setting.isSecret && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowSecret(!showSecret)}
                        edge="end"
                      >
                        <FontAwesomeIcon icon={showSecret ? faEyeSlash : faEye} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ maxWidth: 400 }}
              />
              <Tooltip title="Save">
                <span>
                  <IconButton
                    color="primary"
                    onClick={handleSave}
                    disabled={!isDirty || saving || !setting.isEnabled}
                    sx={{
                      backgroundColor: isDirty ? theme.palette.primary.light : undefined,
                    }}
                  >
                    {saving ? (
                      <CircularProgress size={20} />
                    ) : (
                      <FontAwesomeIcon icon={faSave} />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
            </Box>

            {/* Key name (small) */}
            <Typography
              variant="caption"
              sx={{ color: theme.palette.grey[500], mt: 0.5, display: 'block' }}
            >
              Key: {setting.key}
            </Typography>
          </Box>

          {/* Enable/Disable toggle */}
          <Tooltip title={setting.isEnabled ? 'Disable' : 'Enable'}>
            <Switch
              checked={setting.isEnabled}
              onChange={() => onToggle(setting.key)}
              disabled={saving}
              size="small"
            />
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
};

/**
 * GroupMe Integration Status Card
 * Displays read-only webhook configuration from server appsettings
 */
const GroupMeStatusCard: React.FC<{
  status: GroupMeIntegrationStatus | null;
  loading: boolean;
}> = ({ status, loading }) => {
  const theme = useTheme();

  const handleCopyUrl = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    toast.success(`${label} copied to clipboard`);
  };

  if (loading || !status) {
    return null;
  }

  // Detect if using localhost (development mode without ngrok)
  const isLocalhost = status.webhookBaseUrl.includes('localhost') ||
                      status.webhookBaseUrl.includes('127.0.0.1');

  return (
    <Card
      sx={{
        mb: 3,
        borderLeft: `4px solid`,
        borderLeftColor: status.isConfigured
          ? theme.palette.success.main
          : theme.palette.warning.main,
        backgroundColor: theme.palette.grey[50],
      }}
    >
      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          {/* Icon */}
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              backgroundColor: theme.palette.buttonPrimary.light,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <FontAwesomeIcon
              icon={faGlobe}
              style={{ color: theme.palette.buttonPrimary.main }}
            />
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="subtitle2">GroupMe Webhook Configuration</Typography>
              <Chip
                icon={
                  <FontAwesomeIcon
                    icon={status.isConfigured ? faCircleCheck : faCircleXmark}
                    style={{ fontSize: 10 }}
                  />
                }
                label={status.isConfigured ? 'Ready' : 'Incomplete'}
                size="small"
                color={status.isConfigured ? 'success' : 'warning'}
                sx={{ height: 20, fontSize: 10 }}
              />
            </Box>

            {/* Development Mode Warning */}
            {isLocalhost && (
              <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
                <Typography variant="caption" component="div">
                  <strong>Local Development Mode</strong> - GroupMe webhooks won&apos;t work with localhost.
                </Typography>
                <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
                  To test webhooks locally, start ngrok and update <code>appsettings.Development.json</code>:
                </Typography>
                <Box component="pre" sx={{
                  mt: 0.5,
                  p: 1,
                  backgroundColor: theme.palette.grey[100],
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  overflow: 'auto',
                }}>
                  {`ngrok http 5000\n\n# Then update appsettings.Development.json:\n"GroupMe": {\n  "WebhookBaseUrl": "https://your-ngrok-url.ngrok-free.app"\n}`}
                </Box>
              </Alert>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              These URLs are determined by server configuration and cannot be changed here.
              When creating a GroupMe channel, the bot will be registered with the callback URL below.
            </Typography>

            {/* Webhook Base URL */}
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Webhook Base URL (from appsettings)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <CobraTextField
                  size="small"
                  fullWidth
                  value={status.webhookBaseUrl}
                  InputProps={{ readOnly: true }}
                  sx={{
                    maxWidth: 500,
                    '& .MuiInputBase-input': {
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                    },
                  }}
                />
                <Tooltip title="Copy URL">
                  <IconButton
                    size="small"
                    onClick={() => handleCopyUrl(status.webhookBaseUrl, 'Webhook Base URL')}
                  >
                    <FontAwesomeIcon icon={faCopy} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Webhook Callback URL Pattern */}
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Webhook Callback URL Pattern
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <CobraTextField
                  size="small"
                  fullWidth
                  value={status.webhookCallbackUrlPattern}
                  InputProps={{ readOnly: true }}
                  sx={{
                    maxWidth: 500,
                    '& .MuiInputBase-input': {
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                    },
                  }}
                />
                <Tooltip title="Copy URL Pattern">
                  <IconButton
                    size="small"
                    onClick={() => handleCopyUrl(status.webhookCallbackUrlPattern, 'Callback URL Pattern')}
                  >
                    <FontAwesomeIcon icon={faCopy} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {'{channelMappingId}'} is replaced with the actual channel mapping GUID when a GroupMe channel is created.
              </Typography>
            </Box>

            {/* Health Check URL */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Webhook Health Check URL
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <CobraTextField
                  size="small"
                  fullWidth
                  value={status.webhookHealthCheckUrl}
                  InputProps={{ readOnly: true }}
                  sx={{
                    maxWidth: 500,
                    '& .MuiInputBase-input': {
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                    },
                  }}
                />
                <Tooltip title="Copy Health Check URL">
                  <IconButton
                    size="small"
                    onClick={() => handleCopyUrl(status.webhookHealthCheckUrl, 'Health Check URL')}
                  >
                    <FontAwesomeIcon icon={faCopy} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export const SystemSettingsAdmin: React.FC = () => {
  const theme = useTheme();
  const [settings, setSettings] = useState<SystemSettingDto[]>([]);
  const [groupMeStatus, setGroupMeStatus] = useState<GroupMeIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [settingsData, groupMeData] = await Promise.all([
        systemSettingsService.getAllSettings(),
        systemSettingsService.getGroupMeIntegrationStatus(),
      ]);
      setSettings(settingsData);
      setGroupMeStatus(groupMeData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load settings';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleInitializeDefaults = async () => {
    try {
      setSaving(true);
      await systemSettingsService.initializeDefaults();
      toast.success('Default settings initialized');
      await loadSettings();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize defaults';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSetting = async (key: string, value: string) => {
    try {
      setSaving(true);
      await systemSettingsService.updateSettingValue(key, value);
      toast.success('Setting saved');
      await loadSettings();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save setting';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSetting = async (key: string) => {
    try {
      setSaving(true);
      await systemSettingsService.toggleSetting(key);
      await loadSettings();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to toggle setting';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && settings.length === 0) {
    return (
      <Alert
        severity="warning"
        action={
          <CobraPrimaryButton size="small" onClick={handleInitializeDefaults}>
            Initialize Defaults
          </CobraPrimaryButton>
        }
      >
        No system settings found. Click to initialize default settings.
      </Alert>
    );
  }

  // Group settings by category
  const settingsByCategory = settings.reduce(
    (acc, setting) => {
      const category = setting.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(setting);
      return acc;
    },
    {} as Record<SettingCategory, SystemSettingDto[]>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Configure integration tokens and API keys for external services.
          <strong> Secrets are stored securely</strong> and masked in the UI.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh settings">
            <CobraSecondaryButton
              size="small"
              onClick={loadSettings}
              disabled={saving}
              startIcon={<FontAwesomeIcon icon={faRefresh} />}
            >
              Refresh
            </CobraSecondaryButton>
          </Tooltip>
          {settings.length === 0 && (
            <CobraPrimaryButton
              size="small"
              onClick={handleInitializeDefaults}
              disabled={saving}
            >
              Initialize Defaults
            </CobraPrimaryButton>
          )}
        </Box>
      </Box>

      {/* Settings by category */}
      {Object.entries(settingsByCategory).map(([categoryStr, categorySettings]) => {
        const category = Number(categoryStr) as SettingCategory;
        const categoryName = SettingCategoryNames[category] || 'Other';
        const categoryIcon = categoryIcons[category] || faGear;
        const isIntegrationCategory = category === SettingCategory.Integration;

        return (
          <Box key={category} sx={{ mb: 4 }}>
            <Typography
              variant="subtitle1"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 2,
                color: theme.palette.text.primary,
                fontWeight: 600,
              }}
            >
              <FontAwesomeIcon icon={categoryIcon} />
              {categoryName}
            </Typography>

            {/* Show GroupMe webhook status card in Integration category */}
            {isIntegrationCategory && (
              <GroupMeStatusCard status={groupMeStatus} loading={loading} />
            )}

            {categorySettings.map((setting) => (
              <SettingRow
                key={setting.id}
                setting={setting}
                onSave={handleSaveSetting}
                onToggle={handleToggleSetting}
                saving={saving}
              />
            ))}
          </Box>
        );
      })}

      {settings.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No settings configured. Click &quot;Initialize Defaults&quot; to create the default
          settings.
        </Alert>
      )}
    </Box>
  );
};

export default SystemSettingsAdmin;
