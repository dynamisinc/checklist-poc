/**
 * Chat Page
 *
 * Displays the event chat interface with support for external platform
 * integration (GroupMe, etc.)
 *
 * Route: /chat
 * Breadcrumb: Home / Events / [Event Name] / Chat
 */

import React from 'react';
import {
  Container,
  Typography,
  Box,
  Stack,
  CircularProgress,
  Alert,
  Card,
  CardContent,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useEvents } from '../../../shared/events';
import { EventChat } from '../components/EventChat';
import CobraStyles from '../../../theme/CobraStyles';
import { CobraPrimaryButton } from '../../../theme/styledComponents';
import { useTheme } from '@mui/material/styles';

/**
 * Chat Page Component
 */
export const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { currentEvent, loading } = useEvents();

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
          <Typography>Loading...</Typography>
        </Stack>
      </Container>
    );
  }

  if (!currentEvent) {
    return (
      <Container maxWidth={false} disableGutters>
        <Stack spacing={3} padding={CobraStyles.Padding.MainWindow}>
          <Alert severity="warning" icon={<FontAwesomeIcon icon={faExclamationTriangle} />}>
            Please select an event to access the chat.
          </Alert>
          <Box>
            <CobraPrimaryButton onClick={() => navigate('/events')}>
              Go to Events
            </CobraPrimaryButton>
          </Box>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth={false} disableGutters>
      <Stack spacing={3} padding={CobraStyles.Padding.MainWindow}>
        {/* Page Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              backgroundColor: theme.palette.buttonPrimary.light,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FontAwesomeIcon
              icon={faComments}
              size="lg"
              style={{ color: theme.palette.buttonPrimary.main }}
            />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={600}>
              Event Chat
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {currentEvent.name}
            </Typography>
          </Box>
        </Box>

        {/* Info Card */}
        <Card
          variant="outlined"
          sx={{
            backgroundColor: theme.palette.info.light,
            borderColor: theme.palette.info.main,
          }}
        >
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="body2">
              Chat with your team in real-time. Connect external channels like GroupMe
              to include field personnel who don't have access to COBRA.
            </Typography>
          </CardContent>
        </Card>

        {/* Chat Component */}
        <Box sx={{ maxWidth: 800 }}>
          <EventChat eventId={currentEvent.id} eventName={currentEvent.name} />
        </Box>
      </Stack>
    </Container>
  );
};

export default ChatPage;
