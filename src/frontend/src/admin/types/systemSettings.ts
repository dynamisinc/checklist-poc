/**
 * System Settings Types
 *
 * TypeScript interfaces for integration status APIs.
 */

/**
 * GroupMe integration status from server configuration.
 * WebhookBaseUrl comes from appsettings, not database settings.
 */
export interface GroupMeIntegrationStatus {
  /** Whether GroupMe integration is fully configured (has token + webhook URL) */
  isConfigured: boolean;
  /** Whether an access token has been set in system settings */
  hasAccessToken: boolean;
  /** The webhook base URL from appsettings (read-only, not user-editable) */
  webhookBaseUrl: string;
  /** The full webhook callback URL pattern that GroupMe will use */
  webhookCallbackUrlPattern: string;
  /** URL to test webhook endpoint accessibility */
  webhookHealthCheckUrl: string;
}

/**
 * Teams Bot integration status from server configuration.
 * Checks if the TeamsBot service is configured and reachable.
 */
export interface TeamsIntegrationStatus {
  /** Whether Teams Bot URL is configured in appsettings */
  isConfigured: boolean;
  /** Whether the Teams Bot service is currently reachable */
  isConnected: boolean;
  /** The Teams Bot base URL from appsettings */
  botBaseUrl: string;
  /** The internal API URL for sending messages to Teams */
  internalApiUrl: string;
  /** Number of Teams channels that have installed the bot */
  availableConversations: number;
  /** Human-readable status message */
  statusMessage: string;
}

// === Teams Connector Management Types (UC-TI-030) ===

/**
 * Summary of a Teams connector for admin UI.
 * Represents a Teams channel/conversation where the bot is installed.
 */
export interface TeamsConnectorDto {
  /** The mapping ID (ExternalChannelMapping.Id) */
  mappingId: string;
  /** Human-readable name for the connector */
  displayName: string;
  /** The Teams conversation ID */
  conversationId: string;
  /** Customer's Microsoft 365 tenant ID */
  tenantId: string | null;
  /** Last time a message was received from this channel */
  lastActivityAt: string | null;
  /** Name of user who installed/first used the bot */
  installedByName: string | null;
  /** True if this is a Bot Framework Emulator connection */
  isEmulator: boolean;
  /** Whether the connector is active */
  isActive: boolean;
  /** Whether ConversationReference is stored (required for outbound messages) */
  hasConversationReference: boolean;
  /** When the connector was created */
  createdAt: string;
  /** The linked COBRA event ID */
  linkedEventId: string | null;
  /** The linked COBRA event name */
  linkedEventName: string | null;
}

/**
 * Response from listing Teams connectors.
 */
export interface ListTeamsConnectorsResponse {
  count: number;
  connectors: TeamsConnectorDto[];
}

/**
 * Response from cleanup operations.
 */
export interface CleanupResponse {
  deletedCount: number;
  deletedMappingIds: string[];
}
