/**
 * Platform Utilities Tests
 *
 * Tests for the shared platform icon, color, and channel display utilities.
 * These utilities handle the string/number enum mismatch when the backend
 * uses JsonStringEnumConverter.
 */

import { describe, it, expect } from 'vitest';
import {
  faCommentDots,
  faCommentSms,
  faComments,
  faBullhorn,
  faHashtag,
  faUserGroup,
} from '@fortawesome/free-solid-svg-icons';
import { faMicrosoft, faSlack } from '@fortawesome/free-brands-svg-icons';
import {
  normalizePlatform,
  getPlatformIcon,
  getPlatformColor,
  getPlatformName,
  iconNameToIcon,
  getChannelIcon,
  getChannelColor,
} from './platformUtils';
import { ExternalPlatform, ChannelType, PlatformInfo } from '../types/chat';
import type { ChatThreadDto } from '../types/chat';

// Mock theme for getChannelColor tests
const mockTheme = {
  palette: {
    primary: { main: '#1976d2' },
    warning: { main: '#ed6c02' },
    info: { main: '#0288d1' },
    text: { secondary: '#666666' },
  },
} as any;

describe('normalizePlatform', () => {
  describe('with numeric enum values', () => {
    it('returns GroupMe for numeric value 1', () => {
      expect(normalizePlatform(1)).toBe(ExternalPlatform.GroupMe);
    });

    it('returns Signal for numeric value 2', () => {
      expect(normalizePlatform(2)).toBe(ExternalPlatform.Signal);
    });

    it('returns Teams for numeric value 3', () => {
      expect(normalizePlatform(3)).toBe(ExternalPlatform.Teams);
    });

    it('returns Slack for numeric value 4', () => {
      expect(normalizePlatform(4)).toBe(ExternalPlatform.Slack);
    });

    it('returns null for invalid numeric value', () => {
      expect(normalizePlatform(99)).toBe(null);
    });
  });

  describe('with string enum values (from API with JsonStringEnumConverter)', () => {
    it('returns GroupMe for string "GroupMe"', () => {
      expect(normalizePlatform('GroupMe')).toBe(ExternalPlatform.GroupMe);
    });

    it('returns Signal for string "Signal"', () => {
      expect(normalizePlatform('Signal')).toBe(ExternalPlatform.Signal);
    });

    it('returns Teams for string "Teams"', () => {
      expect(normalizePlatform('Teams')).toBe(ExternalPlatform.Teams);
    });

    it('returns Slack for string "Slack"', () => {
      expect(normalizePlatform('Slack')).toBe(ExternalPlatform.Slack);
    });

    it('returns null for invalid string value', () => {
      expect(normalizePlatform('InvalidPlatform')).toBe(null);
    });

    it('is case-sensitive (lowercase returns null)', () => {
      expect(normalizePlatform('teams')).toBe(null);
      expect(normalizePlatform('groupme')).toBe(null);
    });
  });

  describe('with ExternalPlatform enum directly', () => {
    it('returns the same value for ExternalPlatform.Teams', () => {
      expect(normalizePlatform(ExternalPlatform.Teams)).toBe(ExternalPlatform.Teams);
    });

    it('returns the same value for ExternalPlatform.GroupMe', () => {
      expect(normalizePlatform(ExternalPlatform.GroupMe)).toBe(ExternalPlatform.GroupMe);
    });
  });
});

describe('getPlatformIcon', () => {
  describe('with numeric enum values', () => {
    it('returns faCommentDots for GroupMe (1)', () => {
      expect(getPlatformIcon(ExternalPlatform.GroupMe)).toBe(faCommentDots);
    });

    it('returns faCommentSms for Signal (2)', () => {
      expect(getPlatformIcon(ExternalPlatform.Signal)).toBe(faCommentSms);
    });

    it('returns faMicrosoft for Teams (3)', () => {
      expect(getPlatformIcon(ExternalPlatform.Teams)).toBe(faMicrosoft);
    });

    it('returns faSlack for Slack (4)', () => {
      expect(getPlatformIcon(ExternalPlatform.Slack)).toBe(faSlack);
    });
  });

  describe('with string values (simulating API response)', () => {
    it('returns faMicrosoft for string "Teams"', () => {
      expect(getPlatformIcon('Teams')).toBe(faMicrosoft);
    });

    it('returns faCommentDots for string "GroupMe"', () => {
      expect(getPlatformIcon('GroupMe')).toBe(faCommentDots);
    });

    it('returns faCommentSms for string "Signal"', () => {
      expect(getPlatformIcon('Signal')).toBe(faCommentSms);
    });

    it('returns faSlack for string "Slack"', () => {
      expect(getPlatformIcon('Slack')).toBe(faSlack);
    });

    it('returns faCommentDots (default) for unknown platform', () => {
      expect(getPlatformIcon('Unknown')).toBe(faCommentDots);
    });
  });
});

describe('getPlatformColor', () => {
  it('returns correct color for Teams', () => {
    expect(getPlatformColor(ExternalPlatform.Teams)).toBe(PlatformInfo[ExternalPlatform.Teams].color);
    expect(getPlatformColor('Teams')).toBe('#6264a7');
  });

  it('returns correct color for GroupMe', () => {
    expect(getPlatformColor(ExternalPlatform.GroupMe)).toBe('#00aff0');
    expect(getPlatformColor('GroupMe')).toBe('#00aff0');
  });

  it('returns correct color for Signal', () => {
    expect(getPlatformColor('Signal')).toBe('#3a76f0');
  });

  it('returns correct color for Slack', () => {
    expect(getPlatformColor('Slack')).toBe('#4a154b');
  });

  it('returns default gray for unknown platform', () => {
    expect(getPlatformColor('Unknown')).toBe('#666');
  });
});

describe('getPlatformName', () => {
  it('returns "Teams" for Teams platform', () => {
    expect(getPlatformName(ExternalPlatform.Teams)).toBe('Teams');
    expect(getPlatformName('Teams')).toBe('Teams');
  });

  it('returns "GroupMe" for GroupMe platform', () => {
    expect(getPlatformName(ExternalPlatform.GroupMe)).toBe('GroupMe');
    expect(getPlatformName('GroupMe')).toBe('GroupMe');
  });

  it('returns the string itself for unknown string platform', () => {
    expect(getPlatformName('CustomPlatform')).toBe('CustomPlatform');
  });

  it('returns "Unknown" for invalid numeric platform', () => {
    expect(getPlatformName(99)).toBe('Unknown');
  });
});

describe('iconNameToIcon', () => {
  it('returns faComments for "comments"', () => {
    expect(iconNameToIcon('comments')).toBe(faComments);
  });

  it('returns faBullhorn for "bullhorn"', () => {
    expect(iconNameToIcon('bullhorn')).toBe(faBullhorn);
  });

  it('returns faHashtag for "hashtag"', () => {
    expect(iconNameToIcon('hashtag')).toBe(faHashtag);
  });

  it('returns faUserGroup for "user-group"', () => {
    expect(iconNameToIcon('user-group')).toBe(faUserGroup);
  });

  it('returns faHashtag (default) for unknown icon name', () => {
    expect(iconNameToIcon('unknown-icon')).toBe(faHashtag);
  });
});

describe('getChannelIcon', () => {
  const createChannel = (overrides: Partial<ChatThreadDto> = {}): ChatThreadDto => ({
    id: 'test-id',
    eventId: 'event-id',
    name: 'Test Channel',
    channelType: ChannelType.Internal,
    channelTypeName: 'Internal',
    isDefaultEventThread: false,
    displayOrder: 0,
    messageCount: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  });

  describe('with custom iconName', () => {
    it('returns custom icon when iconName is provided', () => {
      const channel = createChannel({ iconName: 'bullhorn' });
      expect(getChannelIcon(channel)).toBe(faBullhorn);
    });

    it('prioritizes iconName over channelType', () => {
      const channel = createChannel({
        iconName: 'comments',
        channelType: ChannelType.Position,
      });
      expect(getChannelIcon(channel)).toBe(faComments);
    });
  });

  describe('with External channel type', () => {
    it('returns faMicrosoft for External channel with Teams connection', () => {
      const channel = createChannel({
        channelType: ChannelType.External,
        externalChannel: {
          id: 'ext-id',
          eventId: 'event-id',
          platform: ExternalPlatform.Teams,
          platformName: 'Teams',
          externalGroupId: 'group-id',
          externalGroupName: 'Team Channel',
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      });
      expect(getChannelIcon(channel)).toBe(faMicrosoft);
    });

    it('returns faMicrosoft for External channel with Teams as string (API response)', () => {
      const channel = createChannel({
        channelType: ChannelType.External,
        externalChannel: {
          id: 'ext-id',
          eventId: 'event-id',
          platform: 'Teams' as any, // Simulating API string response
          platformName: 'Teams',
          externalGroupId: 'group-id',
          externalGroupName: 'Team Channel',
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      });
      expect(getChannelIcon(channel)).toBe(faMicrosoft);
    });

    it('returns faCommentDots for External channel with GroupMe connection', () => {
      const channel = createChannel({
        channelType: ChannelType.External,
        externalChannel: {
          id: 'ext-id',
          eventId: 'event-id',
          platform: ExternalPlatform.GroupMe,
          platformName: 'GroupMe',
          externalGroupId: 'group-id',
          externalGroupName: 'GroupMe Group',
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      });
      expect(getChannelIcon(channel)).toBe(faCommentDots);
    });

    it('returns faCommentDots fallback for External channel without externalChannel data', () => {
      const channel = createChannel({
        channelType: ChannelType.External,
        externalChannel: undefined,
      });
      expect(getChannelIcon(channel)).toBe(faCommentDots);
    });
  });

  describe('with standard channel types', () => {
    it('returns faComments for Internal channel', () => {
      const channel = createChannel({ channelType: ChannelType.Internal });
      expect(getChannelIcon(channel)).toBe(faComments);
    });

    it('returns faBullhorn for Announcements channel', () => {
      const channel = createChannel({ channelType: ChannelType.Announcements });
      expect(getChannelIcon(channel)).toBe(faBullhorn);
    });

    it('returns faUserGroup for Position channel', () => {
      const channel = createChannel({ channelType: ChannelType.Position });
      expect(getChannelIcon(channel)).toBe(faUserGroup);
    });

    it('returns faHashtag for Custom channel', () => {
      const channel = createChannel({ channelType: ChannelType.Custom });
      expect(getChannelIcon(channel)).toBe(faHashtag);
    });
  });

  describe('with string channel types (API with JsonStringEnumConverter)', () => {
    it('handles "Internal" string type', () => {
      const channel = createChannel({ channelType: 'Internal' as any });
      expect(getChannelIcon(channel)).toBe(faComments);
    });

    it('handles "Announcements" string type', () => {
      const channel = createChannel({ channelType: 'Announcements' as any });
      expect(getChannelIcon(channel)).toBe(faBullhorn);
    });

    it('handles "External" string type with Teams', () => {
      const channel = createChannel({
        channelType: 'External' as any,
        externalChannel: {
          id: 'ext-id',
          eventId: 'event-id',
          platform: 'Teams' as any,
          platformName: 'Teams',
          externalGroupId: 'group-id',
          externalGroupName: 'Team Channel',
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      });
      expect(getChannelIcon(channel)).toBe(faMicrosoft);
    });
  });
});

describe('getChannelColor', () => {
  const createChannel = (overrides: Partial<ChatThreadDto> = {}): ChatThreadDto => ({
    id: 'test-id',
    eventId: 'event-id',
    name: 'Test Channel',
    channelType: ChannelType.Internal,
    channelTypeName: 'Internal',
    isDefaultEventThread: false,
    displayOrder: 0,
    messageCount: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  });

  it('returns custom color when provided', () => {
    const channel = createChannel({ color: '#ff0000' });
    expect(getChannelColor(channel, mockTheme)).toBe('#ff0000');
  });

  it('returns Teams color for External channel with Teams', () => {
    const channel = createChannel({
      channelType: ChannelType.External,
      externalChannel: {
        id: 'ext-id',
        eventId: 'event-id',
        platform: 'Teams' as any,
        platformName: 'Teams',
        externalGroupId: 'group-id',
        externalGroupName: 'Team Channel',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    });
    expect(getChannelColor(channel, mockTheme)).toBe('#6264a7');
  });

  it('returns theme primary color for Internal channel', () => {
    const channel = createChannel({ channelType: ChannelType.Internal });
    expect(getChannelColor(channel, mockTheme)).toBe(mockTheme.palette.primary.main);
  });

  it('returns theme warning color for Announcements channel', () => {
    const channel = createChannel({ channelType: ChannelType.Announcements });
    expect(getChannelColor(channel, mockTheme)).toBe(mockTheme.palette.warning.main);
  });

  it('returns theme info color for Position channel', () => {
    const channel = createChannel({ channelType: ChannelType.Position });
    expect(getChannelColor(channel, mockTheme)).toBe(mockTheme.palette.info.main);
  });

  it('returns theme secondary text color for Custom channel', () => {
    const channel = createChannel({ channelType: ChannelType.Custom });
    expect(getChannelColor(channel, mockTheme)).toBe(mockTheme.palette.text.secondary);
  });
});
