/**
 * Checklist Tool Page
 *
 * Landing page for the Checklist tool within an event.
 * Provides navigation to:
 * - Dashboard (My Checklists)
 * - Manage Templates (Template Library + Item Library)
 * - Manage Checklists (Archive/Restore/Delete instances)
 * - Analytics
 *
 * Route: /checklists (when accessed as tool landing, not dashboard)
 * Breadcrumb: Home / Events / [Event Name] / Checklist
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  Card,
  CardActionArea,
  Grid,
  Chip,
  Stack,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClipboardList,
  faGear,
  faChartLine,
  faBoxArchive,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import { usePermissions } from "../hooks/usePermissions";
import { useEvents } from "../hooks/useEvents";
import CobraStyles from "../theme/CobraStyles";
import { useTheme } from "@mui/material/styles";

interface NavCardProps {
  icon: typeof faClipboardList;
  title: string;
  description: string;
  path: string;
  disabled?: boolean;
  requiresPermission?: boolean;
}

const NavCard: React.FC<NavCardProps> = ({
  icon,
  title,
  description,
  path,
  disabled,
  requiresPermission = true,
}) => {
  const navigate = useNavigate();
  const theme = useTheme();

  const isDisabled = disabled || !requiresPermission;

  return (
    <Card
      sx={{
        height: "100%",
        opacity: isDisabled ? 0.5 : 1,
        "&:hover": isDisabled ? {} : { boxShadow: 4 },
      }}
    >
      <CardActionArea
        onClick={() => !isDisabled && navigate(path)}
        disabled={isDisabled}
        sx={{ height: "100%", p: 3 }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                backgroundColor: isDisabled
                  ? theme.palette.grey[200]
                  : theme.palette.buttonPrimary.light,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FontAwesomeIcon
                icon={icon}
                size="xl"
                style={{
                  color: isDisabled
                    ? theme.palette.grey[500]
                    : theme.palette.buttonPrimary.main,
                }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight={600}>
                {title}
              </Typography>
              {disabled && (
                <Chip label="Coming Soon" size="small" sx={{ mt: 0.5 }} />
              )}
              {!requiresPermission && !disabled && (
                <Chip label="No Access" size="small" color="warning" sx={{ mt: 0.5 }} />
              )}
            </Box>
            {!isDisabled && (
              <FontAwesomeIcon
                icon={faArrowRight}
                style={{ color: theme.palette.text.secondary }}
              />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
            {description}
          </Typography>
        </Box>
      </CardActionArea>
    </Card>
  );
};

/**
 * Checklist Tool Page Component
 */
export const ChecklistToolPage: React.FC = () => {
  const permissions = usePermissions();
  const { currentEvent } = useEvents();

  const navItems = [
    {
      icon: faClipboardList,
      title: "Dashboard",
      description: "View and work on checklists assigned to you. Track progress and complete items in real-time.",
      path: "/checklists/dashboard",
      disabled: false,
      requiresPermission: true,
    },
    {
      icon: faGear,
      title: "Manage Templates",
      description: "Create and edit checklist templates. Manage the item library for reusable checklist items.",
      path: "/checklists/manage",
      disabled: false,
      requiresPermission: permissions.canViewTemplateLibrary,
    },
    {
      icon: faBoxArchive,
      title: "Manage Checklists",
      description: "View archived checklists. Restore or permanently delete checklist instances.",
      path: "/checklists/instances",
      disabled: false,
      requiresPermission: permissions.canManageArchivedChecklists,
    },
    {
      icon: faChartLine,
      title: "Analytics",
      description: "View progress reports, completion trends, and workload analysis across all checklists.",
      path: "/checklists/analytics",
      disabled: true,
      requiresPermission: true,
    },
  ];

  return (
    <Container maxWidth={false} disableGutters>
      <Stack spacing={4} padding={CobraStyles.Padding.MainWindow}>
        {/* Page Header */}
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
            <FontAwesomeIcon icon={faClipboardList} size="lg" />
            <Typography variant="h4">Checklist</Typography>
          </Box>
          <Typography variant="body1" color="text.secondary">
            {currentEvent
              ? `Checklist tool for "${currentEvent.name}"`
              : "Manage operational checklists and templates"}
          </Typography>
        </Box>

        {/* Navigation Cards */}
        <Grid container spacing={3}>
          {navItems.map((item) => (
            <Grid item xs={12} sm={6} key={item.title}>
              <NavCard {...item} />
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Container>
  );
};

export default ChecklistToolPage;
