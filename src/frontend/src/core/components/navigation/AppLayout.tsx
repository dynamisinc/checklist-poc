/**
 * AppLayout Component - Main Application Layout
 *
 * Implements COBRA-style layout with:
 * - Fixed top header (54px)
 * - Collapsible left sidebar (64px closed, 288px open)
 * - Breadcrumb navigation
 * - Main content area
 *
 * Usage:
 * <AppLayout breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Current' }]}>
 *   <YourPageContent />
 * </AppLayout>
 */

import React, { useState, useEffect } from "react";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { AppHeader } from "./AppHeader";
import { Sidebar } from "./Sidebar";
import { Breadcrumb, BreadcrumbItem } from "./Breadcrumb";
import { PermissionRole } from "../../../types";

interface AppLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  hideBreadcrumb?: boolean;
}

// Key for localStorage persistence
const SIDEBAR_STATE_KEY = "dynamis-sidebar-open";

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  breadcrumbs = [],
  hideBreadcrumb = false,
}) => {
  const theme = useTheme();

  // Sidebar state with localStorage persistence
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_STATE_KEY);
    return saved !== null ? saved === "true" : true; // Default open
  });

  // Mobile drawer state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STATE_KEY, String(sidebarOpen));
  }, [sidebarOpen]);

  const handleSidebarToggle = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleMobileMenuToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleMobileClose = () => {
    setMobileOpen(false);
  };

  const handleProfileChange = (role: PermissionRole) => {
    console.log("[AppLayout] Profile changed - Role:", role);
  };

  // Calculate content margin based on sidebar state
  const drawerWidth = sidebarOpen
    ? theme.cssStyling.drawerOpenWidth
    : theme.cssStyling.drawerClosedWidth;

  return (
    <Box sx={{ minHeight: "100vh" }} data-testid="app-layout">
      {/* Top Header */}
      <AppHeader
        onMobileMenuToggle={handleMobileMenuToggle}
        onProfileChange={handleProfileChange}
      />

      {/* Left Sidebar - Desktop */}
      <Sidebar
        open={sidebarOpen}
        onToggle={handleSidebarToggle}
      />

      {/* Left Sidebar - Mobile */}
      <Sidebar
        open={true}
        onToggle={handleSidebarToggle}
        mobileOpen={mobileOpen}
        onMobileClose={handleMobileClose}
      />

      {/* Main Content Area - contains breadcrumb + workspace */}
      <Box
        component="main"
        data-testid="main-content"
        sx={{
          display: "flex",
          flexDirection: "column",
          backgroundColor: theme.palette.background.default,
          // Account for header height
          pt: `${theme.cssStyling.headerHeight}px`,
          // Account for left sidebar width with margin
          ml: {
            xs: 0,
            md: `${drawerWidth}px`,
          },
          transition: theme.transitions.create(["margin"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          height: "100vh",
          overflow: "hidden", // Prevent double scrollbars
        }}
      >
        {/* Breadcrumb Navigation - fixed outside scroll area */}
        {!hideBreadcrumb && (
          <Breadcrumb items={breadcrumbs.length > 0 ? breadcrumbs : undefined} />
        )}

        {/* Workspace - scrollable content area */}
        <Box
          data-testid="workspace-content"
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            overflowX: "hidden",
            p: 2,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;
