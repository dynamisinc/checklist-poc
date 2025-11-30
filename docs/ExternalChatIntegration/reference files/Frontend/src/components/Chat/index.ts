/**
 * Chat Components
 *
 * This module provides the chat UI components for COBRA's event chat functionality
 * with support for external messaging platform integration (GroupMe, etc.).
 *
 * Components:
 * - EventChat: Main chat container with message list and input
 * - ChatMessage: Individual message display (native and external)
 * - PromoteToLogbookDialog: Dialog for promoting chat messages to logbook entries
 */

export { EventChat } from "./EventChat";
export { ChatMessage } from "./ChatMessage";
export { PromoteToLogbookDialog } from "./PromoteToLogbookDialog";

// Re-export types for convenience
export type {
  ChatMessageDto,
  ExternalChannelMappingDto,
  ExternalPlatform,
  PromoteToLogbookRequest,
  ViewChatThreadDto,
} from "../../types/chat.types";
