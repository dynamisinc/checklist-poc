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
import { useHighlightItem } from '../hooks/useHighlightItem';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Button,
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
import { useChecklistHub } from '../hooks/useChecklistHub';
import { useChecklistVariant } from '../experiments';
import { c5Colors } from '../theme/c5Theme';
import { ItemNotesDialog } from '../components/ItemNotesDialog';
import { CreateChecklistDialog, type ChecklistCreationData } from '../components/CreateChecklistDialog';
import {
  ChecklistDetailClassic,
  ChecklistDetailCompact,
  ChecklistDetailProgressive,
} from '../components/checklist-variants';
import { ChecklistProgressBar } from '../components/ChecklistProgressBar';
import { checklistService } from '../services/checklistService';
import type { ChecklistItemDto } from '../services/checklistService';
import type { StatusOption } from '../types';

/**
 * Parse status configuration from JSON string
 * Handles both simple string arrays and full StatusOption objects
 */
const parseStatusConfiguration = (statusConfiguration?: string | null): StatusOption[] => {
  if (!statusConfiguration) return [];
  try {
    const parsed = JSON.parse(statusConfiguration);
    // Handle both formats: array of strings or array of StatusOption objects
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return [];
      // Check if first element is a string (simple format) or object (full format)
      if (typeof parsed[0] === 'string') {
        // Convert simple string array to StatusOption array
        return parsed.map((label: string, index: number) => ({
          label,
          isCompletion: label.toLowerCase().includes('complete') || label.toLowerCase().includes('done'),
          order: index,
        }));
      } else {
        // Already in StatusOption format
        return (parsed as StatusOption[]).sort((a, b) => a.order - b.order);
      }
    }
    return [];
  } catch (error) {
    console.error('Failed to parse status configuration:', error);
    return [];
  }
};

/**
 * Checklist Detail Page Component
 */
export const ChecklistDetailPage: React.FC = () => {
  const { checklistId } = useParams<{ checklistId: string }>();
  const navigate = useNavigate();
  const { variant } = useChecklistVariant();
  const {
    checklist,
    loading,
    error,
    fetchChecklist,
    updateItemLocally,
  } = useChecklistDetail();
  const { toggleComplete, updateNotes, updateStatus, isProcessing } = useItemActions();

  // Item highlight state (when navigating from landing page)
  const { highlightedItemId, isHighlighting, getItemRef } = useHighlightItem();

  // Real-time collaboration via SignalR
  const { joinChecklist, leaveChecklist } = useChecklistHub({
    onItemCompletionChanged: (data) => {
      console.log('[Real-time] Item completion changed:', data);
      // Update local state
      updateItemLocally(data.itemId, {
        isCompleted: data.isCompleted,
        completedBy: data.completedBy ?? undefined,
        completedByPosition: data.completedByPosition ?? undefined,
        completedAt: data.completedAt ?? undefined,
      });
      // Show toast notification
      const action = data.isCompleted ? 'completed' : 'unmarked';
      const by = data.completedByPosition || data.completedBy || 'Someone';
      toast.info(`${by} ${action} an item`, { autoClose: 3000 });
      // Refresh to get updated progress
      if (checklistId) {
        fetchChecklist(checklistId);
      }
    },
    onItemStatusChanged: (data) => {
      console.log('[Real-time] Item status changed:', data);
      // Update local state
      updateItemLocally(data.itemId, {
        currentStatus: data.newStatus,
        isCompleted: data.isCompleted,
      });
      // Show toast notification
      const by = data.changedByPosition || data.changedBy || 'Someone';
      toast.info(`${by} changed item status to "${data.newStatus}"`, { autoClose: 3000 });
      // Refresh to get updated progress
      if (checklistId) {
        fetchChecklist(checklistId);
      }
    },
    onItemNotesChanged: (data) => {
      console.log('[Real-time] Item notes changed:', data);
      // Update local state
      updateItemLocally(data.itemId, {
        notes: data.notes,
      });
      // Show toast notification
      const by = data.changedByPosition || data.changedBy || 'Someone';
      toast.info(`${by} updated item notes`, { autoClose: 3000 });
    },
    onChecklistUpdated: (data) => {
      console.log('[Real-time] Checklist updated:', data);
      // Refresh full checklist to get latest progress
      if (checklistId) {
        fetchChecklist(checklistId);
      }
    },
  });

  // Join/leave checklist group when checklistId changes
  useEffect(() => {
    if (checklistId) {
      joinChecklist(checklistId);
    }

    return () => {
      if (checklistId) {
        leaveChecklist(checklistId);
      }
    };
  }, [checklistId, joinChecklist, leaveChecklist]);

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

  // Common handlers for variants
  const variantHandleToggleComplete = async (itemId: string, currentStatus: boolean) => {
    if (!checklistId) return;
    await toggleComplete(checklistId, itemId, currentStatus, undefined, updateItemLocally);
    fetchChecklist(checklistId);
  };

  const variantHandleStatusChange = async (itemId: string, newStatus: string) => {
    if (!checklistId) return;
    await updateStatus(checklistId, itemId, newStatus, undefined, updateItemLocally);
    fetchChecklist(checklistId);
  };

  const variantHandleSaveNotes = async (itemId: string, notes: string) => {
    if (!checklistId) return;
    await updateNotes(checklistId, itemId, notes, updateItemLocally);
    fetchChecklist(checklistId);
  };

  const variantHandleCopy = (mode: 'clone-clean' | 'clone-direct') => {
    handleOpenCopyDialog(mode);
  };

  // Render variant-specific views (non-control variants)
  if (variant === 'classic') {
    return (
      <>
        <ChecklistDetailClassic
          checklist={checklist}
          onToggleComplete={variantHandleToggleComplete}
          onStatusChange={variantHandleStatusChange}
          onSaveNotes={variantHandleSaveNotes}
          onCopy={variantHandleCopy}
          isProcessing={isProcessing}
          highlightedItemId={highlightedItemId}
          isHighlighting={isHighlighting}
          getItemRef={getItemRef}
        />
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
      </>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        <ChecklistDetailCompact
          checklist={checklist}
          onToggleComplete={variantHandleToggleComplete}
          onStatusChange={variantHandleStatusChange}
          onSaveNotes={variantHandleSaveNotes}
          onCopy={variantHandleCopy}
          isProcessing={isProcessing}
          highlightedItemId={highlightedItemId}
          isHighlighting={isHighlighting}
          getItemRef={getItemRef}
        />
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
      </>
    );
  }

  if (variant === 'progressive') {
    return (
      <>
        <ChecklistDetailProgressive
          checklist={checklist}
          onToggleComplete={variantHandleToggleComplete}
          onStatusChange={variantHandleStatusChange}
          onSaveNotes={variantHandleSaveNotes}
          onCopy={variantHandleCopy}
          isProcessing={isProcessing}
          highlightedItemId={highlightedItemId}
          isHighlighting={isHighlighting}
          getItemRef={getItemRef}
        />
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
      </>
    );
  }

  // Default: Control variant (existing implementation)
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
          top: 0,
          zIndex: 100,
          backgroundColor: 'white',
          py: 1.5,
          px: 2,
          mb: 2,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          borderBottom: '1px solid #E0E0E0',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 0.5,
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
            Progress
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {checklist.completedItems} / {checklist.totalItems} items
          </Typography>
        </Box>
        <ChecklistProgressBar
          value={Number(checklist.progressPercentage)}
          height={24}
          showPercentage={true}
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
          {checklist.items.map((item) => {
            const isItemHighlighted = highlightedItemId === item.id && isHighlighting;
            return (
            <Paper
              key={item.id}
              ref={getItemRef(item.id)}
              sx={{
                p: 2,
                mb: 2,
                backgroundColor: item.isCompleted
                  ? '#F5F5F5'
                  : 'background.paper',
                // Highlight animation when navigating from landing page
                ...(isItemHighlighted && {
                  animation: 'highlightPulse 1s ease-in-out infinite',
                  borderRadius: 1,
                }),
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
                          {parseStatusConfiguration(item.statusConfiguration).map((option) => (
                            <MenuItem key={option.label} value={option.label}>
                              {option.label}
                              {option.isCompletion && (
                                <Typography
                                  component="span"
                                  sx={{
                                    ml: 1,
                                    fontSize: '0.75rem',
                                    color: c5Colors.green,
                                    fontWeight: 'bold',
                                  }}
                                >
                                  ✓
                                </Typography>
                              )}
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
            );
          })}
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
