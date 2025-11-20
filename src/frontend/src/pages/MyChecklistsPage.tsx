/**
 * My Checklists Page
 *
 * Landing page showing all checklists assigned to the current user's position.
 * Displays checklist cards with progress bars and metadata.
 *
 * User Story 2.3: View My Checklists
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
} from '@mui/material';
import { useChecklists } from '../hooks/useChecklists';
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
 * My Checklists Page Component
 */
export const MyChecklistsPage: React.FC = () => {
  const navigate = useNavigate();
  const { checklists, loading, error, fetchMyChecklists } = useChecklists();

  // Fetch checklists on mount
  useEffect(() => {
    fetchMyChecklists(false);
  }, [fetchMyChecklists]);

  // Loading state
  if (loading && checklists.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading your checklists...</Typography>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography color="error" variant="h6">
          Error loading checklists
        </Typography>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  // Empty state
  if (checklists.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h5" color="text.secondary">
            No checklists assigned
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
            You don't have any active checklists assigned to your position.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        My Checklists
      </Typography>

      <Grid container spacing={3}>
        {checklists.map((checklist) => (
          <Grid item xs={12} md={6} lg={4} key={checklist.id}>
            <Card
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: 6,
                },
              }}
              onClick={() => navigate(`/checklists/${checklist.id}`)}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {checklist.name}
                </Typography>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {checklist.eventName}
                </Typography>

                {checklist.operationalPeriodName && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    gutterBottom
                  >
                    {checklist.operationalPeriodName}
                  </Typography>
                )}

                <Box sx={{ mt: 2, mb: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Progress
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {checklist.completedItems} / {checklist.totalItems} items
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
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 0.5 }}
                  >
                    {Number(checklist.progressPercentage).toFixed(0)}% complete
                  </Typography>
                </Box>

                {checklist.assignedPositions && (
                  <Box sx={{ mt: 2 }}>
                    {checklist.assignedPositions
                      .split(',')
                      .map((position, idx) => (
                        <Chip
                          key={idx}
                          label={position.trim()}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                  </Box>
                )}

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                  Created by {checklist.createdBy} ({checklist.createdByPosition})
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};
