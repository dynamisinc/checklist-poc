/**
 * Events List Page
 *
 * Displays a list of all events the user can access.
 * Clicking an event navigates to that event's landing page.
 *
 * Route: /events
 * Breadcrumb: Home / Events
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Chip,
  CircularProgress,
  Stack,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarAlt, faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";
import { useEvents } from "../hooks/useEvents";
import { getIconFromName, getEventTypeColor } from "../utils/iconMapping";
import { CreateEventDialog } from "../components/CreateEventDialog";
import { CobraNewButton } from "../../../theme/styledComponents";
import CobraStyles from "../../../theme/CobraStyles";
import type { Event } from "../types";

/**
 * Events List Page Component
 */
export const EventsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { events, loading, selectEvent } = useEvents();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleEventClick = (event: Event) => {
    selectEvent(event);
    navigate(`/events/${event.id}`);
  };

  const handleCreateEventClick = () => {
    setCreateDialogOpen(true);
  };

  const handleEventCreated = (eventId: string) => {
    // Navigate to the new event's landing page
    navigate(`/events/${eventId}`);
  };

  if (loading) {
    return (
      <Container maxWidth={false} disableGutters>
        <Stack
          spacing={2}
          padding={CobraStyles.Padding.MainWindow}
          alignItems="center"
          justifyContent="center"
          sx={{ minHeight: "50vh" }}
        >
          <CircularProgress />
          <Typography>Loading events...</Typography>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth={false} disableGutters>
      <Stack spacing={3} padding={CobraStyles.Padding.MainWindow}>
        {/* Page Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>
              Events
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Select an event to view details and access tools
            </Typography>
          </Box>
          <CobraNewButton onClick={handleCreateEventClick}>
            Create Event
          </CobraNewButton>
        </Box>

        {/* Events Grid */}
        {events.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <Typography variant="h6" color="text.secondary">
              No events available
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Click "Create Event" to get started.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {events.map((event) => {
              const EventIcon = getIconFromName(event.primaryCategory?.iconName || "faCircle");
              const categoryColor = getEventTypeColor(event.primaryCategory?.name || "");

              return (
                <Grid item xs={12} sm={6} md={4} key={event.id}>
                  <Card
                    sx={{
                      height: "100%",
                      "&:hover": {
                        boxShadow: 4,
                      },
                    }}
                  >
                    <CardActionArea
                      onClick={() => handleEventClick(event)}
                      sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "stretch" }}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        {/* Category Badge */}
                        <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                          <Chip
                            icon={<FontAwesomeIcon icon={EventIcon} />}
                            label={event.primaryCategory?.name || "Event"}
                            size="small"
                            sx={{
                              backgroundColor: categoryColor,
                              color: "white",
                              "& .MuiChip-icon": { color: "white" },
                            }}
                          />
                          {event.isArchived && (
                            <Chip label="Archived" size="small" color="default" />
                          )}
                        </Box>

                        {/* Event Name */}
                        <Typography variant="h6" sx={{ mb: 1 }}>
                          {event.name}
                        </Typography>

                        {/* Description */}
                        {event.description && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 2 }}
                          >
                            {event.description.length > 100
                              ? `${event.description.substring(0, 100)}...`
                              : event.description}
                          </Typography>
                        )}

                        {/* Metadata */}
                        <Stack spacing={0.5}>
                          {event.location && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <FontAwesomeIcon icon={faMapMarkerAlt} size="sm" />
                              {event.location}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <FontAwesomeIcon icon={faCalendarAlt} size="sm" />
                            {new Date(event.createdAt).toLocaleDateString()}
                          </Typography>
                        </Stack>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Stack>

      {/* Create Event Dialog */}
      <CreateEventDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onEventCreated={handleEventCreated}
      />
    </Container>
  );
};

export default EventsListPage;
