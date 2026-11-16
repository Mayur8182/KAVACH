'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { Crisp } from 'crisp-sdk-web';

/**
 * Custom Kavach-Branded Crisp Live Chat Integration
 *
 * 1. Initializes Crisp once via `Crisp.configure()` with strict SSR guards.
 * 2. Hides the default Crisp floating bubble launcher using official `Crisp.chat.hide()`.
 * 3. Renders a custom Kavach-branded floating launcher:
 *    - Squircle/square-rounded clean white background
 *    - Authentic Kavach 3D geometric cube emblem
 *    - Subtle border, elevation shadow, and vibrant blue live support accent dot
 *    - Accessible labels, full keyboard interaction, and mobile-responsive layout.
 * 4. Toggles Crisp chat smoothly via official `Crisp.chat.open()` and `Crisp.chat.close()`.
 */
export function CrispChat(): React.ReactElement | null {
  const isInitialized = useRef<boolean>(false);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    // SSR guard
    if (typeof window === 'undefined') {
      return;
    }

    const websiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;

    // Fail gracefully if Website ID is not configured
    if (!websiteId || websiteId.trim() === '') {
      return;
    }

    // Initialize Crisp only once
    if (!isInitialized.current && !Crisp.isCrispInjected()) {
      try {
        Crisp.configure(websiteId.trim());
        isInitialized.current = true;
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Crisp] Failed to configure chat SDK:', error);
        }
        return;
      }
    } else {
      isInitialized.current = true;
    }

    setIsConfigured(true);

    // Immediately hide the default Crisp launcher bubble
    try {
      Crisp.chat.hide();
    } catch {
      // Buffer command safely
      if (Array.isArray((window as any).$crisp)) {
        (window as any).$crisp.push(['do', 'chat:hide']);
      }
    }

    // Handlers for chat open/close events
    const handleChatOpened = () => {
      setIsOpen(true);
      setUnreadCount(0);
    };

    const handleChatClosed = () => {
      setIsOpen(false);
      // Ensure default launcher remains hidden when user closes chat window
      try {
        Crisp.chat.hide();
      } catch {
        // Fallback
      }
    };

    const handleMessageReceived = () => {
      try {
        const count = Crisp.chat.unreadCount() || 0;
        setUnreadCount(count);
      } catch {
        // Fallback
      }
    };

    try {
      Crisp.chat.onChatOpened(handleChatOpened);
      Crisp.chat.onChatClosed(handleChatClosed);
      Crisp.message.onMessageReceived(handleMessageReceived);
    } catch {
      // Ignore if event listeners are buffering
    }

    return () => {
      try {
        Crisp.chat.offChatOpened(handleChatOpened);
        Crisp.chat.offChatClosed(handleChatClosed);
        Crisp.message.offMessageReceived(handleMessageReceived);
      } catch {
        // Cleanup fallback
      }
    };
  }, []);

  const handleToggleChat = useCallback(() => {
    if (!isConfigured) return;

    try {
      if (isOpen) {
        Crisp.chat.close();
        Crisp.chat.hide();
        setIsOpen(false);
      } else {
        Crisp.chat.show();
        Crisp.chat.open();
        setIsOpen(true);
        setUnreadCount(0);
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Crisp] Failed to toggle chat window:', err);
      }
    }
  }, [isConfigured, isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggleChat();
      }
    },
    [handleToggleChat]
  );

  // If Crisp is not configured or in SSR, render nothing
  if (!isConfigured) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleToggleChat}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={isOpen ? -1 : 0}
      aria-label={isOpen ? 'Close Kavach Security live chat' : 'Open Kavach Security live chat'}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      title={isOpen ? 'Close live chat' : 'Chat with Kavach Security'}
      className={`group fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[9999] flex items-center justify-center bg-white rounded-2xl border border-slate-200/90 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.14),0_4px_10px_-2px_rgba(15,23,42,0.06)] hover:shadow-[0_14px_30px_-5px_rgba(37,99,235,0.22),0_6px_14px_-2px_rgba(15,23,42,0.08)] hover:border-blue-500/50 hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 cursor-pointer select-none ${
        isOpen ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 pointer-events-auto scale-100'
      }`}
      style={{
        width: '56px',
        height: '56px',
        borderRadius: '16px',
      }}
    >
      {/* Small Vibrant Blue Live Accent Dot / Unread Badge */}
      {unreadCount > 0 ? (
        <span
          className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10.5px] font-bold text-white bg-blue-600 border-2 border-white rounded-full shadow-sm animate-bounce"
          aria-label={`${unreadCount} unread messages`}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      ) : (
        <span
          className="absolute -top-1 -right-1 flex h-3.5 w-3.5"
          title="Security support online"
        >
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-600 border-2 border-white shadow-xs" />
        </span>
      )}

      {/* Button Content: Kavach 3D Cube Emblem or Close Icon */}
      {isOpen ? (
        <X
          size={22}
          className="text-slate-700 transition-transform duration-200 group-hover:rotate-90"
        />
      ) : (
        <img
          src="/kavach-cube.png"
          alt="Kavach Security"
          width={28}
          height={30}
          className="w-7 h-7 object-contain transition-transform duration-200 group-hover:scale-110 drop-shadow-xs"
          loading="eager"
          decoding="async"
        />
      )}
    </button>
  );
}
