/**
 * App Component - Main Application Entry Point
 *
 * Sets up routing and global layout for the COBRA Checklist POC.
 * Uses BrowserRouter for clean URLs (not hash routing).
 */

import React, { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
} from "react-router-dom";
import { Box, AppBar, Toolbar, Typography, Button, Divider } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClipboardList,
  faBook,
  faBoxArchive,
} from "@fortawesome/free-solid-svg-icons";
import { LandingPage } from "./pages/LandingPage";
import { ChecklistDetailPage } from "./pages/ChecklistDetailPage";
import { TemplateLibraryPage } from "./pages/TemplateLibraryPage";
import { TemplateEditorPage } from "./pages/TemplateEditorPage";
import { TemplatePreviewPage } from "./pages/TemplatePreviewPage";
import { ItemLibraryPage } from "./pages/ItemLibraryPage";
import { ProfileMenu } from "./components/ProfileMenu";
import { EventSelector } from "./components/EventSelector";
import { CreateEventDialog } from "./components/CreateEventDialog";
import { usePermissions } from "./hooks/usePermissions";
import { PermissionRole } from "./types";
import { cobraTheme } from "./theme/cobraTheme";

interface AppNavBarProps {
  onProfileChange: (positions: string[], role: PermissionRole) => void;
  onCreateEventClick: () => void;
}

/**
 * App Navigation Bar
 */
const AppNavBar: React.FC<AppNavBarProps> = ({ onProfileChange, onCreateEventClick }) => {
  const location = useLocation();
  const permissions = usePermissions();

  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: cobraTheme.palette.buttonPrimary.main,
        boxShadow: 2,
      }}
    >
      <Toolbar>
        <FontAwesomeIcon
          icon={faClipboardList}
          size="lg"
          style={{ marginRight: 16 }}
        />
        <Typography variant="h6" sx={{ fontWeight: "bold", color: "#FFFACD", mr: 2 }}>
          COBRA Checklist
        </Typography>

        {/* Event Selector */}
        <EventSelector onCreateEventClick={onCreateEventClick} />

        {/* Vertical divider */}
        <Divider
          orientation="vertical"
          flexItem
          sx={{ mx: 2, borderColor: "rgba(255, 250, 205, 0.3)" }}
        />

        {/* Navigation Links */}
        <Box sx={{ flexGrow: 1, display: "flex", gap: 2 }}>
          {/* My Checklists - visible to all except None */}
          <Button
            component={Link}
            to="/checklists"
            sx={{
              color: "#FFFACD",
              fontWeight:
                location.pathname === "/checklists" ? "bold" : "normal",
              textDecoration:
                location.pathname === "/checklists" ? "underline" : "none",
              "&:hover": {
                backgroundColor: "rgba(255, 250, 205, 0.1)",
              },
            }}
          >
            <FontAwesomeIcon
              icon={faClipboardList}
              style={{ marginRight: 8 }}
            />
            My Checklists
          </Button>

          {/* Template Library - only visible to Manage role */}
          {permissions.canViewTemplateLibrary && (
            <Button
              component={Link}
              to="/templates"
              sx={{
                color: "#FFFACD",
                fontWeight:
                  location.pathname === "/templates" ? "bold" : "normal",
                textDecoration:
                  location.pathname === "/templates" ? "underline" : "none",
                "&:hover": {
                  backgroundColor: "rgba(255, 250, 205, 0.1)",
                },
              }}
            >
              <FontAwesomeIcon icon={faBook} style={{ marginRight: 8 }} />
              Template Library
            </Button>
          )}

          {/* Item Library - only visible to Manage role */}
          {permissions.canAccessItemLibrary && (
            <Button
              component={Link}
              to="/item-library"
              sx={{
                color: "#FFFACD",
                fontWeight:
                  location.pathname === "/item-library" ? "bold" : "normal",
                textDecoration:
                  location.pathname === "/item-library" ? "underline" : "none",
                "&:hover": {
                  backgroundColor: "rgba(255, 250, 205, 0.1)",
                },
              }}
            >
              <FontAwesomeIcon icon={faBoxArchive} style={{ marginRight: 8 }} />
              Item Library
            </Button>
          )}
        </Box>

        <ProfileMenu onProfileChange={onProfileChange} />
      </Toolbar>
    </AppBar>
  );
};

/**
 * Main App Component
 */
function App() {
  // State to trigger re-renders when profile or event changes
  const [appKey, setAppKey] = useState(0);
  const [createEventDialogOpen, setCreateEventDialogOpen] = useState(false);

  /**
   * Handle profile change from ProfileMenu
   * Note: The profileChanged event is already dispatched by saveProfile in ProfileMenu,
   * so we don't dispatch it here to avoid duplicate network requests.
   */
  const handleProfileChange = (positions: string[], role: PermissionRole) => {
    console.log("[App] Profile changed - Positions:", positions, "Role:", role);
    // Increment key to force re-render of routes
    setAppKey((prev) => prev + 1);
  };

  /**
   * Handle event creation dialog
   */
  const handleCreateEventClick = () => {
    setCreateEventDialogOpen(true);
  };

  /**
   * Handle event created - refresh app
   */
  const handleEventCreated = () => {
    console.log("[App] Event created - refreshing");
    setAppKey((prev) => prev + 1);
  };

  return (
    <BrowserRouter>
      <Box sx={{ minHeight: "100vh", backgroundColor: "#F5F5F5" }}>
        <AppNavBar
          onProfileChange={handleProfileChange}
          onCreateEventClick={handleCreateEventClick}
        />

        {/* Create Event Dialog */}
        <CreateEventDialog
          open={createEventDialogOpen}
          onClose={() => setCreateEventDialogOpen(false)}
          onEventCreated={handleEventCreated}
        />

        <Routes key={appKey}>
          {/* Default route - redirect to My Checklists */}
          <Route path="/" element={<Navigate to="/checklists" replace />} />

          {/* My Checklists page - uses variant switcher */}
          <Route path="/checklists" element={<LandingPage />} />

          {/* Checklist Detail page */}
          <Route
            path="/checklists/:checklistId"
            element={<ChecklistDetailPage />}
          />

          {/* Template Library page */}
          <Route path="/templates" element={<TemplateLibraryPage />} />

          {/* Item Library page */}
          <Route path="/item-library" element={<ItemLibraryPage />} />

          {/* Create New Template */}
          <Route path="/templates/new" element={<TemplateEditorPage />} />

          {/* Preview Template */}
          <Route
            path="/templates/:templateId/preview"
            element={<TemplatePreviewPage />}
          />

          {/* Duplicate Template */}
          <Route
            path="/templates/:templateId/duplicate"
            element={<TemplateEditorPage />}
          />

          {/* Edit Existing Template */}
          <Route
            path="/templates/:templateId/edit"
            element={<TemplateEditorPage />}
          />

          {/* Catch-all route - redirect to My Checklists */}
          <Route path="*" element={<Navigate to="/checklists" replace />} />
        </Routes>
      </Box>
    </BrowserRouter>
  );
}

export default App;
