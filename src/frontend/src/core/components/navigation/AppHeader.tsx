/**
 * AppHeader Component - Top Navigation Bar
 *
 * Implements COBRA-style header with:
 * - App branding (left)
 * - Profile menu (right)
 * - Mobile menu toggle
 *
 * Height: 54px (theme.cssStyling.headerHeight)
 */

import React from "react";
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
import { PermissionRole } from "../../../types";

interface AppHeaderProps {
  onMobileMenuToggle?: () => void;
  onProfileChange?: (role: PermissionRole) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onMobileMenuToggle,
  onProfileChange,
}) => {
  const theme = useTheme();

  return (
    <AppBar
      position="fixed"
      data-testid="app-header"
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
          data-testid="mobile-menu-toggle"
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
          data-testid="app-title"
          sx={{
            fontWeight: "bold",
            color: "#FFFACD",
            mr: 3,
            display: { xs: "none", sm: "block" },
          }}
        >
          Dynamis Reference App
        </Typography>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Right: Profile Menu */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {onProfileChange && (
            <ProfileMenu onProfileChange={onProfileChange} />
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default AppHeader;
