/**
 * Position Channel Configuration
 *
 * ICS (Incident Command System) positions and their display configuration.
 * Used for position-based chat channels with specific icons and colors.
 */

import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faStar,
  faCogs,
  faClipboardList,
  faTruck,
  faDollarSign,
  faShieldHalved,
  faBullhorn,
  faHandshake,
  faUserGroup,
} from '@fortawesome/free-solid-svg-icons';

/**
 * Configuration for a position channel.
 */
export interface PositionChannelConfig {
  /** Full ICS position name */
  name: string;
  /** Short name for display (used as channel name) */
  shortName: string;
  /** FontAwesome icon */
  icon: IconDefinition;
  /** Icon name string (for backend/storage) */
  iconName: string;
  /** Hex color */
  color: string;
  /** Channel description */
  description: string;
}

/**
 * Position channel configurations indexed by position name.
 */
export const PositionChannelConfigs: Record<string, PositionChannelConfig> = {
  'Incident Commander': {
    name: 'Incident Commander',
    shortName: 'Command',
    icon: faStar,
    iconName: 'star',
    color: '#0020C2', // Cobalt Blue - Command authority
    description: 'Command staff coordination',
  },
  'Operations Section Chief': {
    name: 'Operations Section Chief',
    shortName: 'Operations',
    icon: faCogs,
    iconName: 'cogs',
    color: '#E42217', // Lava Red - Operations (action)
    description: 'Operations section coordination',
  },
  'Planning Section Chief': {
    name: 'Planning Section Chief',
    shortName: 'Planning',
    icon: faClipboardList,
    iconName: 'clipboard-list',
    color: '#4CAF50', // Green - Planning (growth/progress)
    description: 'Planning section coordination',
  },
  'Logistics Section Chief': {
    name: 'Logistics Section Chief',
    shortName: 'Logistics',
    icon: faTruck,
    iconName: 'truck',
    color: '#FF9800', // Orange - Logistics (movement/supply)
    description: 'Logistics section coordination',
  },
  'Finance/Admin Section Chief': {
    name: 'Finance/Admin Section Chief',
    shortName: 'Finance/Admin',
    icon: faDollarSign,
    iconName: 'dollar-sign',
    color: '#9C27B0', // Purple - Finance (royalty/value)
    description: 'Finance and administration coordination',
  },
  'Safety Officer': {
    name: 'Safety Officer',
    shortName: 'Safety',
    icon: faShieldHalved,
    iconName: 'shield-halved',
    color: '#F44336', // Red - Safety (warning/alert)
    description: 'Safety officer coordination',
  },
  'Public Information Officer': {
    name: 'Public Information Officer',
    shortName: 'PIO',
    icon: faBullhorn,
    iconName: 'bullhorn',
    color: '#2196F3', // Blue - PIO (communication)
    description: 'Public information coordination',
  },
  'Liaison Officer': {
    name: 'Liaison Officer',
    shortName: 'Liaison',
    icon: faHandshake,
    iconName: 'handshake',
    color: '#00BCD4', // Cyan - Liaison (connection)
    description: 'Liaison officer coordination',
  },
};

/**
 * Get position channel config by position name.
 * Falls back to a default config if position not found.
 */
export const getPositionChannelConfig = (positionName: string): PositionChannelConfig => {
  return (
    PositionChannelConfigs[positionName] ?? {
      name: positionName,
      shortName: positionName,
      icon: faUserGroup,
      iconName: 'user-group',
      color: '#607D8B', // Blue Grey - Default
      description: `${positionName} coordination`,
    }
  );
};

/**
 * Get FontAwesome icon for a position channel by icon name string.
 */
export const getPositionIcon = (iconName: string): IconDefinition => {
  const iconMap: Record<string, IconDefinition> = {
    star: faStar,
    cogs: faCogs,
    'clipboard-list': faClipboardList,
    truck: faTruck,
    'dollar-sign': faDollarSign,
    'shield-halved': faShieldHalved,
    bullhorn: faBullhorn,
    handshake: faHandshake,
    'user-group': faUserGroup,
  };

  return iconMap[iconName] ?? faUserGroup;
};
