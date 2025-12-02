/**
 * Manage Checklists Page
 *
 * Allows users with Manage role to view and manage archived checklists
 * for the current event. Provides ability to:
 * - View all archived checklists
 * - Restore archived checklists
 * - Permanently delete archived checklists
 *
 * Requires Manage role permission.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRotateLeft,
  faTrash,
  faBoxArchive,
  faWarning,
} from '@fortawesome/free-solid-svg-icons';
import { useEvents } from '../../../shared/events';
import { usePermissions } from '../../../hooks/usePermissions';
import { checklistService, type ChecklistInstanceDto } from '../services/checklistService';
import { CobraDeleteButton, CobraLinkButton } from '../../../theme/styledComponents';
import CobraStyles from '../../../theme/CobraStyles';
import { cobraTheme } from '../../../theme/cobraTheme';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

/**
 * Manage Checklists Page Component
 */
export const ManageChecklistsPage: React.FC = () => {
  const { currentEvent } = useEvents();
  const permissions = usePermissions();
  const [archivedChecklists, setArchivedChecklists] = useState<ChecklistInstanceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [checklistToDelete, setChecklistToDelete] = useState<ChecklistInstanceDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);

  /**
   * Fetch archived checklists for the current event
   */
  const fetchArchivedChecklists = useCallback(async () => {
    if (!currentEvent?.id) {
      setArchivedChecklists([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const checklists = await checklistService.getArchivedChecklistsByEvent(currentEvent.id);
      setArchivedChecklists(checklists);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load archived checklists';
      setError(message);
      console.error('Error fetching archived checklists:', err);
    } finally {
      setLoading(false);
    }
  }, [currentEvent?.id]);

  // Fetch archived checklists on mount and when event changes
  useEffect(() => {
    fetchArchivedChecklists();
  }, [fetchArchivedChecklists]);

  /**
   * Handle restoring an archived checklist
   */
  const handleRestore = async (checklist: ChecklistInstanceDto) => {
    try {
      setIsRestoring(checklist.id);
      await checklistService.restoreChecklist(checklist.id);
      toast.success(`Checklist "${checklist.name}" has been restored`);
      // Remove from the list
      setArchivedChecklists((prev) => prev.filter((c) => c.id !== checklist.id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restore checklist';
      toast.error(message);
    } finally {
      setIsRestoring(null);
    }
  };

  /**
   * Handle opening the permanent delete confirmation dialog
   */
  const handleDeleteClick = (checklist: ChecklistInstanceDto) => {
    setChecklistToDelete(checklist);
    setDeleteDialogOpen(true);
  };

  /**
   * Handle confirming permanent deletion
   */
  const handleConfirmDelete = async () => {
    if (!checklistToDelete) return;

    try {
      setIsDeleting(true);
      await checklistService.permanentlyDeleteChecklist(checklistToDelete.id);
      toast.success(`Checklist "${checklistToDelete.name}" has been permanently deleted`);
      // Remove from the list
      setArchivedChecklists((prev) => prev.filter((c) => c.id !== checklistToDelete.id));
      setDeleteDialogOpen(false);
      setChecklistToDelete(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to permanently delete checklist';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return dateString;
    }
  };

  // Check permissions
  if (!permissions.canManageArchivedChecklists) {
    return (
      <Container maxWidth={false} disableGutters>
        <Stack spacing={2} padding={CobraStyles.Padding.MainWindow} alignItems="center">
          <Typography color="error" variant="h6">
            Access Denied
          </Typography>
          <Typography color="text.secondary">
            You do not have permission to manage archived checklists.
          </Typography>
        </Stack>
      </Container>
    );
  }

  // No event selected
  if (!currentEvent) {
    return (
      <Container maxWidth={false} disableGutters>
        <Stack spacing={2} padding={CobraStyles.Padding.MainWindow}>
          <Typography variant="h4" sx={{ mb: 1 }}>
            Manage Archived Checklists
          </Typography>
          <Typography color="text.secondary">
            Please select an event to view archived checklists.
          </Typography>
        </Stack>
      </Container>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Container maxWidth={false} disableGutters>
        <Stack
          spacing={2}
          padding={CobraStyles.Padding.MainWindow}
          alignItems="center"
          justifyContent="center"
          sx={{ minHeight: '50vh' }}
        >
          <CircularProgress />
          <Typography>Loading archived checklists...</Typography>
        </Stack>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth={false} disableGutters>
        <Stack spacing={2} padding={CobraStyles.Padding.MainWindow}>
          <Typography color="error" variant="h6">
            Error loading archived checklists
          </Typography>
          <Typography color="error">{error}</Typography>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth={false} disableGutters>
      <Stack spacing={3} padding={CobraStyles.Padding.MainWindow}>
        {/* Page Header */}
        <Box>
          <Typography variant="h4" sx={{ mb: 1 }}>
            <FontAwesomeIcon
              icon={faBoxArchive}
              style={{ marginRight: 12, color: cobraTheme.palette.buttonPrimary.main }}
            />
            Manage Archived Checklists
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {archivedChecklists.length} archived checklist{archivedChecklists.length !== 1 ? 's' : ''} for "
            {currentEvent.name}"
          </Typography>
        </Box>

        {/* Empty state */}
        {archivedChecklists.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <FontAwesomeIcon
              icon={faBoxArchive}
              size="3x"
              style={{ color: '#ccc', marginBottom: 16 }}
            />
            <Typography variant="h6" color="text.secondary">
              No archived checklists
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              There are no archived checklists for this event.
            </Typography>
          </Box>
        ) : (
          /* Archived Checklists Table */
          <TableContainer component={Paper} elevation={1}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: cobraTheme.palette.action.hover }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Checklist Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Progress</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Archived By</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Archived At</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {archivedChecklists.map((checklist) => (
                  <TableRow
                    key={checklist.id}
                    sx={{
                      '&:hover': {
                        backgroundColor: cobraTheme.palette.action.selected,
                      },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {checklist.name}
                      </Typography>
                      {checklist.operationalPeriodName && (
                        <Typography variant="caption" color="text.secondary">
                          {checklist.operationalPeriodName}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${checklist.progressPercentage}%`}
                        size="small"
                        sx={{
                          backgroundColor:
                            checklist.progressPercentage === 100
                              ? cobraTheme.palette.success.main
                              : checklist.progressPercentage >= 50
                              ? cobraTheme.palette.warning.main
                              : cobraTheme.palette.error.main,
                          color: 'white',
                          fontWeight: 'bold',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{checklist.archivedBy || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(checklist.archivedAt)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title="Restore checklist">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleRestore(checklist)}
                              disabled={isRestoring === checklist.id}
                              sx={{
                                color: cobraTheme.palette.success.main,
                                '&:hover': {
                                  backgroundColor: 'rgba(46, 125, 50, 0.1)',
                                },
                              }}
                            >
                              {isRestoring === checklist.id ? (
                                <CircularProgress size={18} color="inherit" />
                              ) : (
                                <FontAwesomeIcon icon={faRotateLeft} />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Permanently delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(checklist)}
                            sx={{
                              color: cobraTheme.palette.error.main,
                              '&:hover': {
                                backgroundColor: 'rgba(211, 47, 47, 0.1)',
                              },
                            }}
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Permanent Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => !isDeleting && setDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FontAwesomeIcon
              icon={faWarning}
              style={{ color: cobraTheme.palette.error.main }}
            />
            Permanently Delete Checklist?
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to permanently delete{' '}
              <strong>"{checklistToDelete?.name}"</strong>?
            </DialogContentText>
            <DialogContentText sx={{ mt: 2, color: cobraTheme.palette.error.main }}>
              This action cannot be undone. All checklist data, including items and completion
              history, will be permanently removed.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <CobraLinkButton onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </CobraLinkButton>
            <CobraDeleteButton onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
                  Deleting...
                </>
              ) : (
                'Permanently Delete'
              )}
            </CobraDeleteButton>
          </DialogActions>
        </Dialog>
      </Stack>
    </Container>
  );
};
