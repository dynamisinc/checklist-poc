import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  Divider,
} from "@mui/material";
import { ChatMessage } from "./ChatMessage";
import { PromoteToLogbookDialog } from "./PromoteToLogbookDialog";
import {
  ChatMessageDto,
  ExternalChannelMappingDto,
  ExternalPlatform,
  PlatformInfo,
} from "../../types/chat.types";

/**
 * Props for the EventChat component.
 */
interface EventChatProps {
  /** The event ID for this chat */
  eventId: string;

  /** Current user's ID */
  currentUserId: string;

  /** Chat thread ID */
  chatThreadId: string;

  /** External channel mappings for this event (GroupMe, etc.) */
  externalChannels?: ExternalChannelMappingDto[];

  /** Initial messages to display */
  initialMessages?: ChatMessageDto[];

  /** Available logbook categories for promotion */
  logbookCategories?: { id: string; name: string }[];

  /** Callback to send a new message */
  onSendMessage: (message: string) => Promise<void>;

  /** Callback to load more messages (pagination) */
  onLoadMore?: (skip: number, take: number) => Promise<ChatMessageDto[]>;

  /** Callback to promote a message to logbook */
  onPromoteToLogbook?: (
    messageId: string,
    categoryId?: string,
    notes?: string
  ) => Promise<void>;

  /** SignalR connection for real-time updates */
  signalRConnection?: signalR.HubConnection;
}

/**
 * EventChat component provides the main chat interface for an event.
 *
 * Features:
 * - Real-time messaging via SignalR
 * - Support for external messages (GroupMe, etc.) with visual indicators
 * - Message promotion to logbook entries
 * - Auto-scroll to new messages
 * - Message pagination (load more)
 *
 * Matches the existing C5 chat design with enhancements for external messaging.
 */
export const EventChat: React.FC<EventChatProps> = ({
  eventId,
  currentUserId,
  chatThreadId,
  externalChannels = [],
  initialMessages = [],
  logbookCategories = [],
  onSendMessage,
  onLoadMore,
  onPromoteToLogbook,
  signalRConnection,
}) => {
  // State
  const [messages, setMessages] = useState<ChatMessageDto[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessageDto | null>(
    null
  );
  const [promoteError, setPromoteError] = useState<string>();
  const [isPromoting, setIsPromoting] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Subscribe to SignalR for real-time messages
  useEffect(() => {
    if (!signalRConnection) return;

    const handleNewMessage = (notification: {
      type: string;
      payload: ChatMessageDto;
    }) => {
      if (notification.type === "ChatMessageCreated") {
        setMessages((prev) => [...prev, notification.payload]);
      }
    };

    signalRConnection.on("ReceiveNotification", handleNewMessage);

    return () => {
      signalRConnection.off("ReceiveNotification", handleNewMessage);
    };
  }, [signalRConnection]);

  // Handle sending a new message
  const handleSend = async () => {
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(trimmedMessage);
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
      // Could show a snackbar here
    } finally {
      setIsSending(false);
    }
  };

  // Handle Enter key to send
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  // Handle loading more messages
  const handleLoadMore = async () => {
    if (!onLoadMore || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const olderMessages = await onLoadMore(messages.length, 50);
      setMessages((prev) => [...olderMessages, ...prev]);
    } catch (error) {
      console.error("Failed to load more messages:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Handle promote to logbook
  const handlePromoteToLogbook = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (message) {
      setSelectedMessage(message);
      setPromoteError(undefined);
      setPromoteDialogOpen(true);
    }
  };

  const handleConfirmPromote = async (
    messageId: string,
    categoryId?: string,
    notes?: string
  ) => {
    if (!onPromoteToLogbook) return;

    setIsPromoting(true);
    setPromoteError(undefined);

    try {
      await onPromoteToLogbook(messageId, categoryId, notes);

      // Update the message in local state to show it's been promoted
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, promotedToLogbookEntryId: "pending" }
            : m
        )
      );

      setPromoteDialogOpen(false);
      setSelectedMessage(null);
    } catch (error) {
      setPromoteError("Failed to create logbook entry. Please try again.");
    } finally {
      setIsPromoting(false);
    }
  };

  // Handle copy message
  const handleCopyMessage = (message: string) => {
    navigator.clipboard.writeText(message);
    // Could show a snackbar here
  };

  // Get active external channels
  const activeExternalChannels = externalChannels.filter((c) => c.isActive);

  return (
    <Paper
      elevation={0}
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: "#FFFFFF",
        border: "1px solid #848482",
        borderRadius: 1,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
          borderBottom: "1px solid #E0E0E0",
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
          Event Chat
        </Typography>

        {/* External channel indicators */}
        {activeExternalChannels.length > 0 && (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {activeExternalChannels.map((channel) => {
              const platformInfo = PlatformInfo[channel.platform];
              return (
                <Tooltip
                  key={channel.id}
                  title={`Connected to ${channel.externalGroupName}`}
                >
                  <Chip
                    size="small"
                    icon={
                      <i
                        className={platformInfo?.icon || "fa-light fa-link"}
                        style={{ fontSize: "0.75rem" }}
                      />
                    }
                    label={platformInfo?.name || "External"}
                    sx={{
                      height: 24,
                      fontSize: "0.75rem",
                      bgcolor: `${platformInfo?.color || "#666"}20`,
                      color: platformInfo?.color || "#666",
                      "& .MuiChip-icon": {
                        color: platformInfo?.color || "#666",
                      },
                    }}
                  />
                </Tooltip>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Messages Container */}
      <Box
        ref={messagesContainerRef}
        sx={{
          flex: 1,
          overflow: "auto",
          py: 1,
          bgcolor: "#F8F8F8",
        }}
      >
        {/* Load More Button */}
        {onLoadMore && (
          <Box sx={{ textAlign: "center", py: 1 }}>
            <Chip
              label={isLoadingMore ? "Loading..." : "Load earlier messages"}
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              size="small"
              sx={{ cursor: "pointer" }}
            />
          </Box>
        )}

        {/* Messages */}
        {messages.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "text.secondary",
            }}
          >
            <Typography variant="body2">
              No messages yet. Start the conversation!
            </Typography>
          </Box>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isOwnMessage={message.createdById === currentUserId}
              currentUserId={currentUserId}
              onPromoteToLogbook={handlePromoteToLogbook}
              onCopyMessage={handleCopyMessage}
            />
          ))
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          gap: 1,
          p: 1.5,
          borderTop: "1px solid #E0E0E0",
          bgcolor: "#FFFFFF",
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isSending}
          size="small"
          sx={{
            "& .MuiOutlinedInput-root": {
              bgcolor: "#FFFFFF",
            },
          }}
        />

        <IconButton
          onClick={handleSend}
          disabled={!newMessage.trim() || isSending}
          sx={{
            color: "#0020C2",
            "&:disabled": { color: "#C0C0C0" },
          }}
        >
          {isSending ? (
            <CircularProgress size={24} />
          ) : (
            <i className="fa-light fa-paper-plane-top" />
          )}
        </IconButton>
      </Box>

      {/* Promote to Logbook Dialog */}
      <PromoteToLogbookDialog
        open={promoteDialogOpen}
        message={selectedMessage}
        categories={logbookCategories}
        isLoading={isPromoting}
        error={promoteError}
        onClose={() => {
          setPromoteDialogOpen(false);
          setSelectedMessage(null);
        }}
        onConfirm={handleConfirmPromote}
      />
    </Paper>
  );
};

export default EventChat;
