/**
 * Breadcrumb Component - Navigation Trail
 *
 * Implements C5-style breadcrumb navigation showing:
 * - Home / Events / [Event Name] / [Tool] / [View]
 *
 * Auto-generates breadcrumbs based on current route and event context.
 *
 * Features:
 * - Clickable links for navigation
 * - Current item (last) is not a link
 * - Light gray background per C5 theme
 * - Dynamic event name from context
 */

import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Box, Typography, Link, Stack } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome } from "@fortawesome/free-solid-svg-icons";
import { useEvents } from "../../hooks/useEvents";
import CobraStyles from "../../theme/CobraStyles";

export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: typeof faHome;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  customLabel?: string; // For dynamic labels like checklist names
}

/**
 * Generate breadcrumbs based on current route
 */
const useAutoBreadcrumbs = (customLabel?: string): BreadcrumbItem[] => {
  const location = useLocation();
  const { currentEvent } = useEvents();
  const pathParts = location.pathname.split("/").filter(Boolean);

  const items: BreadcrumbItem[] = [
    { label: "Home", path: "/events", icon: faHome },
  ];

  // If we're at root, redirect to events
  if (pathParts.length === 0) {
    return [{ label: "Home", icon: faHome }];
  }

  // Events list page
  if (pathParts[0] === "events") {
    if (pathParts.length === 1) {
      // /events - just show Events as current
      items.push({ label: "Events" });
    } else {
      // /events/:eventId - Event landing page
      items.push({ label: "Events", path: "/events" });
      if (currentEvent) {
        items.push({ label: currentEvent.name });
      } else {
        items.push({ label: "Event" });
      }
    }
    return items;
  }

  // Checklist tool routes - always include Events and Event Name
  if (pathParts[0] === "checklists") {
    items.push({ label: "Events", path: "/events" });

    // Add event name if available
    if (currentEvent) {
      items.push({ label: currentEvent.name, path: `/events/${currentEvent.id}` });
    }

    // /checklists redirects to dashboard, so treat as dashboard
    if (pathParts.length === 1) {
      items.push({ label: "Checklist" });
      return items;
    }

    // Dashboard is the main checklist page
    if (pathParts[1] === "dashboard") {
      items.push({ label: "Checklist" });
      return items;
    }

    items.push({ label: "Checklist", path: "/checklists" });

    // Checklist sub-routes
    if (pathParts[1] === "manage") {
      if (pathParts.length === 2) {
        items.push({ label: "Manage" });
      } else {
        items.push({ label: "Manage", path: "/checklists/manage" });
        // Template sub-routes
        if (pathParts[2] === "templates") {
          if (pathParts[3] === "new") {
            items.push({ label: "Create Template" });
          } else if (pathParts[4] === "edit") {
            items.push({ label: customLabel || "Edit Template" });
          } else if (pathParts[4] === "preview") {
            items.push({ label: customLabel || "Preview" });
          } else if (pathParts[4] === "duplicate") {
            items.push({ label: customLabel || "Duplicate" });
          }
        }
      }
    } else if (pathParts[1] === "instances") {
      items.push({ label: "Manage Checklists" });
    } else if (pathParts[1] === "analytics") {
      items.push({ label: "Analytics" });
    } else if (pathParts[1]) {
      // Checklist detail page: /checklists/:checklistId
      items.push({ label: "Dashboard", path: "/checklists/dashboard" });
      items.push({ label: customLabel || "Checklist" });
    }

    return items;
  }

  // Item library standalone
  if (pathParts[0] === "item-library") {
    items.push({ label: "Events", path: "/events" });
    if (currentEvent) {
      items.push({ label: currentEvent.name, path: `/events/${currentEvent.id}` });
    }
    items.push({ label: "Checklist", path: "/checklists" });
    items.push({ label: "Item Library" });
    return items;
  }

  // Manage checklists standalone
  if (pathParts[0] === "manage-checklists") {
    items.push({ label: "Events", path: "/events" });
    if (currentEvent) {
      items.push({ label: currentEvent.name, path: `/events/${currentEvent.id}` });
    }
    items.push({ label: "Checklist", path: "/checklists" });
    items.push({ label: "Manage Checklists" });
    return items;
  }

  // Other placeholder tools
  const toolMap: Record<string, string> = {
    chat: "Chat",
    map: "Map",
    "status-chart": "Status Chart",
    files: "Files",
    timeline: "Event Timeline",
    ai: "COBRA AI",
  };

  if (toolMap[pathParts[0]]) {
    items.push({ label: "Events", path: "/events" });
    if (currentEvent) {
      items.push({ label: currentEvent.name, path: `/events/${currentEvent.id}` });
    }
    items.push({ label: toolMap[pathParts[0]] });
    return items;
  }

  return items;
};

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items: providedItems, customLabel }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const autoItems = useAutoBreadcrumbs(customLabel);

  // Use provided items if available, otherwise auto-generate
  const items = providedItems && providedItems.length > 0 ? providedItems : autoItems;

  const handleClick = (path?: string) => {
    if (path) {
      navigate(path);
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: theme.palette.breadcrumb.background,
        pl: `${CobraStyles.Padding.MainWindow}px`,
        pr: 2,
        py: 1,
        borderBottom: `1px solid ${theme.palette.divider}`,
        minHeight: 40,
        display: "flex",
        alignItems: "center",
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ flexWrap: "wrap" }}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isClickable = !!item.path && !isLast;

          return (
            <React.Fragment key={index}>
              {/* Separator (except for first item) */}
              {index > 0 && (
                <Typography
                  component="span"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: 12,
                    mx: 0.5,
                  }}
                >
                  /
                </Typography>
              )}

              {/* Breadcrumb Item */}
              {isClickable ? (
                <Link
                  component="button"
                  onClick={() => handleClick(item.path)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    color: theme.palette.buttonPrimary.main,
                    textDecoration: "none",
                    fontSize: 14,
                    fontWeight: 400,
                    cursor: "pointer",
                    "&:hover": {
                      textDecoration: "underline",
                    },
                  }}
                >
                  {item.icon && <FontAwesomeIcon icon={item.icon} size="sm" />}
                  {item.label}
                </Link>
              ) : (
                <Typography
                  component="span"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    color: isLast
                      ? theme.palette.text.primary
                      : theme.palette.text.secondary,
                    fontSize: 14,
                    fontWeight: isLast ? 500 : 400,
                  }}
                >
                  {item.icon && <FontAwesomeIcon icon={item.icon} size="sm" />}
                  {item.label}
                </Typography>
              )}
            </React.Fragment>
          );
        })}
      </Stack>
    </Box>
  );
};

// Legacy export for backward compatibility
export const useBreadcrumbs = useAutoBreadcrumbs;

export default Breadcrumb;
