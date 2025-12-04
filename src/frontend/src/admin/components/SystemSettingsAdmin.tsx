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
  TeamsIntegrationStatus,
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
 * and editable GroupMe settings from the database
 */
const GroupMeStatusCard: React.FC<{
  status: GroupMeIntegrationStatus | null;
  loading: boolean;
  settings: SystemSettingDto[];
  onSave: (key: string, value: string) => Promise<void>;
  onToggle: (key: string) => Promise<void>;
  saving: boolean;
}> = ({ status, loading, settings, onSave, onToggle, saving }) => {
  const theme = useTheme();

  const handleCopyUrl = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    toast.success(`${label} copied to clipboard`);
  };

  // If still loading, show nothing
  if (loading) {
    return null;
  }

  // If status failed to load but we have settings, still show them
  if (!status) {
    if (settings.length === 0) {
      return null;
    }
    // Render just the settings without the webhook info
    return (
      <Card
        sx={{
          mb: 3,
          borderLeft: `4px solid`,
          borderLeftColor: theme.palette.warning.main,
          backgroundColor: theme.palette.grey[50],
        }}
      >
        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>GroupMe Settings</Typography>
          {settings.map((setting) => (
            <SettingRow
              key={setting.id}
              setting={setting}
              onSave={onSave}
              onToggle={onToggle}
              saving={saving}
            />
          ))}
        </CardContent>
      </Card>
    );
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

            {/* GroupMe Database Settings */}
            {settings.length > 0 && (
              <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 1.5 }}>
                  GroupMe Settings
                </Typography>
                {settings.map((setting) => (
                  <SettingRow
                    key={setting.id}
                    setting={setting}
                    onSave={onSave}
                    onToggle={onToggle}
                    saving={saving}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

/**
 * Teams Integration Status Card
 * Displays connection status to the TeamsBot service
 */
const TeamsStatusCard: React.FC<{
  status: TeamsIntegrationStatus | null;
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

  return (
    <Card
      sx={{
        mb: 3,
        borderLeft: `4px solid`,
        borderLeftColor: status.isConnected
          ? theme.palette.success.main
          : status.isConfigured
            ? theme.palette.warning.main
            : theme.palette.grey[400],
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
              backgroundColor: status.isConfigured
                ? '#6264a720'
                : theme.palette.grey[100],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <FontAwesomeIcon
              icon={faPlug}
              style={{ color: status.isConfigured ? '#6264a7' : theme.palette.grey[400] }}
            />
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="subtitle2">Microsoft Teams Bot</Typography>
              <Chip
                icon={
                  <FontAwesomeIcon
                    icon={status.isConnected ? faCircleCheck : faCircleXmark}
                    style={{ fontSize: 10 }}
                  />
                }
                label={
                  status.isConnected
                    ? 'Connected'
                    : status.isConfigured
                      ? 'Not Reachable'
                      : 'Not Configured'
                }
                size="small"
                color={status.isConnected ? 'success' : status.isConfigured ? 'warning' : 'default'}
                sx={{ height: 20, fontSize: 10 }}
              />
              {status.isConnected && status.availableConversations > 0 && (
                <Chip
                  label={`${status.availableConversations} channel(s)`}
                  size="small"
                  color="info"
                  sx={{ height: 20, fontSize: 10 }}
                />
              )}
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              {status.statusMessage}
            </Typography>

            {!status.isConfigured && (
              <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
                <Typography variant="caption" component="div">
                  <strong>Teams Bot not configured.</strong> To enable Teams integration:
                </Typography>
                <Box component="pre" sx={{
                  mt: 0.5,
                  p: 1,
                  backgroundColor: theme.palette.grey[100],
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  overflow: 'auto',
                }}>
                  {`# Add to appsettings.json:\n"TeamsBot": {\n  "BaseUrl": "http://localhost:3978"\n}`}
                </Box>
              </Alert>
            )}

            {status.isConfigured && !status.isConnected && (
              <Alert severity="warning" sx={{ mb: 2, py: 0.5 }}>
                <Typography variant="caption" component="div">
                  <strong>TeamsBot service is not reachable.</strong> Make sure the TeamsBot is running:
                </Typography>
                <Box component="pre" sx={{
                  mt: 0.5,
                  p: 1,
                  backgroundColor: theme.palette.grey[100],
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  overflow: 'auto',
                }}>
                  {`cd src/backend/CobraAPI.TeamsBot\ndotnet run`}
                </Box>
              </Alert>
            )}

            {/* Bot Base URL */}
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Bot Base URL (from appsettings)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <CobraTextField
                  size="small"
                  fullWidth
                  value={status.botBaseUrl}
                  InputProps={{ readOnly: true }}
                  sx={{
                    maxWidth: 500,
                    '& .MuiInputBase-input': {
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                    },
                  }}
                />
                {status.isConfigured && (
                  <Tooltip title="Copy URL">
                    <IconButton
                      size="small"
                      onClick={() => handleCopyUrl(status.botBaseUrl, 'Bot Base URL')}
                    >
                      <FontAwesomeIcon icon={faCopy} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>

            {/* Internal API URL */}
            {status.isConfigured && (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Internal Send API
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <CobraTextField
                    size="small"
                    fullWidth
                    value={status.internalApiUrl}
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
                      onClick={() => handleCopyUrl(status.internalApiUrl, 'Internal API URL')}
                    >
                      <FontAwesomeIcon icon={faCopy} />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  CobraAPI uses this endpoint to send outbound messages to Teams channels.
                </Typography>
              </Box>
            )}
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
  const [teamsStatus, setTeamsStatus] = useState<TeamsIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [settingsData, groupMeData, teamsData] = await Promise.all([
        systemSettingsService.getAllSettings(),
        systemSettingsService.getGroupMeIntegrationStatus(),
        systemSettingsService.getTeamsIntegrationStatus(),
      ]);
      setSettings(settingsData);
      setGroupMeStatus(groupMeData);
      setTeamsStatus(teamsData);
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

  // Group settings by category name (API returns string category names like "Integration", "AI")
  const settingsByCategoryName = settings.reduce(
    (acc, setting) => {
      // Use categoryName for grouping since API returns string enum names
      const categoryName = setting.categoryName;
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(setting);
      return acc;
    },
    {} as Record<string, SystemSettingDto[]>
  );

  // Helper to get settings by category name
  const getSettingsByCategory = (category: SettingCategory): SystemSettingDto[] => {
    const categoryName = SettingCategoryNames[category];
    return settingsByCategoryName[categoryName] || [];
  };

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

      {/* Integration Status Section - Always show regardless of settings */}
      <Box sx={{ mb: 4 }}>
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
          <FontAwesomeIcon icon={faPlug} />
          {SettingCategoryNames[SettingCategory.Integration]}
        </Typography>

        {/* Integration status cards with their related settings */}
        <GroupMeStatusCard
          status={groupMeStatus}
          loading={loading}
          settings={getSettingsByCategory(SettingCategory.Integration).filter(s => s.key.startsWith('GroupMe.'))}
          onSave={handleSaveSetting}
          onToggle={handleToggleSetting}
          saving={saving}
        />
        <TeamsStatusCard status={teamsStatus} loading={loading} />

        {/* Other Integration settings (not GroupMe) */}
        {getSettingsByCategory(SettingCategory.Integration)
          .filter(s => !s.key.startsWith('GroupMe.'))
          .map((setting) => (
            <SettingRow
              key={setting.id}
              setting={setting}
              onSave={handleSaveSetting}
              onToggle={handleToggleSetting}
              saving={saving}
            />
          ))}
      </Box>

      {/* Other settings by category (excluding Integration which is handled above) */}
      {Object.entries(settingsByCategoryName)
        .filter(([categoryName]) => categoryName !== SettingCategoryNames[SettingCategory.Integration])
        .map(([categoryName, categorySettings]) => {
          // Find the corresponding category enum
          const category = (Object.entries(SettingCategoryNames).find(([, name]) => name === categoryName)?.[0] as unknown as SettingCategory) ?? SettingCategory.System;
          const categoryIcon = categoryIcons[category] || faGear;

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
