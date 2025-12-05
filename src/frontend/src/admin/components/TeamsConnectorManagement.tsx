/**
 * Teams Connector Management Component (UC-TI-030)
 *
 * Admin UI for viewing, renaming, and managing Teams bot connectors.
 * Allows cleanup of stale/emulator connections.
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Stack,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlug,
  faPencil,
  faTrash,
  faRotateRight,
  faBroom,
  faCircleCheck,
  faCircleXmark,
  faRobot,
  faFlask,
  faCalendarDays,
  faLink,
  faLinkSlash,
} from '@fortawesome/free-solid-svg-icons';
import { faMicrosoft } from '@fortawesome/free-brands-svg-icons';
import { toast } from 'react-toastify';
import { formatDistanceToNow } from 'date-fns';
import {
  CobraTextField,
  CobraSecondaryButton,
  CobraPrimaryButton,
  CobraDeleteButton,
  CobraLinkButton,
  CobraDialog,
} from '../../theme/styledComponents';
import CobraStyles from '../../theme/CobraStyles';
import { systemSettingsService } from '../services/systemSettingsService';
import type { TeamsConnectorDto } from '../types/systemSettings';

/**
 * Rename Connector Dialog
 */
const RenameDialog: React.FC<{
  open: boolean;
  connector: TeamsConnectorDto | null;
  onClose: () => void;
  onSave: (mappingId: string, newName: string) => Promise<void>;
}> = ({ open, connector, onClose, onSave }) => {
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (connector) {
      setNewName(connector.displayName);
    }
  }, [connector]);

  const handleSave = async () => {
    if (!connector || !newName.trim()) return;
    try {
      setSaving(true);
      await onSave(connector.mappingId, newName.trim());
      onClose();
    } catch {
      // Error handled in parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <CobraDialog open={open} onClose={onClose} title="Rename Connector" contentWidth="400px">
      <Stack spacing={CobraStyles.Spacing.FormFields}>
        <Typography variant="body2" color="text.secondary">
          Enter a new display name for this Teams connector.
        </Typography>
        <CobraTextField
          label="Display Name"
          fullWidth
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          disabled={saving}
          autoFocus
        />
        <DialogActions sx={{ px: 0, pt: 2 }}>
          <CobraLinkButton onClick={onClose} disabled={saving}>
            Cancel
          </CobraLinkButton>
          <CobraPrimaryButton onClick={handleSave} disabled={saving || !newName.trim()}>
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </CobraPrimaryButton>
        </DialogActions>
      </Stack>
    </CobraDialog>
  );
};

/**
 * Cleanup Confirmation Dialog
 */
const CleanupDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: (days: number, includeEmulators: boolean) => Promise<void>;
}> = ({ open, onClose, onConfirm }) => {
  const [days, setDays] = useState(30);
  const [includeEmulators, setIncludeEmulators] = useState(true);
  const [processing, setProcessing] = useState(false);

  const handleConfirm = async () => {
    try {
      setProcessing(true);
      await onConfirm(days, includeEmulators);
      onClose();
    } catch {
      // Error handled in parent
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Cleanup Stale Connectors</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Alert severity="warning">
            This will deactivate all Teams connectors that have not received messages in the
            specified time period. This action can be reversed by reactivating individual connectors.
          </Alert>
          <CobraTextField
            label="Inactive Days Threshold"
            type="number"
            fullWidth
            value={days}
            onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 30))}
            helperText="Connectors with no activity for this many days will be deactivated"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={includeEmulators}
                onChange={(e) => setIncludeEmulators(e.target.checked)}
              />
            }
            label="Include emulator connections in cleanup"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <CobraLinkButton onClick={onClose} disabled={processing}>
          Cancel
        </CobraLinkButton>
        <CobraDeleteButton onClick={handleConfirm} disabled={processing}>
          {processing ? <CircularProgress size={20} /> : 'Cleanup Connectors'}
        </CobraDeleteButton>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Delete Confirmation Dialog
 */
const DeleteDialog: React.FC<{
  open: boolean;
  connector: TeamsConnectorDto | null;
  onClose: () => void;
  onConfirm: (mappingId: string) => Promise<void>;
}> = ({ open, connector, onClose, onConfirm }) => {
  const [processing, setProcessing] = useState(false);

  const handleConfirm = async () => {
    if (!connector) return;
    try {
      setProcessing(true);
      await onConfirm(connector.mappingId);
      onClose();
    } catch {
      // Error handled in parent
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Deactivate Connector</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography>
            Are you sure you want to deactivate <strong>{connector?.displayName}</strong>?
          </Typography>
          <Alert severity="info">
            This is a soft delete. The connector will be deactivated but can be restored later.
            Messages will no longer be received from or sent to this Teams channel.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <CobraLinkButton onClick={onClose} disabled={processing}>
          Cancel
        </CobraLinkButton>
        <CobraDeleteButton onClick={handleConfirm} disabled={processing}>
          {processing ? <CircularProgress size={20} /> : 'Deactivate'}
        </CobraDeleteButton>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Main Teams Connector Management Component
 *
 * Note: Event linking is now done at the event level, not here.
 * Event Managers link Teams connectors to channels within their events.
 * This admin view shows available connectors and allows renaming/cleanup.
 */
export const TeamsConnectorManagement: React.FC = () => {
  const theme = useTheme();
  const [connectors, setConnectors] = useState<TeamsConnectorDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [showInactive, setShowInactive] = useState(false);
  const [showEmulatorsOnly, setShowEmulatorsOnly] = useState(false);

  // Dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<TeamsConnectorDto | null>(null);

  const loadConnectors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: { isEmulator?: boolean; isActive?: boolean } = {};
      if (showEmulatorsOnly) {
        params.isEmulator = true;
      }
      if (!showInactive) {
        params.isActive = true;
      }
      const response = await systemSettingsService.listTeamsConnectors(params);
      setConnectors(response.connectors);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load connectors';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [showInactive, showEmulatorsOnly]);

  useEffect(() => {
    loadConnectors();
  }, [loadConnectors]);

  const handleRename = async (mappingId: string, newName: string) => {
    try {
      await systemSettingsService.renameTeamsConnector(mappingId, newName);
      toast.success('Connector renamed');
      await loadConnectors();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to rename connector';
      toast.error(message);
      throw err;
    }
  };

  const handleDelete = async (mappingId: string) => {
    try {
      await systemSettingsService.deleteTeamsConnector(mappingId);
      toast.success('Connector deactivated');
      await loadConnectors();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate connector';
      toast.error(message);
      throw err;
    }
  };

  const handleReactivate = async (mappingId: string) => {
    try {
      await systemSettingsService.reactivateTeamsConnector(mappingId);
      toast.success('Connector reactivated');
      await loadConnectors();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reactivate connector';
      toast.error(message);
    }
  };

  const handleCleanup = async (days: number, _includeEmulators: boolean) => {
    try {
      const result = await systemSettingsService.cleanupStaleConnectors(days);
      if (result.deletedCount > 0) {
        toast.success(`Deactivated ${result.deletedCount} stale connector(s)`);
      } else {
        toast.info('No stale connectors found');
      }
      await loadConnectors();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cleanup connectors';
      toast.error(message);
      throw err;
    }
  };

  const openRenameDialog = (connector: TeamsConnectorDto) => {
    setSelectedConnector(connector);
    setRenameDialogOpen(true);
  };

  const openDeleteDialog = (connector: TeamsConnectorDto) => {
    setSelectedConnector(connector);
    setDeleteDialogOpen(true);
  };

  // Count statistics
  const activeCount = connectors.filter((c) => c.isActive).length;
  const emulatorCount = connectors.filter((c) => c.isEmulator).length;
  const inactiveCount = connectors.filter((c) => !c.isActive).length;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FontAwesomeIcon icon={faMicrosoft} style={{ color: '#6264a7' }} />
          <Typography variant="subtitle1" fontWeight={600}>
            Teams Connector Management
          </Typography>
          {!loading && (
            <Chip
              label={`${activeCount} active`}
              size="small"
              color="success"
              sx={{ height: 20, fontSize: 10 }}
            />
          )}
          {emulatorCount > 0 && (
            <Chip
              icon={<FontAwesomeIcon icon={faFlask} style={{ fontSize: 10 }} />}
              label={`${emulatorCount} emulator`}
              size="small"
              color="warning"
              sx={{ height: 20, fontSize: 10 }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Cleanup stale connectors">
            <CobraSecondaryButton
              size="small"
              onClick={() => setCleanupDialogOpen(true)}
              startIcon={<FontAwesomeIcon icon={faBroom} />}
            >
              Cleanup
            </CobraSecondaryButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <CobraSecondaryButton
              size="small"
              onClick={loadConnectors}
              disabled={loading}
              startIcon={<FontAwesomeIcon icon={faRotateRight} />}
            >
              Refresh
            </CobraSecondaryButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
          }
          label={
            <Typography variant="body2">
              Show inactive ({inactiveCount})
            </Typography>
          }
        />
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={showEmulatorsOnly}
              onChange={(e) => setShowEmulatorsOnly(e.target.checked)}
            />
          }
          label={
            <Typography variant="body2">
              Emulators only ({emulatorCount})
            </Typography>
          }
        />
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      )}

      {/* Empty State */}
      {!loading && connectors.length === 0 && (
        <Card sx={{ backgroundColor: theme.palette.grey[50] }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <FontAwesomeIcon
              icon={faPlug}
              style={{ fontSize: 32, color: theme.palette.grey[400], marginBottom: 16 }}
            />
            <Typography variant="body1" color="text.secondary">
              No Teams connectors found.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Connectors are created automatically when the bot is installed in a Teams channel
              or when using the Bot Framework Emulator.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Connectors Table */}
      {!loading && connectors.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: theme.palette.grey[50] }}>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Activity</TableCell>
                <TableCell>Installed By</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {connectors.map((connector) => (
                <TableRow
                  key={connector.mappingId}
                  sx={{
                    opacity: connector.isActive ? 1 : 0.6,
                    backgroundColor: connector.isEmulator
                      ? theme.palette.warning.light + '20'
                      : undefined,
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {connector.isEmulator ? (
                        <FontAwesomeIcon
                          icon={faFlask}
                          style={{ color: theme.palette.warning.main }}
                        />
                      ) : (
                        <FontAwesomeIcon icon={faRobot} style={{ color: '#6264a7' }} />
                      )}
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {connector.displayName}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
                        >
                          {connector.conversationId.substring(0, 30)}...
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Chip
                        icon={
                          <FontAwesomeIcon
                            icon={connector.isActive ? faCircleCheck : faCircleXmark}
                            style={{ fontSize: 10 }}
                          />
                        }
                        label={connector.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        color={connector.isActive ? 'success' : 'default'}
                        sx={{ height: 20, fontSize: 10 }}
                      />
                      {connector.hasConversationReference ? (
                        <Chip
                          icon={<FontAwesomeIcon icon={faLink} style={{ fontSize: 8 }} />}
                          label="Can send"
                          size="small"
                          color="info"
                          variant="outlined"
                          sx={{ height: 18, fontSize: 9 }}
                        />
                      ) : (
                        <Chip
                          icon={<FontAwesomeIcon icon={faLinkSlash} style={{ fontSize: 8 }} />}
                          label="Receive only"
                          size="small"
                          color="warning"
                          variant="outlined"
                          sx={{ height: 18, fontSize: 9 }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {connector.lastActivityAt ? (
                      <Tooltip
                        title={new Date(connector.lastActivityAt).toLocaleString()}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <FontAwesomeIcon
                            icon={faCalendarDays}
                            style={{ fontSize: 12, color: theme.palette.grey[500] }}
                          />
                          <Typography variant="caption">
                            {formatDistanceToNow(new Date(connector.lastActivityAt), {
                              addSuffix: true,
                            })}
                          </Typography>
                        </Box>
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.secondary" fontStyle="italic">
                        Never
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {connector.installedByName || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                      <Tooltip title="Rename">
                        <IconButton size="small" onClick={() => openRenameDialog(connector)}>
                          <FontAwesomeIcon icon={faPencil} style={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                      {connector.isActive ? (
                        <Tooltip title="Deactivate">
                          <IconButton
                            size="small"
                            onClick={() => openDeleteDialog(connector)}
                            sx={{ color: theme.palette.error.main }}
                          >
                            <FontAwesomeIcon icon={faTrash} style={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Reactivate">
                          <IconButton
                            size="small"
                            onClick={() => handleReactivate(connector.mappingId)}
                            sx={{ color: theme.palette.success.main }}
                          >
                            <FontAwesomeIcon icon={faRotateRight} style={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialogs */}
      <RenameDialog
        open={renameDialogOpen}
        connector={selectedConnector}
        onClose={() => {
          setRenameDialogOpen(false);
          setSelectedConnector(null);
        }}
        onSave={handleRename}
      />

      <CleanupDialog
        open={cleanupDialogOpen}
        onClose={() => setCleanupDialogOpen(false)}
        onConfirm={handleCleanup}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        connector={selectedConnector}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedConnector(null);
        }}
        onConfirm={handleDelete}
      />
    </Box>
  );
};

export default TeamsConnectorManagement;
