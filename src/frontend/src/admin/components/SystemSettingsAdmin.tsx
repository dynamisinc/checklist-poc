/**
 * System Settings Admin Component
 *
 * Admin UI for managing integration settings.
 * Each integration section is explicitly defined in the UI.
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
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEye,
  faEyeSlash,
  faSave,
  faRefresh,
  faPlug,
  faKey,
  faGlobe,
  faCopy,
  faCircleCheck,
  faCircleXmark,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import {
  CobraTextField,
  CobraSecondaryButton,
} from '../../theme/styledComponents';
import { systemSettingsService } from '../services/systemSettingsService';
import type {
  GroupMeIntegrationStatus,
  TeamsIntegrationStatus,
} from '../types/systemSettings';

/**
 * GroupMe Integration Card
 * Displays webhook configuration (from appsettings) and access token (from database)
 */
const GroupMeIntegrationCard: React.FC<{
  status: GroupMeIntegrationStatus | null;
  loading: boolean;
  onRefresh: () => void;
}> = ({ status, loading, onRefresh }) => {
  const theme = useTheme();
  const [accessToken, setAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const handleCopyUrl = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    toast.success(`${label} copied to clipboard`);
  };

  const handleTokenChange = (value: string) => {
    setAccessToken(value);
    setIsDirty(true);
  };

  const handleSaveToken = async () => {
    if (!accessToken.trim()) return;

    try {
      setSaving(true);
      await systemSettingsService.updateSettingValue('GroupMe.AccessToken', accessToken);
      toast.success('GroupMe Access Token saved');
      setIsDirty(false);
      setAccessToken(''); // Clear after save for security
      onRefresh(); // Refresh status to update hasAccessToken
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save token';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card sx={{ mb: 3, p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={24} />
      </Card>
    );
  }

  // Detect if using localhost (development mode without ngrok)
  const isLocalhost = status?.webhookBaseUrl.includes('localhost') ||
                      status?.webhookBaseUrl.includes('127.0.0.1');

  return (
    <Card
      sx={{
        mb: 3,
        borderLeft: `4px solid`,
        borderLeftColor: status?.isConfigured
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
              <Typography variant="subtitle2">GroupMe Integration</Typography>
              <Chip
                icon={
                  <FontAwesomeIcon
                    icon={status?.isConfigured ? faCircleCheck : faCircleXmark}
                    style={{ fontSize: 10 }}
                  />
                }
                label={status?.isConfigured ? 'Ready' : 'Incomplete'}
                size="small"
                color={status?.isConfigured ? 'success' : 'warning'}
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
              Configure GroupMe bot integration for event chat channels.
            </Typography>

            {/* Access Token */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Access Token
                </Typography>
                {status?.hasAccessToken && (
                  <Chip
                    icon={<FontAwesomeIcon icon={faCircleCheck} style={{ fontSize: 8 }} />}
                    label="Configured"
                    size="small"
                    color="success"
                    sx={{ height: 18, fontSize: 9 }}
                  />
                )}
                {!status?.hasAccessToken && (
                  <Chip
                    label="Not Set"
                    size="small"
                    color="warning"
                    sx={{ height: 18, fontSize: 9 }}
                  />
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <CobraTextField
                  size="small"
                  fullWidth
                  type={showToken ? 'text' : 'password'}
                  placeholder={status?.hasAccessToken ? '••••••••••••••••' : 'Enter GroupMe access token...'}
                  value={accessToken}
                  onChange={(e) => handleTokenChange(e.target.value)}
                  disabled={saving}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <FontAwesomeIcon icon={faKey} style={{ color: theme.palette.grey[400] }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowToken(!showToken)}
                          edge="end"
                        >
                          <FontAwesomeIcon icon={showToken ? faEyeSlash : faEye} />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ maxWidth: 500 }}
                />
                <Tooltip title="Save Token">
                  <span>
                    <IconButton
                      color="primary"
                      onClick={handleSaveToken}
                      disabled={!isDirty || saving || !accessToken.trim()}
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
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Get your access token from <a href="https://dev.groupme.com/" target="_blank" rel="noopener noreferrer">dev.groupme.com</a>
              </Typography>
            </Box>

            {/* Webhook Base URL */}
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Webhook Base URL (from appsettings)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <CobraTextField
                  size="small"
                  fullWidth
                  value={status?.webhookBaseUrl || '(not configured)'}
                  InputProps={{ readOnly: true }}
                  sx={{
                    maxWidth: 500,
                    '& .MuiInputBase-input': {
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                    },
                  }}
                />
                {status?.webhookBaseUrl && (
                  <Tooltip title="Copy URL">
                    <IconButton
                      size="small"
                      onClick={() => handleCopyUrl(status.webhookBaseUrl, 'Webhook Base URL')}
                    >
                      <FontAwesomeIcon icon={faCopy} />
                    </IconButton>
                  </Tooltip>
                )}
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
                  value={status?.webhookCallbackUrlPattern || '(not available)'}
                  InputProps={{ readOnly: true }}
                  sx={{
                    maxWidth: 500,
                    '& .MuiInputBase-input': {
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                    },
                  }}
                />
                {status?.webhookCallbackUrlPattern && (
                  <Tooltip title="Copy URL Pattern">
                    <IconButton
                      size="small"
                      onClick={() => handleCopyUrl(status.webhookCallbackUrlPattern, 'Callback URL Pattern')}
                    >
                      <FontAwesomeIcon icon={faCopy} />
                    </IconButton>
                  </Tooltip>
                )}
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
                  value={status?.webhookHealthCheckUrl || '(not available)'}
                  InputProps={{ readOnly: true }}
                  sx={{
                    maxWidth: 500,
                    '& .MuiInputBase-input': {
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                    },
                  }}
                />
                {status?.webhookHealthCheckUrl && (
                  <Tooltip title="Copy Health Check URL">
                    <IconButton
                      size="small"
                      onClick={() => handleCopyUrl(status.webhookHealthCheckUrl, 'Health Check URL')}
                    >
                      <FontAwesomeIcon icon={faCopy} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
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
const TeamsIntegrationCard: React.FC<{
  status: TeamsIntegrationStatus | null;
  loading: boolean;
}> = ({ status, loading }) => {
  const theme = useTheme();

  const handleCopyUrl = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    toast.success(`${label} copied to clipboard`);
  };

  if (loading) {
    return (
      <Card sx={{ mb: 3, p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={24} />
      </Card>
    );
  }

  if (!status) {
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
  const [groupMeStatus, setGroupMeStatus] = useState<GroupMeIntegrationStatus | null>(null);
  const [teamsStatus, setTeamsStatus] = useState<TeamsIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStatuses = useCallback(async () => {
    try {
      setLoading(true);

      // Use Promise.allSettled to handle partial failures gracefully
      const [groupMeResult, teamsResult] = await Promise.allSettled([
        systemSettingsService.getGroupMeIntegrationStatus(),
        systemSettingsService.getTeamsIntegrationStatus(),
      ]);

      if (groupMeResult.status === 'fulfilled') {
        setGroupMeStatus(groupMeResult.value);
      } else {
        setGroupMeStatus(null);
        console.warn('Failed to load GroupMe status:', groupMeResult.reason);
      }

      if (teamsResult.status === 'fulfilled') {
        setTeamsStatus(teamsResult.value);
      } else {
        setTeamsStatus(null);
        console.warn('Failed to load Teams status:', teamsResult.reason);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Configure external service integrations for chat and messaging.
        </Typography>
        <Tooltip title="Refresh status">
          <CobraSecondaryButton
            size="small"
            onClick={loadStatuses}
            disabled={loading}
            startIcon={<FontAwesomeIcon icon={faRefresh} />}
          >
            Refresh
          </CobraSecondaryButton>
        </Tooltip>
      </Box>

      {/* Integrations Section */}
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
          External Chat Integrations
        </Typography>

        <GroupMeIntegrationCard
          status={groupMeStatus}
          loading={loading}
          onRefresh={loadStatuses}
        />

        <TeamsIntegrationCard
          status={teamsStatus}
          loading={loading}
        />
      </Box>
    </Box>
  );
};

export default SystemSettingsAdmin;
