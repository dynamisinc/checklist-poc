/**
 * AppHeader Component - Top Navigation Bar
 *
 * Implements C5-style header with:
 * - App branding (left)
 * - Event selector (left, after branding)
 * - Chat sidebar toggle (right)
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
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faComments } from "@fortawesome/free-solid-svg-icons";
import { ProfileMenu } from "../ProfileMenu";
import { EventSelector, CreateEventDialog } from "../../../shared/events";
import { PermissionRole } from "../../../types";
import { useChatSidebar } from "../../../tools/chat";
import { useFeatureFlags } from "../../../admin";

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
  const { isOpen: chatSidebarOpen, toggleSidebar: toggleChatSidebar } = useChatSidebar();
  const { isVisible, isComingSoon, isActive } = useFeatureFlags();

  // Chat feature flag status
  const chatVisible = isVisible('chat');
  const chatComingSoon = isComingSoon('chat');
  const chatEnabled = isActive('chat');

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

          {/* Right: Chat Toggle + Profile Menu */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* Chat Sidebar Toggle - respects feature flag */}
            {chatVisible && (
              <Tooltip
                title={
                  chatComingSoon
                    ? "Chat - Coming Soon"
                    : chatSidebarOpen
                      ? "Close chat"
                      : "Open chat"
                }
              >
                <span>
                  <IconButton
                    onClick={chatEnabled ? toggleChatSidebar : undefined}
                    disabled={chatComingSoon}
                    sx={{
                      color: chatComingSoon
                        ? "rgba(255, 250, 205, 0.3)"
                        : chatSidebarOpen
                          ? "#FFFACD"
                          : "rgba(255, 250, 205, 0.7)",
                      "&:hover": chatEnabled
                        ? {
                            color: "#FFFACD",
                            backgroundColor: "rgba(255, 255, 255, 0.1)",
                          }
                        : undefined,
                      cursor: chatComingSoon ? "not-allowed" : "pointer",
                    }}
                  >
                    <FontAwesomeIcon icon={faComments} />
                  </IconButton>
                </span>
              </Tooltip>
            )}

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
