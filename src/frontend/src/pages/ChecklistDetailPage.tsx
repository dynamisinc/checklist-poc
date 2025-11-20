/**
 * Checklist Detail Page
 *
 * Displays full checklist with all items.
 * Users can mark items complete, update status, and add notes.
 *
 * User Story 2.4: View Checklist Instance Detail
 * User Story 3.1-3.3: Item completion, status updates, notes
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Button,
  LinearProgress,
  Checkbox,
  FormControlLabel,
  Paper,
  Divider,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faNoteSticky, faCopy, faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { useChecklistDetail } from '../hooks/useChecklistDetail';
import { useItemActions } from '../hooks/useItemActions';
import { c5Colors } from '../theme/c5Theme';
import { ItemNotesDialog } from '../components/ItemNotesDialog';
import { CreateChecklistDialog, type ChecklistCreationData } from '../components/CreateChecklistDialog';
import { checklistService } from '../services/checklistService';
import type { ChecklistItemDto } from '../services/checklistService';

/**
 * Get progress bar color based on completion percentage
 */
const getProgressColor = (percentage: number): string => {
  if (percentage === 100) return c5Colors.successGreen;
  if (percentage >= 67) return c5Colors.cobaltBlue;
  if (percentage >= 34) return c5Colors.canaryYellow;
  return c5Colors.lavaRed;
};

/**
 * Parse status options from comma-separated string
 */
const parseStatusOptions = (statusOptions?: string | null): string[] => {
  if (!statusOptions) return [];
  return statusOptions
    .split(',')
    .map((option) => option.trim())
    .filter((option) => option.length > 0);
};

/**
 * Checklist Detail Page Component
 */
export const ChecklistDetailPage: React.FC = () => {
  const { checklistId } = useParams<{ checklistId: string }>();
  const navigate = useNavigate();
  const {
    checklist,
    loading,
    error,
    fetchChecklist,
    updateItemLocally,
  } = useChecklistDetail();
  const { toggleComplete, updateNotes, updateStatus, isProcessing } = useItemActions();

  // Notes dialog state
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItemDto | null>(null);

  // Copy dialog state
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyMode, setCopyMode] = useState<'clone-clean' | 'clone-direct'>('clone-clean');
  const [copying, setCopying] = useState(false);

  // Item info expanded state
  const [expandedItemInfo, setExpandedItemInfo] = useState<Set<string>>(new Set());

  // Toggle item info display
  const toggleItemInfo = (itemId: string) => {
    setExpandedItemInfo((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Fetch checklist on mount
  useEffect(() => {
    if (checklistId) {
      fetchChecklist(checklistId);
    }
  }, [checklistId, fetchChecklist]);

  // Handle checkbox toggle
  const handleToggleComplete = async (
    itemId: string,
    currentStatus: boolean
  ) => {
    if (!checklistId) return;

    await toggleComplete(
      checklistId,
      itemId,
      currentStatus,
      undefined,
      updateItemLocally
    );

    // Refresh checklist to get updated progress
    fetchChecklist(checklistId);
  };

  // Handle open notes dialog
  const handleOpenNotesDialog = (item: ChecklistItemDto) => {
    setEditingItem(item);
    setNotesDialogOpen(true);
  };

  // Handle close notes dialog
  const handleCloseNotesDialog = () => {
    setNotesDialogOpen(false);
    setEditingItem(null);
  };

  // Handle save notes
  const handleSaveNotes = async (notes: string) => {
    if (!checklistId || !editingItem) return;

    const updatedItem = await updateNotes(
      checklistId,
      editingItem.id,
      notes,
      updateItemLocally
    );

    if (updatedItem) {
      // Success - close dialog
      handleCloseNotesDialog();

      // Refresh checklist to ensure we have latest data
      fetchChecklist(checklistId);
    }
  };

  // Handle status change (inline dropdown)
  const handleStatusChange = async (itemId: string, newStatus: string) => {
    if (!checklistId) return;

    const updatedItem = await updateStatus(
      checklistId,
      itemId,
      newStatus,
      undefined, // notes - not changing notes here
      updateItemLocally
    );

    if (updatedItem) {
      // Refresh checklist to ensure we have latest data
      fetchChecklist(checklistId);
    }
  };

  // Handle open copy dialog
  const handleOpenCopyDialog = (mode: 'clone-clean' | 'clone-direct') => {
    setCopyMode(mode);
    setCopyDialogOpen(true);
  };

  // Handle close copy dialog
  const handleCloseCopyDialog = () => {
    setCopyDialogOpen(false);
  };

  // Handle save copy
  const handleSaveCopy = async (data: ChecklistCreationData) => {
    if (!checklistId || !checklist) return;

    try {
      setCopying(true);

      const preserveStatus = data.mode === 'clone-direct';
      const newChecklist = await checklistService.cloneChecklist(
        checklistId,
        data.name,
        preserveStatus
      );

      toast.success(`Checklist "${newChecklist.name}" created successfully!`);

      // Close dialog
      setCopyDialogOpen(false);

      // Navigate to the new checklist
      navigate(`/checklists/${newChecklist.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to copy checklist';
      toast.error(message);
      throw err; // Re-throw so dialog can show error
    } finally {
      setCopying(false);
    }
  };

  // Loading state
  if (loading && !checklist) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading checklist...</Typography>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography color="error" variant="h6">
          Error loading checklist
        </Typography>
        <Typography color="error">{error}</Typography>
        <Button
          variant="outlined"
          sx={{ mt: 2 }}
          onClick={() => navigate('/checklists')}
        >
          Back to My Checklists
        </Button>
      </Container>
    );
  }

  // Not found state
  if (!checklist) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography variant="h6">Checklist not found</Typography>
        <Button
          variant="outlined"
          sx={{ mt: 2 }}
          onClick={() => navigate('/checklists')}
        >
          Back to My Checklists
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <IconButton onClick={() => navigate('/checklists')} sx={{ mr: 1 }}>
            <FontAwesomeIcon icon={faArrowLeft} />
          </IconButton>
          <Typography variant="h4" sx={{ flexGrow: 1 }}>{checklist.name}</Typography>

          {/* Copy Buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FontAwesomeIcon icon={faCopy} />}
              onClick={() => handleOpenCopyDialog('clone-clean')}
              sx={{
                minHeight: 48,
              }}
            >
              Copy (Clean)
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FontAwesomeIcon icon={faCopy} />}
              onClick={() => handleOpenCopyDialog('clone-direct')}
              sx={{
                minHeight: 48,
              }}
            >
              Copy (Direct)
            </Button>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary">
          {checklist.eventName}
          {checklist.operationalPeriodName &&
            ` - ${checklist.operationalPeriodName}`}
        </Typography>
      </Box>

      {/* Sticky Progress Bar */}
      <Box
        sx={{
          position: 'sticky',
          top: 64, // Height of AppBar
          zIndex: 100,
          backgroundColor: '#F5F5F5',
          py: 1.5,
          mb: 2,
          borderRadius: 1,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            mb: 0.5,
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
            Progress
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {checklist.completedItems} / {checklist.totalItems} items ({Number(checklist.progressPercentage).toFixed(0)}%)
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={Number(checklist.progressPercentage)}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: '#E0E0E0',
            '& .MuiLinearProgress-bar': {
              backgroundColor: getProgressColor(
                Number(checklist.progressPercentage)
              ),
            },
          }}
        />

        {checklist.requiredItems > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            Required: {checklist.requiredItemsCompleted} / {checklist.requiredItems}
          </Typography>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Items List */}
      <Typography variant="h5" sx={{ mb: 2 }}>
        Items
      </Typography>

      {checklist.items.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No items in this checklist
          </Typography>
        </Paper>
      ) : (
        <Box>
          {checklist.items.map((item) => (
            <Paper
              key={item.id}
              sx={{
                p: 2,
                mb: 2,
                backgroundColor: item.isCompleted
                  ? '#F5F5F5'
                  : 'background.paper',
              }}
            >
              <Box sx={{ width: '100%' }}>
                {/* Top row: checkbox + text + action buttons */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1 }}>
                  {item.itemType === 'checkbox' && (
                    <>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={item.isCompleted || false}
                            onChange={() =>
                              handleToggleComplete(item.id, item.isCompleted || false)
                            }
                            disabled={isProcessing(item.id)}
                          />
                        }
                        label={
                          <Box>
                            <Typography
                              variant="body1"
                              sx={{
                                textDecoration: item.isCompleted
                                  ? 'line-through'
                                  : 'none',
                              }}
                            >
                              {item.itemText}
                              {item.isRequired && (
                                <Typography
                                  component="span"
                                  color="error"
                                  sx={{ ml: 1 }}
                                >
                                  *
                                </Typography>
                              )}
                            </Typography>

                            {item.notes && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  mt: 1,
                                  p: 1,
                                  backgroundColor: c5Colors.whiteBlue,
                                  borderRadius: 1,
                                }}
                              >
                                Note: {item.notes}
                              </Typography>
                            )}
                          </Box>
                        }
                        sx={{ alignItems: 'flex-start', flexGrow: 1 }}
                      />

                      {/* Action Buttons */}
                      <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                        {/* Info button */}
                        <IconButton
                          size="small"
                          onClick={() => toggleItemInfo(item.id)}
                          sx={{
                            color: expandedItemInfo.has(item.id) ? 'primary.main' : 'text.secondary',
                          }}
                        >
                          <FontAwesomeIcon icon={faCircleInfo} />
                        </IconButton>

                        {/* Add/Edit Note button */}
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<FontAwesomeIcon icon={faNoteSticky} />}
                          onClick={() => handleOpenNotesDialog(item)}
                          disabled={isProcessing(item.id)}
                          sx={{
                            minWidth: 120,
                            minHeight: 48,
                          }}
                        >
                          {item.notes ? 'Edit Note' : 'Add Note'}
                        </Button>
                      </Box>
                    </>
                  )}

                  {item.itemType === 'status' && (
                    <>
                      <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {item.itemText}
                        {item.isRequired && (
                          <Typography
                            component="span"
                            color="error"
                            sx={{ ml: 1 }}
                          >
                            *
                          </Typography>
                        )}
                      </Typography>

                      {/* Inline Status Dropdown */}
                      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel id={`status-${item.id}-label`}>Status</InputLabel>
                        <Select
                          labelId={`status-${item.id}-label`}
                          value={item.currentStatus || ''}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          label="Status"
                          disabled={isProcessing(item.id)}
                        >
                          {/* Empty option */}
                          <MenuItem value="">
                            <em>(Not set)</em>
                          </MenuItem>

                          {/* Available status options */}
                          {parseStatusOptions(item.statusOptions).map((option) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {item.notes && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mt: 1,
                            p: 1,
                            backgroundColor: c5Colors.whiteBlue,
                            borderRadius: 1,
                          }}
                        >
                          Note: {item.notes}
                        </Typography>
                      )}
                    </Box>

                      {/* Action Buttons */}
                      <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, alignSelf: 'flex-start' }}>
                        {/* Info button */}
                        <IconButton
                          size="small"
                          onClick={() => toggleItemInfo(item.id)}
                          sx={{
                            color: expandedItemInfo.has(item.id) ? 'primary.main' : 'text.secondary',
                          }}
                        >
                          <FontAwesomeIcon icon={faCircleInfo} />
                        </IconButton>

                        {/* Add/Edit Note button */}
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<FontAwesomeIcon icon={faNoteSticky} />}
                          onClick={() => handleOpenNotesDialog(item)}
                          disabled={isProcessing(item.id)}
                          sx={{
                            minWidth: 120,
                            minHeight: 48,
                          }}
                        >
                          {item.notes ? 'Edit Note' : 'Add Note'}
                        </Button>
                      </Box>
                    </>
                  )}
                </Box>

                {/* Collapsible Item Metadata */}
                <Collapse in={expandedItemInfo.has(item.id)}>
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      backgroundColor: '#FAFAFA',
                      borderRadius: 1,
                      borderLeft: `3px solid ${c5Colors.cobaltBlue}`,
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 1, display: 'block' }}>
                      Item Information
                    </Typography>

                    {/* Completion info (checkbox items) */}
                    {item.itemType === 'checkbox' && item.isCompleted && item.completedBy && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        <strong>Completed:</strong> {new Date(item.completedAt!).toLocaleString()} by {item.completedBy} ({item.completedByPosition})
                      </Typography>
                    )}

                    {/* Last modified info */}
                    {item.lastModifiedBy && item.lastModifiedAt && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        <strong>Last modified:</strong> {new Date(item.lastModifiedAt).toLocaleString()} by {item.lastModifiedBy} ({item.lastModifiedByPosition})
                      </Typography>
                    )}

                    {/* Created info */}
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      <strong>Created:</strong> {new Date(item.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                </Collapse>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {/* Notes Dialog */}
      {editingItem && (
        <ItemNotesDialog
          open={notesDialogOpen}
          itemText={editingItem.itemText}
          currentNotes={editingItem.notes}
          onSave={handleSaveNotes}
          onCancel={handleCloseNotesDialog}
          saving={isProcessing(editingItem.id)}
        />
      )}

      {/* Copy Checklist Dialog */}
      {checklist && (
        <CreateChecklistDialog
          open={copyDialogOpen}
          mode={copyMode}
          sourceChecklistId={checklist.id}
          sourceChecklistName={checklist.name}
          eventId={checklist.eventId}
          eventName={checklist.eventName}
          defaultOperationalPeriodId={checklist.operationalPeriodId}
          defaultOperationalPeriodName={checklist.operationalPeriodName}
          onSave={handleSaveCopy}
          onCancel={handleCloseCopyDialog}
          saving={copying}
        />
      )}
    </Container>
  );
};
