/**
 * Icon Mapping Utility
 *
 * Uses FontAwesome's library to dynamically look up icons by name.
 */

import { library, findIconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { IconDefinition, IconName, IconPrefix } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import {
  faCalendarCheck,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';

// Add all solid icons to the library for dynamic lookup
library.add(fas);

/**
 * Get FontAwesome icon from icon name string
 *
 * @param iconName - Icon name from database (e.g., "fa-hurricane" or "hurricane")
 * @param eventType - Event type for fallback icon selection
 * @returns FontAwesome IconDefinition
 */
export const getIconFromName = (
  iconName?: string,
  eventType?: string
): IconDefinition => {
  if (iconName) {
    // Remove "fa-" prefix if present and convert to icon name format
    const cleanName = iconName.replace(/^fa-/, '') as IconName;

    // Try to find the icon in the solid icons
    const icon = findIconDefinition({ prefix: 'fas' as IconPrefix, iconName: cleanName });
    if (icon) {
      return icon;
    }
  }

  // Fallback based on event type
  if (eventType?.toLowerCase() === 'planned') {
    return faCalendarCheck;
  }

  return faTriangleExclamation;
};

/**
 * Get icon color based on event type
 */
export const getEventTypeColor = (eventType?: string): string => {
  if (eventType?.toLowerCase() === 'planned') {
    return '#4caf50'; // Green for planned
  }
  return '#ff9800'; // Orange for unplanned
};
