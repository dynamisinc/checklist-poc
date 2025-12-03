/**
 * Sidebar Component - Collapsible Left Navigation
 *
 * Implements C5-style left sidebar with:
 * - Collapsible icon rail (64px closed, 288px open)
 * - Tools section with navigation items
 * - Placeholder tools for future implementation
 *
 * Based on C5 Logbook/Dashboard navigation pattern.
 */

import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClipboardList,
  faChevronLeft,
  faChevronRight,
  faComments,
  faTableCells,
  faTimeline,
  faRobot,
  faCalendarAlt,
  faListCheck,
  faBrain,
  faFileLines,
  faGear,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { usePermissions } from "../../../shared/hooks/usePermissions";
import { useFeatureFlags } from "../../../admin/contexts/FeatureFlagsContext";
import type { FeatureFlags } from "../../../admin/types/featureFlags";

interface NavItem {
  id: string;
  label: string;
  icon: IconDefinition;
  path: string;
  featureFlag?: keyof FeatureFlags; // Maps to feature flag key
  disabled?: boolean;
  badge?: string;
}

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  open,
  onToggle,
  mobileOpen = false,
  onMobileClose,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const permissions = usePermissions();
  const { isVisible, isComingSoon } = useFeatureFlags();

  const drawerWidth = open
    ? theme.cssStyling.drawerOpenWidth
    : theme.cssStyling.drawerClosedWidth;

  // Top-level navigation item
  const topNavItem: NavItem = {
    id: "events",
    label: "Events",
    icon: faCalendarAlt,
    path: "/events",
  };

  // Tools navigation items - matches C5 pattern
  // Feature flags control visibility and enabled state
  const allToolItems: NavItem[] = [
    {
      id: "checklist",
      label: "Checklist",
      icon: faClipboardList,
      path: "/checklists/dashboard",
      featureFlag: "checklist",
    },
    {
      id: "chat",
      label: "Chat",
      icon: faComments,
      path: "/chat/dashboard",
      featureFlag: "chat",
    },
    {
      id: "tasking",
      label: "Tasking",
      icon: faListCheck,
      path: "/tasking",
      featureFlag: "tasking",
    },
    {
      id: "cobra-kai",
      label: "COBRA KAI",
      icon: faBrain,
      path: "/cobra-kai",
      featureFlag: "cobraKai",
    },
    {
      id: "event-summary",
      label: "Event Summary",
      icon: faFileLines,
      path: "/event-summary",
      featureFlag: "eventSummary",
    },
    {
      id: "status-chart",
      label: "Status Chart",
      icon: faTableCells,
      path: "/status-chart",
      featureFlag: "statusChart",
    },
    {
      id: "event-timeline",
      label: "Event Timeline",
      icon: faTimeline,
      path: "/timeline",
      featureFlag: "eventTimeline",
    },
    {
      id: "cobra-ai",
      label: "COBRA AI",
      icon: faRobot,
      path: "/ai",
      featureFlag: "cobraAi",
    },
  ];

  // Filter and enhance tools based on feature flags
  const toolItems = allToolItems
    .filter((item) => !item.featureFlag || isVisible(item.featureFlag))
    .map((item) => {
      if (item.featureFlag && isComingSoon(item.featureFlag)) {
        return { ...item, disabled: true, badge: "Coming Soon" };
      }
      return item;
    });

  // Admin navigation item - only visible for Manage role
  const adminNavItem: NavItem = {
    id: "admin",
    label: "Admin",
    icon: faGear,
    path: "/admin",
  };

  const handleNavClick = (item: NavItem) => {
    if (item.disabled) return;
    navigate(item.path);
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
  };

  const isActive = (path: string) => {
    if (path === "/events") {
      // Events is active for /events routes
      return location.pathname === "/events" ||
        location.pathname.startsWith("/events/");
    }
    if (path === "/checklists/dashboard") {
      // Checklist tool is active for all /checklists/* routes
      return location.pathname.startsWith("/checklists");
    }
    if (path === "/chat/dashboard") {
      // Chat tool is active for all /chat/* routes
      return location.pathname.startsWith("/chat");
    }
    return location.pathname.startsWith(path);
  };

  const drawerContent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: theme.palette.background.paper,
      }}
    >
      {/* Sidebar Header with collapse toggle */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: open ? "flex-end" : "center",
          px: open ? 1 : 0,
          py: 1,
          minHeight: theme.cssStyling.headerHeight,
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.primary.main,
        }}
      >
        <IconButton
          onClick={onToggle}
          size="small"
          sx={{
            color: theme.palette.primary.dark,
            "&:hover": {
              backgroundColor: theme.palette.primary.light,
            },
          }}
        >
          <FontAwesomeIcon
            icon={open ? faChevronLeft : faChevronRight}
            size="sm"
          />
        </IconButton>
      </Box>

      {/* Main Navigation */}
      <Box sx={{ flex: 1, pt: 1 }}>
        {/* Events Navigation Item */}
        <List sx={{ pt: 0, pb: 0 }}>
          <ListItem disablePadding sx={{ display: "block" }}>
            <Tooltip
              title={!open ? topNavItem.label : ""}
              placement="right"
              arrow
            >
              <ListItemButton
                onClick={() => handleNavClick(topNavItem)}
                sx={{
                  minHeight: 44,
                  justifyContent: open ? "flex-start" : "center",
                  px: 2,
                  mx: open ? 1 : 0.5,
                  my: 0.25,
                  borderRadius: 1,
                  backgroundColor: isActive(topNavItem.path)
                    ? theme.palette.grid.main
                    : "transparent",
                  borderLeft: isActive(topNavItem.path) && open
                    ? `3px solid ${theme.palette.buttonPrimary.main}`
                    : open ? "3px solid transparent" : "none",
                  "&:hover": {
                    backgroundColor: isActive(topNavItem.path)
                      ? theme.palette.grid.main
                      : theme.palette.grid.light,
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 2 : "auto",
                    justifyContent: "center",
                    color: isActive(topNavItem.path)
                      ? theme.palette.buttonPrimary.main
                      : theme.palette.text.primary,
                  }}
                >
                  <FontAwesomeIcon icon={topNavItem.icon} fixedWidth />
                </ListItemIcon>
                {open && (
                  <ListItemText
                    primary={topNavItem.label}
                    primaryTypographyProps={{
                      fontSize: 14,
                      fontWeight: isActive(topNavItem.path) ? 600 : 400,
                      color: isActive(topNavItem.path)
                        ? theme.palette.buttonPrimary.main
                        : theme.palette.text.primary,
                    }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        </List>

        {/* Tools Section Label */}
        {open && (
          <Typography
            variant="overline"
            sx={{
              px: 2,
              py: 1,
              display: "block",
              color: theme.palette.text.secondary,
              fontWeight: 600,
              letterSpacing: 1,
              fontSize: 11,
            }}
          >
            Tools
          </Typography>
        )}

        {/* Tool Navigation Items */}
        <List sx={{ pt: 0 }}>
          {toolItems.map((item) => {
            const active = isActive(item.path);

            return (
              <ListItem
                key={item.id}
                disablePadding
                sx={{ display: "block" }}
              >
                <Tooltip
                  title={!open ? (item.disabled ? `${item.label} (Coming Soon)` : item.label) : ""}
                  placement="right"
                  arrow
                >
                  <ListItemButton
                    onClick={() => handleNavClick(item)}
                    disabled={item.disabled}
                    sx={{
                      minHeight: 44,
                      justifyContent: open ? "flex-start" : "center",
                      px: 2,
                      mx: open ? 1 : 0.5,
                      my: 0.25,
                      borderRadius: 1,
                      backgroundColor: active
                        ? theme.palette.grid.main
                        : "transparent",
                      borderLeft: active && open
                        ? `3px solid ${theme.palette.buttonPrimary.main}`
                        : open ? "3px solid transparent" : "none",
                      opacity: item.disabled ? 0.5 : 1,
                      "&:hover": {
                        backgroundColor: item.disabled
                          ? "transparent"
                          : active
                            ? theme.palette.grid.main
                            : theme.palette.grid.light,
                      },
                      "&.Mui-disabled": {
                        opacity: 0.5,
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: open ? 2 : "auto",
                        justifyContent: "center",
                        color: active
                          ? theme.palette.buttonPrimary.main
                          : theme.palette.text.primary,
                      }}
                    >
                      <FontAwesomeIcon icon={item.icon} fixedWidth />
                    </ListItemIcon>
                    {open && (
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontSize: 14,
                          fontWeight: active ? 600 : 400,
                          color: active
                            ? theme.palette.buttonPrimary.main
                            : theme.palette.text.primary,
                        }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Admin Section - pinned to bottom, only visible for Manage role */}
      {permissions.canViewTemplateLibrary && (
        <Box
          sx={{
            borderTop: `1px solid ${theme.palette.divider}`,
            py: 1,
          }}
        >
          <List sx={{ pt: 0, pb: 0 }}>
            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip
                title={!open ? adminNavItem.label : ""}
                placement="right"
                arrow
              >
                <ListItemButton
                  onClick={() => handleNavClick(adminNavItem)}
                  sx={{
                    minHeight: 44,
                    justifyContent: open ? "flex-start" : "center",
                    px: 2,
                    mx: open ? 1 : 0.5,
                    my: 0.25,
                    borderRadius: 1,
                    backgroundColor: isActive(adminNavItem.path)
                      ? theme.palette.grid.main
                      : "transparent",
                    borderLeft: isActive(adminNavItem.path) && open
                      ? `3px solid ${theme.palette.buttonPrimary.main}`
                      : open ? "3px solid transparent" : "none",
                    "&:hover": {
                      backgroundColor: isActive(adminNavItem.path)
                        ? theme.palette.grid.main
                        : theme.palette.grid.light,
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: open ? 2 : "auto",
                      justifyContent: "center",
                      color: isActive(adminNavItem.path)
                        ? theme.palette.buttonPrimary.main
                        : theme.palette.text.primary,
                    }}
                  >
                    <FontAwesomeIcon icon={adminNavItem.icon} fixedWidth />
                  </ListItemIcon>
                  {open && (
                    <ListItemText
                      primary={adminNavItem.label}
                      primaryTypographyProps={{
                        fontSize: 14,
                        fontWeight: isActive(adminNavItem.path) ? 600 : 400,
                        color: isActive(adminNavItem.path)
                          ? theme.palette.buttonPrimary.main
                          : theme.palette.text.primary,
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          </List>
        </Box>
      )}
    </Box>
  );

  // Mobile drawer (temporary)
  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: theme.cssStyling.drawerOpenWidth,
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  // Desktop drawer (permanent)
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          borderRight: `1px solid ${theme.palette.divider}`,
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          overflowX: "hidden",
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;
