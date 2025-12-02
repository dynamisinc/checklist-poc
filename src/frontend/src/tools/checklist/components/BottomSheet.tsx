/**
 * BottomSheet Component
 *
 * Mobile-native bottom sheet drawer that slides up from the bottom of the screen.
 * Provides a better UX than modals on mobile devices.
 *
 * Features:
 * - Smooth slide-up animation
 * - Swipe-to-dismiss gesture
 * - Backdrop with tap-to-close
 * - Responsive: Only used on mobile, falls back to Dialog on desktop
 * - Customizable height (auto, half, full)
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  IconButton,
  useTheme,
  useMediaQuery,
  SwipeableDrawer,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

export type BottomSheetHeight = 'auto' | 'half' | 'full';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  onOpen?: () => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  height?: BottomSheetHeight;
  showCloseButton?: boolean;
}

/**
 * BottomSheet Component
 *
 * A mobile-optimized drawer that slides up from the bottom.
 * Automatically uses standard drawer behavior with swipe gestures.
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onClose,
  onOpen,
  children,
  title,
  height = 'auto',
  showCloseButton = true,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [drawerHeight, setDrawerHeight] = useState<string>('auto');

  useEffect(() => {
    switch (height) {
      case 'full':
        setDrawerHeight('100vh');
        break;
      case 'half':
        setDrawerHeight('50vh');
        break;
      case 'auto':
      default:
        setDrawerHeight('auto');
        break;
    }
  }, [height]);

  // Only render as bottom sheet on mobile
  if (!isMobile) {
    return null; // Parent should handle desktop rendering
  }

  const handleOpen = () => {
    if (onOpen) {
      onOpen();
    }
  };

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={handleOpen}
      disableSwipeToOpen={false}
      swipeAreaWidth={20}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: '90vh',
          height: drawerHeight,
          overflow: 'visible',
        },
      }}
      sx={{
        zIndex: theme.zIndex.drawer + 2,
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Drag Handle */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            pt: 1,
            pb: 1,
            cursor: 'grab',
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 4,
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: 2,
            }}
          />
        </Box>

        {/* Header */}
        {(title || showCloseButton) && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              pb: 1,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            {title && (
              <Box sx={{ flex: 1 }}>
                {typeof title === 'string' ? (
                  <Box sx={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                    {title}
                  </Box>
                ) : (
                  title
                )}
              </Box>
            )}
            {showCloseButton && (
              <IconButton
                onClick={onClose}
                sx={{
                  minWidth: 48,
                  minHeight: 48,
                  color: 'text.secondary',
                }}
              >
                <FontAwesomeIcon icon={faXmark} />
              </IconButton>
            )}
          </Box>
        )}

        {/* Content */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            px: 2,
            py: 2,
          }}
        >
          {children}
        </Box>
      </Box>
    </SwipeableDrawer>
  );
};
