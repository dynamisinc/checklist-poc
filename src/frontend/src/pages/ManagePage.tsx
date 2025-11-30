/**
 * Manage Page - Admin Hub for Templates and Items
 *
 * Combines Template Library and Item Library into a tabbed interface.
 * Only accessible to users with Manage role.
 *
 * Implements C5 pattern of grouping admin functions under "Manage" section.
 *
 * Note: This component renders content only - AppLayout wrapper is provided
 * by the parent route in App.tsx to avoid nested breadcrumbs.
 */

import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Container,
  Stack,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClipboardList,
  faBoxArchive,
  faGear,
} from "@fortawesome/free-solid-svg-icons";
import CobraStyles from "../theme/CobraStyles";

// Import the content from existing pages (we'll refactor these to be embeddable)
import { TemplateLibraryContent } from "./TemplateLibraryContent";
import { ItemLibraryContent } from "./ItemLibraryContent";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`manage-tabpanel-${index}`}
      aria-labelledby={`manage-tab-${index}`}
      sx={{ pt: 3 }}
    >
      {value === index && children}
    </Box>
  );
};

const a11yProps = (index: number) => {
  return {
    id: `manage-tab-${index}`,
    "aria-controls": `manage-tabpanel-${index}`,
  };
};

export const ManagePage: React.FC = () => {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get initial tab from URL param or default to 0
  const initialTab = searchParams.get("tab") === "items" ? 1 : 0;
  const [activeTab, setActiveTab] = useState(initialTab);

  // Update URL when tab changes
  useEffect(() => {
    const tabParam = activeTab === 1 ? "items" : "templates";
    setSearchParams({ tab: tabParam }, { replace: true });
  }, [activeTab, setSearchParams]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Note: Permission check is handled by ProtectedRoute in App.tsx

  return (
    <Container maxWidth={false} disableGutters>
        <Stack spacing={0} padding={CobraStyles.Padding.MainWindow}>
          {/* Page Header */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h4" sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <FontAwesomeIcon icon={faGear} />
              Manage
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Manage checklist templates and reusable items
            </Typography>
          </Box>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              aria-label="Manage tabs"
              sx={{
                "& .MuiTab-root": {
                  minHeight: 48,
                  textTransform: "none",
                  fontWeight: 500,
                  fontSize: 14,
                },
                "& .Mui-selected": {
                  color: theme.palette.buttonPrimary.main,
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: theme.palette.buttonPrimary.main,
                  height: 3,
                },
              }}
            >
              <Tab
                icon={<FontAwesomeIcon icon={faClipboardList} />}
                iconPosition="start"
                label="Templates"
                {...a11yProps(0)}
              />
              <Tab
                icon={<FontAwesomeIcon icon={faBoxArchive} />}
                iconPosition="start"
                label="Item Library"
                {...a11yProps(1)}
              />
            </Tabs>
          </Box>

          {/* Tab Panels */}
          <TabPanel value={activeTab} index={0}>
            <TemplateLibraryContent />
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <ItemLibraryContent />
          </TabPanel>
        </Stack>
      </Container>
  );
};

export default ManagePage;
