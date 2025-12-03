/**
 * Chat Tool
 *
 * Provides event-level chat functionality with support for
 * external platform integration (GroupMe, Signal, Teams, Slack).
 */

// Components
export { EventChat } from './components/EventChat';
export { ChatMessage } from './components/ChatMessage';
export { ChatSidebar } from './components/ChatSidebar';

// Contexts
export { ChatSidebarProvider, useChatSidebar } from './contexts/ChatSidebarContext';

// Pages
export { ChatPage } from './pages/ChatPage';
export { ChatAdminPage } from './pages/ChatAdminPage';

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
