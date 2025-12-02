/**
 * SectionHeader Component
 *
 * Displays a visual section header for operational period grouping.
 * Provides different styling based on section importance:
 * - Current Period: Bold, Cobalt Blue background, prominent
 * - Incident-Level: WhiteBlue background, medium emphasis
 * - Previous Periods: Light gray background, low emphasis
 */

import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClock,
  faClipboardList,
  faFolderOpen,
} from '@fortawesome/free-solid-svg-icons';
import type { SectionType } from '../hooks/useOperationalPeriodGrouping';
import { cobraTheme } from '../../../theme/cobraTheme';

/**
 * Props for SectionHeader
 */
interface SectionHeaderProps {
  type: SectionType;
  title: string;
  subtitle?: string;
  checklistCount: number;
  averageProgress?: number;
}

/**
 * Get section styling based on type
 */
const getSectionStyle = (type: SectionType) => {
  switch (type) {
    case 'current':
      return {
        backgroundColor: cobraTheme.palette.buttonPrimary.main,
        color: 'white',
        fontWeight: 'bold',
        icon: faClock,
        iconColor: 'white',
      };
    case 'incident':
      return {
        backgroundColor: cobraTheme.palette.action.selected,
        color: 'text.primary',
        fontWeight: 'normal',
        icon: faClipboardList,
        iconColor: cobraTheme.palette.buttonPrimary.main,
      };
    case 'previous':
      return {
        backgroundColor: cobraTheme.palette.background.default,
        color: 'text.secondary',
        fontWeight: 'normal',
        icon: faFolderOpen,
        iconColor: cobraTheme.palette.text.secondary,
      };
  }
};

/**
 * Get section label
 */
const getSectionLabel = (type: SectionType): string => {
  switch (type) {
    case 'current':
      return 'CURRENT OPERATIONAL PERIOD';
    case 'incident':
      return 'INCIDENT-LEVEL CHECKLISTS';
    case 'previous':
      return 'PREVIOUS OPERATIONAL PERIOD';
  }
};

/**
 * SectionHeader Component
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  type,
  title,
  subtitle,
  checklistCount,
  averageProgress,
}) => {
  const style = getSectionStyle(type);
  const label = getSectionLabel(type);

  return (
    <Box
      sx={{
        py: 2,
        px: 3,
        backgroundColor: style.backgroundColor,
        color: style.color,
        borderRadius: 1,
        mb: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Left side: Icon, Label, and Title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <FontAwesomeIcon
          icon={style.icon}
          style={{
            color: style.iconColor,
            fontSize: '1.25rem',
          }}
        />
        <Box>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              fontWeight: style.fontWeight,
              letterSpacing: '0.05em',
              opacity: type === 'current' ? 1 : 0.7,
            }}
          >
            {label}
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: style.fontWeight,
              fontSize: '1.1rem',
              mt: 0.25,
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mt: 0.25,
                opacity: 0.8,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Right side: Metadata chips */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        {/* Checklist count */}
        <Chip
          label={`${checklistCount} checklist${checklistCount !== 1 ? 's' : ''}`}
          size="small"
          sx={{
            backgroundColor:
              type === 'current' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
            color: type === 'current' ? 'white' : 'text.primary',
            fontWeight: type === 'current' ? 'bold' : 'normal',
            fontSize: '0.75rem',
          }}
        />

        {/* Average progress (if provided) */}
        {averageProgress !== undefined && (
          <Chip
            label={`${averageProgress}% avg`}
            size="small"
            sx={{
              backgroundColor:
                type === 'current'
                  ? 'rgba(255,255,255,0.2)'
                  : 'rgba(0,0,0,0.05)',
              color: type === 'current' ? 'white' : 'text.primary',
              fontWeight: type === 'current' ? 'bold' : 'normal',
              fontSize: '0.75rem',
            }}
          />
        )}
      </Box>
    </Box>
  );
};
