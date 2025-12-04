/**
 * ChannelMenu Component Tests
 *
 * Tests for the reusable external channel menu component.
 * Verifies platform icons, menu interactions, and callback handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { ChannelMenu } from './ChannelMenu';
import { cobraTheme } from '../../../theme/cobraTheme';
import type { ExternalChannelMappingDto, ChatThreadDto } from '../types/chat';
import type { ExternalMessagingConfig } from '../hooks/useExternalMessagingConfig';
import { ExternalPlatform, ChannelType } from '../types/chat';

// Helper to render with theme provider
const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={cobraTheme}>{ui}</ThemeProvider>);
};

// Helper to get the menu button (the IconButton with ellipsis icon)
const getMenuButton = () => {
  return screen.getByRole('button', { name: /channel options|external channels/i });
};

// Create mock external messaging config
const createMockConfig = (
  overrides: Partial<ExternalMessagingConfig> = {}
): ExternalMessagingConfig => ({
  isConfigured: true,
  groupMe: {
    isConfigured: true,
    hasAccessToken: true,
  },
  teams: {
    isConfigured: true,
    isConnected: true,
    availableConversations: 3,
    statusMessage: 'Connected',
  },
  loading: false,
  error: null,
  ...overrides,
});

// Create mock external channel
const createMockExternalChannel = (
  overrides: Partial<ExternalChannelMappingDto> = {}
): ExternalChannelMappingDto => ({
  id: 'ext-channel-1',
  eventId: 'event-1',
  platform: ExternalPlatform.Teams,
  platformName: 'Teams',
  externalGroupId: 'teams-group-id',
  externalGroupName: 'Team Channel',
  isActive: true,
  createdAt: new Date().toISOString(),
  ...overrides,
});

// Create mock chat thread
const createMockChannel = (
  overrides: Partial<ChatThreadDto> = {}
): ChatThreadDto => ({
  id: 'channel-1',
  eventId: 'event-1',
  name: 'General',
  channelType: ChannelType.Internal,
  channelTypeName: 'Internal',
  isDefaultEventThread: true,
  displayOrder: 0,
  messageCount: 10,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('ChannelMenu', () => {
  const defaultProps = {
    config: createMockConfig(),
    activeChannels: [] as ExternalChannelMappingDto[],
    onCreateGroupMe: vi.fn(),
    onOpenTeamsDialog: vi.fn(),
    onDisconnectChannel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders menu button', () => {
      renderWithTheme(<ChannelMenu {...defaultProps} />);

      // Menu button should be present
      const menuButton = getMenuButton();
      expect(menuButton).toBeInTheDocument();
    });

    it('shows connected channel chips when showChips is true', () => {
      const activeChannels = [
        createMockExternalChannel({ platform: ExternalPlatform.Teams, platformName: 'Teams' }),
      ];

      renderWithTheme(
        <ChannelMenu {...defaultProps} activeChannels={activeChannels} showChips={true} />
      );

      // Chips are rendered - look for chip content
      expect(screen.getByText('Teams')).toBeInTheDocument();
    });

    it('hides connected channel chips when showChips is false', () => {
      const activeChannels = [
        createMockExternalChannel({ platform: ExternalPlatform.Teams, platformName: 'Teams' }),
      ];

      renderWithTheme(
        <ChannelMenu {...defaultProps} activeChannels={activeChannels} showChips={false} />
      );

      // The chips should not be visible outside the menu
      // Only the menu button should be visible
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(1); // Only menu button
    });
  });

  describe('menu interactions', () => {
    it('opens menu when button is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ChannelMenu {...defaultProps} />);

      const menuButton = getMenuButton();
      await user.click(menuButton);

      // Menu should be open with GroupMe option
      expect(screen.getByText('Connect GroupMe')).toBeInTheDocument();
    });

    it('shows Connect GroupMe option when GroupMe is configured and not connected', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ChannelMenu {...defaultProps} />);

      await user.click(getMenuButton());

      expect(screen.getByText('Connect GroupMe')).toBeInTheDocument();
    });

    it('hides Connect GroupMe option when already connected', async () => {
      const user = userEvent.setup();
      const activeChannels = [
        createMockExternalChannel({ platform: ExternalPlatform.GroupMe }),
      ];

      renderWithTheme(
        <ChannelMenu {...defaultProps} activeChannels={activeChannels} showChips={false} />
      );

      await user.click(getMenuButton());

      expect(screen.queryByText('Connect GroupMe')).not.toBeInTheDocument();
    });

    it('shows Connect Teams option when Teams is configured', async () => {
      const user = userEvent.setup();
      const selectedChannel = createMockChannel();

      renderWithTheme(
        <ChannelMenu {...defaultProps} selectedChannel={selectedChannel} />
      );

      await user.click(getMenuButton());

      // Should show Link Teams to channel option
      expect(screen.getByText(`Link Teams to "${selectedChannel.name}"`)).toBeInTheDocument();
    });

    it('disables Teams option when bot is not connected', async () => {
      const user = userEvent.setup();
      const config = createMockConfig({
        teams: {
          isConfigured: true,
          isConnected: false,
          availableConversations: 0,
          statusMessage: 'Not connected',
        },
      });

      renderWithTheme(<ChannelMenu {...defaultProps} config={config} />);

      await user.click(getMenuButton());

      const teamsMenuItem = screen.getByText('Bot not available').closest('li');
      expect(teamsMenuItem).toHaveAttribute('aria-disabled', 'true');
    });

    it('shows connected channels in menu', async () => {
      const user = userEvent.setup();
      const activeChannels = [
        createMockExternalChannel({
          platform: ExternalPlatform.Teams,
          externalGroupName: 'My Team Channel',
        }),
      ];

      renderWithTheme(
        <ChannelMenu {...defaultProps} activeChannels={activeChannels} showChips={false} />
      );

      await user.click(getMenuButton());

      expect(screen.getByText('Connected Channels')).toBeInTheDocument();
      expect(screen.getByText('Disconnect My Team Channel')).toBeInTheDocument();
    });
  });

  describe('callbacks', () => {
    it('calls onCreateGroupMe when Connect GroupMe is clicked', async () => {
      const user = userEvent.setup();
      const onCreateGroupMe = vi.fn();

      renderWithTheme(
        <ChannelMenu {...defaultProps} onCreateGroupMe={onCreateGroupMe} />
      );

      await user.click(getMenuButton());
      await user.click(screen.getByText('Connect GroupMe'));

      expect(onCreateGroupMe).toHaveBeenCalledTimes(1);
    });

    it('calls onOpenTeamsDialog when Connect Teams is clicked', async () => {
      const user = userEvent.setup();
      const onOpenTeamsDialog = vi.fn();
      // Create channel with externalChannel explicitly null (not linked)
      const selectedChannel: ChatThreadDto = {
        ...createMockChannel(),
        externalChannel: null as any, // Explicitly null means not linked
      };

      renderWithTheme(
        <ChannelMenu
          {...defaultProps}
          selectedChannel={selectedChannel}
          onOpenTeamsDialog={onOpenTeamsDialog}
        />
      );

      await user.click(getMenuButton());

      // Find the menu item and click it
      const menuItem = screen.getByRole('menuitem', { name: new RegExp(`Link Teams to "${selectedChannel.name}"`) });
      await user.click(menuItem);

      expect(onOpenTeamsDialog).toHaveBeenCalledTimes(1);
    });

    it('calls onDisconnectChannel when disconnect is clicked', async () => {
      const user = userEvent.setup();
      const onDisconnectChannel = vi.fn();
      const activeChannels = [
        createMockExternalChannel({
          id: 'channel-to-disconnect',
          externalGroupName: 'Test Channel',
        }),
      ];

      renderWithTheme(
        <ChannelMenu
          {...defaultProps}
          activeChannels={activeChannels}
          onDisconnectChannel={onDisconnectChannel}
          showChips={false}
        />
      );

      await user.click(getMenuButton());
      await user.click(screen.getByText('Disconnect Test Channel'));

      expect(onDisconnectChannel).toHaveBeenCalledWith('channel-to-disconnect');
    });
  });

  describe('platform icons', () => {
    it('displays correct icon for Teams channel in menu', async () => {
      const user = userEvent.setup();
      const activeChannels = [
        createMockExternalChannel({
          platform: ExternalPlatform.Teams,
          externalGroupName: 'Teams Channel',
        }),
      ];

      renderWithTheme(
        <ChannelMenu {...defaultProps} activeChannels={activeChannels} showChips={false} />
      );

      await user.click(getMenuButton());

      // The Microsoft icon should be present in the menu
      const disconnectItem = screen.getByText('Disconnect Teams Channel').closest('li');
      expect(disconnectItem).toBeInTheDocument();
      // Icon is rendered as SVG, checking the container exists
      const svgElements = disconnectItem?.querySelectorAll('svg');
      expect(svgElements?.length).toBeGreaterThan(0);
    });

    it('handles string platform values from API (Teams as "Teams")', async () => {
      const user = userEvent.setup();
      const activeChannels = [
        createMockExternalChannel({
          platform: 'Teams' as any, // Simulating API string response
          externalGroupName: 'String Teams Channel',
        }),
      ];

      renderWithTheme(
        <ChannelMenu {...defaultProps} activeChannels={activeChannels} showChips={false} />
      );

      await user.click(getMenuButton());

      // Should still render correctly
      expect(screen.getByText('Disconnect String Teams Channel')).toBeInTheDocument();
    });
  });

  describe('compact mode', () => {
    it('renders in compact mode for sidebar', () => {
      renderWithTheme(<ChannelMenu {...defaultProps} compact={true} />);

      const button = getMenuButton();
      expect(button).toBeInTheDocument();
      // In compact mode, the button should still work
    });

    it('shows secondary text in non-compact mode', async () => {
      const user = userEvent.setup();
      const selectedChannel = createMockChannel({ externalChannel: undefined });

      renderWithTheme(
        <ChannelMenu
          {...defaultProps}
          selectedChannel={selectedChannel}
          compact={false}
        />
      );

      await user.click(getMenuButton());

      // Should show available conversations count
      expect(screen.getByText('3 channel(s) available')).toBeInTheDocument();
    });

    it('shows compact secondary text in compact mode', async () => {
      const user = userEvent.setup();

      renderWithTheme(
        <ChannelMenu {...defaultProps} compact={true} />
      );

      await user.click(getMenuButton());

      // In compact mode, should show shorter text
      expect(screen.getByText('3 channel(s)')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('shows empty state when no platforms configured and no channels', async () => {
      const user = userEvent.setup();
      const config = createMockConfig({
        groupMe: { isConfigured: false, hasAccessToken: false },
        teams: {
          isConfigured: false,
          isConnected: false,
          availableConversations: 0,
          statusMessage: '',
        },
      });

      renderWithTheme(<ChannelMenu {...defaultProps} config={config} />);

      await user.click(getMenuButton());

      expect(screen.getByText('No external channels')).toBeInTheDocument();
    });

    it('handles channel with externalChannel already linked', async () => {
      const user = userEvent.setup();
      const selectedChannel = createMockChannel({
        externalChannel: createMockExternalChannel(),
      });

      renderWithTheme(
        <ChannelMenu
          {...defaultProps}
          selectedChannel={selectedChannel}
          compact={false}
        />
      );

      await user.click(getMenuButton());

      // Should show "Teams Already Linked"
      expect(screen.getByText('Teams Already Linked')).toBeInTheDocument();
    });

    it('closes menu after action', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ChannelMenu {...defaultProps} />);

      await user.click(getMenuButton());
      expect(screen.getByText('Connect GroupMe')).toBeVisible();

      await user.click(screen.getByText('Connect GroupMe'));

      // Menu should close after clicking - check menu is no longer in document
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });
  });
});
