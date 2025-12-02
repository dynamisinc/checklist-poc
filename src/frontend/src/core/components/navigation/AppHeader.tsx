/**
 * AppHeader Component - Top Navigation Bar
 *
 * Implements C5-style header with:
 * - App branding (left)
 * - Event selector (left, after branding)
 * - Profile menu (right)
 * - Mobile menu toggle
 *
 * Height: 54px (theme.cssStyling.headerHeight)
 */

import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import { ProfileMenu } from "../ProfileMenu";
import { EventSelector, CreateEventDialog } from "../../../shared/events";
import { PermissionRole } from "../../../types";

interface AppHeaderProps {
  onMobileMenuToggle?: () => void;
  onProfileChange?: (positions: string[], role: PermissionRole) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onMobileMenuToggle,
  onProfileChange,
}) => {
  const theme = useTheme();
  const [createEventOpen, setCreateEventOpen] = useState(false);

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          backgroundColor: theme.palette.buttonPrimary.main,
          boxShadow: 2,
          height: theme.cssStyling.headerHeight,
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar
          sx={{
            minHeight: `${theme.cssStyling.headerHeight}px !important`,
            height: theme.cssStyling.headerHeight,
          }}
        >
          {/* Mobile Menu Toggle */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={onMobileMenuToggle}
            sx={{
              mr: 2,
              display: { md: "none" },
              color: "#FFFACD",
            }}
          >
            <FontAwesomeIcon icon={faBars} />
          </IconButton>

          {/* App Logo/Name */}
          <Typography
            variant="h6"
            noWrap
            sx={{
              fontWeight: "bold",
              color: "#FFFACD",
              mr: 3,
              display: { xs: "none", sm: "block" },
            }}
          >
            COBRA POC
          </Typography>

          {/* Event Selector - Left aligned */}
          <EventSelector onCreateEventClick={() => setCreateEventOpen(true)} />

          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Right: Profile Menu */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {onProfileChange && (
              <ProfileMenu onProfileChange={onProfileChange} />
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Create Event Dialog */}
      <CreateEventDialog
        open={createEventOpen}
        onClose={() => setCreateEventOpen(false)}
      />
    </>
  );
};

export default AppHeader;
