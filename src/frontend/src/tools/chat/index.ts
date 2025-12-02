/**
 * Chat Tool
 *
 * Provides event-level chat functionality with support for
 * external platform integration (GroupMe, Signal, Teams, Slack).
 */

// Components
export { EventChat } from './components/EventChat';
export { ChatMessage } from './components/ChatMessage';

// Pages
export { ChatPage } from './pages/ChatPage';

// Services
export { chatService } from './services/chatService';

// Types
export type {
  ChatMessageDto,
  ChatThreadDto,
  ExternalChannelMappingDto,
  SendMessageRequest,
  CreateExternalChannelRequest,
} from './types/chat';
export { ExternalPlatform, PlatformInfo } from './types/chat';
