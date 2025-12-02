/**
 * Event Landing Page
 *
 * Displays details about the current event and provides
 * navigation to event-specific tools.
 *
 * Route: /events/:eventId
 * Breadcrumb: Home / Events / [Event Name]
 */

import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Chip,
  Stack,
  Divider,
  CircularProgress,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClipboardList,
  faComments,
  faTableCells,
  faTimeline,
  faRobot,
  faCalendarAlt,
  faMapMarkerAlt,
  faUser,
  faListCheck,
  faBrain,
  faFileLines,
} from "@fortawesome/free-solid-svg-icons";
import { useEvents } from "../hooks/useEvents";
import { useFeatureFlags } from "../../../admin/contexts/FeatureFlagsContext";
import { getIconFromName, getEventTypeColor } from "../utils/iconMapping";
import CobraStyles from "../../../theme/CobraStyles";
import { useTheme } from "@mui/material/styles";
import type { FeatureFlags } from "../../../admin/types/featureFlags";

interface ToolCardProps {
  icon: typeof faClipboardList;
  title: string;
  description: string;
  path: string;
  featureFlag?: keyof FeatureFlags;
  disabled?: boolean;
  badge?: string;
}

const ToolCard: React.FC<ToolCardProps> = ({ icon, title, description, path, disabled, badge }) => {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Card
      sx={{
        height: "100%",
        opacity: disabled ? 0.5 : 1,
        "&:hover": disabled ? {} : { boxShadow: 4 },
      }}
    >
      <CardActionArea
        onClick={() => !disabled && navigate(path)}
        disabled={disabled}
        sx={{ height: "100%", p: 2 }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              backgroundColor: disabled ? theme.palette.grey[200] : theme.palette.buttonPrimary.light,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FontAwesomeIcon
              icon={icon}
              size="lg"
              style={{ color: disabled ? theme.palette.grey[500] : theme.palette.buttonPrimary.main }}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {title}
              {badge && (
                <Chip label={badge} size="small" sx={{ ml: 1 }} />
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  );
};

/**
 * Event Landing Page Component
 */
export const EventLandingPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { events, currentEvent, loading, selectEvent } = useEvents();
  const { isVisible, isComingSoon } = useFeatureFlags();

  // Select the event based on URL param if not already selected
  useEffect(() => {
    if (eventId && events.length > 0 && currentEvent?.id !== eventId) {
      const event = events.find((e) => e.id === eventId);
      if (event) {
        selectEvent(event);
      }
    }
  }, [eventId, events, currentEvent, selectEvent]);

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
          <Typography>Loading event...</Typography>
        </Stack>
      </Container>
    );
  }

  if (!currentEvent) {
    return (
      <Container maxWidth={false} disableGutters>
        <Stack spacing={3} padding={CobraStyles.Padding.MainWindow}>
          <Typography variant="h5" color="text.secondary">
            Event not found
          </Typography>
          <Typography variant="body1" color="text.secondary">
            The event you're looking for doesn't exist or you don't have access.
          </Typography>
        </Stack>
      </Container>
    );
  }

  const EventIcon = getIconFromName(currentEvent.primaryCategory?.iconName || "faCircle");
  const categoryColor = getEventTypeColor(currentEvent.primaryCategory?.name || "");

  // All available tools with their feature flags
  const allTools: ToolCardProps[] = [
    {
      icon: faClipboardList,
      title: "Checklist",
      description: "Manage and track operational checklists",
      path: "/checklists/dashboard",
      featureFlag: "checklist",
    },
    {
      icon: faComments,
      title: "Chat",
      description: "Team communication and messaging",
      path: "/chat",
      featureFlag: "chat",
    },
    {
      icon: faListCheck,
      title: "Tasking",
      description: "Task assignment and tracking",
      path: "/tasking",
      featureFlag: "tasking",
    },
    {
      icon: faBrain,
      title: "COBRA KAI",
      description: "AI-powered general assistance",
      path: "/cobra-kai",
      featureFlag: "cobraKai",
    },
    {
      icon: faFileLines,
      title: "Event Summary",
      description: "Event overview and reports",
      path: "/event-summary",
      featureFlag: "eventSummary",
    },
    {
      icon: faTableCells,
      title: "Status Chart",
      description: "Resource and personnel status tracking",
      path: "/status-chart",
      featureFlag: "statusChart",
    },
    {
      icon: faTimeline,
      title: "Event Timeline",
      description: "Chronological event history",
      path: "/timeline",
      featureFlag: "eventTimeline",
    },
    {
      icon: faRobot,
      title: "COBRA AI",
      description: "AI-powered assistance and insights",
      path: "/ai",
      featureFlag: "cobraAi",
    },
  ];

  // Filter and enhance tools based on feature flags
  const tools = allTools
    .filter((tool) => !tool.featureFlag || isVisible(tool.featureFlag))
    .map((tool) => {
      if (tool.featureFlag && isComingSoon(tool.featureFlag)) {
        return { ...tool, disabled: true, badge: "Coming Soon" };
      }
      return tool;
    });

  return (
    <Container maxWidth={false} disableGutters>
      <Stack spacing={4} padding={CobraStyles.Padding.MainWindow}>
        {/* Event Header */}
        <Card>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 3 }}>
              {/* Event Icon */}
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: 2,
                  backgroundColor: categoryColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <FontAwesomeIcon icon={EventIcon} size="2x" style={{ color: "white" }} />
              </Box>

              {/* Event Details */}
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Chip
                    label={currentEvent.primaryCategory?.name || "Event"}
                    size="small"
                    sx={{ backgroundColor: categoryColor, color: "white" }}
                  />
                  {currentEvent.isArchived && (
                    <Chip label="Archived" size="small" color="default" />
                  )}
                </Box>

                <Typography variant="h4" sx={{ mb: 1 }}>
                  {currentEvent.name}
                </Typography>

                {currentEvent.description && (
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                    {currentEvent.description}
                  </Typography>
                )}

                <Stack direction="row" spacing={3} flexWrap="wrap">
                  {currentEvent.location && (
                    <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <FontAwesomeIcon icon={faMapMarkerAlt} />
                      {currentEvent.location}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <FontAwesomeIcon icon={faCalendarAlt} />
                    Created {new Date(currentEvent.createdAt).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <FontAwesomeIcon icon={faUser} />
                    {currentEvent.createdBy}
                  </Typography>
                </Stack>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Divider />

        {/* Tools Section */}
        <Box>
          <Typography variant="h5" sx={{ mb: 3 }}>
            Tools
          </Typography>
          <Grid container spacing={2}>
            {tools.map((tool) => (
              <Grid item xs={12} sm={6} md={4} key={tool.title}>
                <ToolCard {...tool} />
              </Grid>
            ))}
          </Grid>
        </Box>
      </Stack>
    </Container>
  );
};

export default EventLandingPage;
