/**
 * ChecklistProgressBar Component
 *
 * A custom progress bar designed for checklist completion tracking.
 *
 * Features:
 * - High contrast design readable at all progress levels
 * - Smooth CSS transitions (not MUI's default animation from 0)
 * - Color-coded progress: red < 34%, yellow < 67%, blue < 100%, green = 100%
 * - Clear visual border/outline for visibility
 * - Percentage text inside bar for compact display
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { c5Colors } from '../../../theme/c5Theme';

interface ChecklistProgressBarProps {
  /** Current progress percentage (0-100) */
  value: number;
  /** Height of the progress bar in pixels */
  height?: number;
  /** Whether to show percentage text inside the bar */
  showPercentage?: boolean;
  /** Whether to show the count text (e.g., "5/10") */
  showCount?: boolean;
  /** Completed items count */
  completedItems?: number;
  /** Total items count */
  totalItems?: number;
}

/**
 * Get progress bar fill color based on percentage
 */
const getProgressColor = (percentage: number): string => {
  if (percentage === 100) return c5Colors.green; // Dark green for complete (#008000)
  if (percentage >= 67) return c5Colors.cobaltBlue;
  if (percentage >= 34) return c5Colors.canaryYellow;
  return c5Colors.lavaRed;
};

/**
 * Get contrasting text color for the progress bar
 */
const getTextColor = (percentage: number, isInsideBar: boolean): string => {
  if (!isInsideBar) return c5Colors.darkGray;

  // Text inside the filled portion
  if (percentage === 100) return '#FFFFFF';
  if (percentage >= 67) return '#FFFFFF';
  if (percentage >= 34) return '#1A1A1A'; // Dark text on yellow
  return '#FFFFFF';
};

export const ChecklistProgressBar: React.FC<ChecklistProgressBarProps> = ({
  value,
  height = 24,
  showPercentage = true,
  showCount = false,
  completedItems,
  totalItems,
}) => {
  // Clamp value between 0 and 100
  const percentage = Math.min(100, Math.max(0, value));
  const fillColor = getProgressColor(percentage);

  return (
    <Box sx={{ width: '100%' }}>
      {/* Progress bar container */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height,
          backgroundColor: '#E8E8E8',
          borderRadius: height / 2,
          overflow: 'hidden',
          // Subtle border for visibility at all states
          border: '1px solid',
          borderColor: percentage === 100 ? c5Colors.green : '#D0D0D0',
          // Box shadow for depth
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
        }}
      >
        {/* Progress fill */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${percentage}%`,
            backgroundColor: fillColor,
            borderRadius: height / 2,
            // Smooth transition when value changes (not from 0!)
            transition: 'width 0.4s ease-out, background-color 0.3s ease',
            // Subtle gradient for polish
            backgroundImage:
              percentage > 0
                ? `linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.05) 100%)`
                : 'none',
          }}
        />

        {/* Percentage text - positioned inside the bar */}
        {showPercentage && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                fontSize: height > 20 ? '0.8rem' : '0.7rem',
                // Use contrasting color based on fill
                color: percentage >= 50 ? getTextColor(percentage, true) : c5Colors.darkGray,
                // Text shadow for readability on any background
                textShadow:
                  percentage >= 50 && percentage < 100
                    ? '0 0 2px rgba(0,0,0,0.3)'
                    : percentage === 100
                      ? '0 0 2px rgba(0,0,0,0.4)'
                      : 'none',
                letterSpacing: '0.02em',
              }}
            >
              {percentage.toFixed(0)}%
            </Typography>
          </Box>
        )}
      </Box>

      {/* Count text below bar (optional) */}
      {showCount && completedItems !== undefined && totalItems !== undefined && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 0.5, textAlign: 'right' }}
        >
          {completedItems} / {totalItems} items
        </Typography>
      )}
    </Box>
  );
};

/**
 * Compact variant for tight spaces (e.g., table cells, list items)
 */
export const ChecklistProgressBarCompact: React.FC<{
  value: number;
  width?: number | string;
}> = ({ value, width = 80 }) => {
  const percentage = Math.min(100, Math.max(0, value));
  const fillColor = getProgressColor(percentage);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        width,
      }}
    >
      <Box
        sx={{
          flex: 1,
          height: 8,
          backgroundColor: '#E8E8E8',
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: percentage === 100 ? c5Colors.green : '#D0D0D0',
        }}
      >
        <Box
          sx={{
            height: '100%',
            width: `${percentage}%`,
            backgroundColor: fillColor,
            borderRadius: 4,
            transition: 'width 0.4s ease-out, background-color 0.3s ease',
          }}
        />
      </Box>
      <Typography
        variant="caption"
        sx={{
          minWidth: 32,
          fontWeight: 600,
          color: fillColor,
          textAlign: 'right',
        }}
      >
        {percentage.toFixed(0)}%
      </Typography>
    </Box>
  );
};
