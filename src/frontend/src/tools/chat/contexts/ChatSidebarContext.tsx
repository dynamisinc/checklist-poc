/**
 * ChatSidebarContext
 *
 * Manages the state for the chat sidebar including:
 * - Visibility (open/closed)
 * - Width (resizable, persisted to localStorage)
 *
 * The sidebar is available globally and can be toggled from the header.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// localStorage keys
const SIDEBAR_OPEN_KEY = 'cobra-chat-sidebar-open';
const SIDEBAR_WIDTH_KEY = 'cobra-chat-sidebar-width';

// Default and constraints for sidebar width
const DEFAULT_WIDTH = 350;
const MIN_WIDTH = 280;
const MAX_WIDTH = 600;

interface ChatSidebarContextValue {
  /** Whether the chat sidebar is visible */
  isOpen: boolean;
  /** Toggle sidebar visibility */
  toggleSidebar: () => void;
  /** Open the sidebar */
  openSidebar: () => void;
  /** Close the sidebar */
  closeSidebar: () => void;
  /** Current sidebar width in pixels */
  width: number;
  /** Set sidebar width (clamped to min/max) */
  setWidth: (width: number) => void;
  /** Minimum allowed width */
  minWidth: number;
  /** Maximum allowed width */
  maxWidth: number;
}

const ChatSidebarContext = createContext<ChatSidebarContextValue | null>(null);

interface ChatSidebarProviderProps {
  children: ReactNode;
}

export const ChatSidebarProvider: React.FC<ChatSidebarProviderProps> = ({ children }) => {
  // Initialize from localStorage or defaults
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_OPEN_KEY);
    return saved !== null ? saved === 'true' : false; // Default closed
  });

  const [width, setWidthState] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
        return parsed;
      }
    }
    return DEFAULT_WIDTH;
  });

  // Persist open state
  useEffect(() => {
    localStorage.setItem(SIDEBAR_OPEN_KEY, String(isOpen));
  }, [isOpen]);

  // Persist width
  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(width));
  }, [width]);

  const toggleSidebar = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const openSidebar = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsOpen(false);
  }, []);

  const setWidth = useCallback((newWidth: number) => {
    // Clamp to min/max
    const clampedWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth));
    setWidthState(clampedWidth);
  }, []);

  const value: ChatSidebarContextValue = {
    isOpen,
    toggleSidebar,
    openSidebar,
    closeSidebar,
    width,
    setWidth,
    minWidth: MIN_WIDTH,
    maxWidth: MAX_WIDTH,
  };

  return (
    <ChatSidebarContext.Provider value={value}>
      {children}
    </ChatSidebarContext.Provider>
  );
};

/**
 * Hook to access chat sidebar context
 */
export const useChatSidebar = (): ChatSidebarContextValue => {
  const context = useContext(ChatSidebarContext);
  if (!context) {
    throw new Error('useChatSidebar must be used within a ChatSidebarProvider');
  }
  return context;
};

export default ChatSidebarContext;
