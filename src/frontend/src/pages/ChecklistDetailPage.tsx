/**
 * Checklist Detail Page
 *
 * Displays full checklist with all items.
 * Users can mark items complete, update status, and add notes.
 *
 * User Story 2.4: View Checklist Instance Detail
 * User Story 3.1-3.3: Item completion, status updates, notes
 */

import { useEffect } from 'react';
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
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useChecklistDetail } from '../hooks/useChecklistDetail';
import { useItemActions } from '../hooks/useItemActions';
import { c5Colors } from '../theme/c5Theme';

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
  const { toggleComplete, isProcessing } = useItemActions();

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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => navigate('/checklists')} sx={{ mr: 2 }}>
            <FontAwesomeIcon icon={faArrowLeft} />
          </IconButton>
          <Typography variant="h4">{checklist.name}</Typography>
        </Box>

        <Typography variant="body1" color="text.secondary">
          {checklist.eventName}
          {checklist.operationalPeriodName &&
            ` - ${checklist.operationalPeriodName}`}
        </Typography>

        {/* Progress */}
        <Box sx={{ mt: 3 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              mb: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Overall Progress
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {checklist.completedItems} / {checklist.totalItems} items
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Number(checklist.progressPercentage)}
            sx={{
              height: 12,
              borderRadius: 6,
              backgroundColor: '#E0E0E0',
              '& .MuiLinearProgress-bar': {
                backgroundColor: getProgressColor(
                  Number(checklist.progressPercentage)
                ),
              },
            }}
          />
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            {Number(checklist.progressPercentage).toFixed(0)}% complete
          </Typography>
        </Box>

        {checklist.requiredItems > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Required items: {checklist.requiredItemsCompleted} /{' '}
            {checklist.requiredItems}
          </Typography>
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

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
          {checklist.items.map((item, index) => (
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
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                {item.itemType === 'checkbox' && (
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

                        {item.isCompleted && item.completedBy && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', mt: 0.5 }}
                          >
                            Completed by {item.completedBy} (
                            {item.completedByPosition}) at{' '}
                            {new Date(item.completedAt!).toLocaleString()}
                          </Typography>
                        )}

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
                    sx={{ alignItems: 'flex-start', width: '100%' }}
                  />
                )}

                {item.itemType === 'status' && (
                  <Box sx={{ width: '100%' }}>
                    <Typography variant="body1">
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
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      Status: {item.currentStatus || 'Not set'}
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
                )}
              </Box>
            </Paper>
          ))}
        </Box>
      )}
    </Container>
  );
};
