"use client";

import { AnimatePresence } from "framer-motion";
import { useRef, useLayoutEffect, useEffect } from "react";
import type { Message, Conversation } from "@/lib/types";
import MessageBubble from "./messageBubble";
import { Loader2 } from "lucide-react";

interface Props {
  messages: Message[];
  conversation: Conversation;
  onOpenMenu: (msg: Message, rect: DOMRect) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onReply: (message: Message) => void;
  setInputValue: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

export default function ChatMessages({
  messages,
  conversation,
  onOpenMenu,
  messagesEndRef,
  onReply,
  setInputValue,
  inputRef,
  hasMore,
  loadingMore,
  onLoadMore,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const prevMessagesLengthRef = useRef<number>(messages.length);

  const isAtBottomRef = useRef(true); // Default to true so initial load sticks to bottom

  // 1. ResizeObserver: Handle dynamic content changes (images loading)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !contentRef.current) return;

    const observer = new ResizeObserver(() => {
      // If we are currently at the bottom (or were before resize), and NOT loading history
      if (isAtBottomRef.current && !loadingMore) {
        container.scrollTop = container.scrollHeight;
      }
    });

    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [loadingMore]);

  // 2. LayoutEffect: Handle Message List Changes (Append/Prepend)
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // HISTORY LOAD (Prepend)
    if (!loadingMore && prevScrollHeightRef.current > 0) {
      if (messages.length > prevMessagesLengthRef.current) {
        const currentScrollHeight = container.scrollHeight;
        const diff = currentScrollHeight - prevScrollHeightRef.current;
        if (diff > 0) {
          container.scrollTop = diff;
          // We are NO LONGER at bottom after prepending (obviously)
          isAtBottomRef.current = false;
        }
      }
      prevScrollHeightRef.current = 0;
    }
    // NEW MESSAGES (Append) or INITIAL LOAD
    else {
      // If we were at bottom, OR it's a huge jump (initial load assumption)
      if (isAtBottomRef.current || messages.length === 0) {
        container.scrollTop = container.scrollHeight;
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, loadingMore]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

    // Check if user is near bottom (within 100px)
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    isAtBottomRef.current = distanceToBottom < 100;

    // Trigger load more when near top
    if (scrollTop < 50 && hasMore && !loadingMore) {
      prevScrollHeightRef.current = scrollHeight;
      onLoadMore();
    }
  };

  const isNewDay = (a: string, b: string) =>
    new Date(a).toDateString() !== new Date(b).toDateString();

  const getDateLabel = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="relative z-10 h-full overflow-hidden flex flex-col">
      {/* Loading Indicator Overlay */}
      <AnimatePresence>
        {loadingMore && (
          <div className="absolute top-4 left-0 right-0 flex justify-center z-50 pointer-events-none">
            <div className="bg-background/80 backdrop-blur-md p-2 rounded-full shadow-lg border border-border flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs font-medium">Loading messages...</span>
            </div>
          </div>
        )}
      </AnimatePresence>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4"
      >
        <div ref={contentRef} className="space-y-2">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <div key={msg.id}>
                {(i === 0 ||
                  isNewDay(messages[i - 1].timestamp, msg.timestamp)) && (
                  <div className="flex justify-center my-4">
                    <span className="px-3 py-1 text-xs rounded-full bg-secondary/50 text-muted-foreground shadow-sm font-medium backdrop-blur-sm border border-border/50">
                      {getDateLabel(msg.timestamp)}
                    </span>
                  </div>
                )}

                <MessageBubble
                  message={msg}
                  conversation={conversation}
                  onOpenMenu={onOpenMenu}
                  allMessages={messages}
                  onReply={onReply}
                  setInputValue={setInputValue}
                  inputRef={inputRef}
                  shouldAnimate={i === messages.length - 1 && !loadingMore}
                />
              </div>
            ))}
          </AnimatePresence>
          {/* Bottom Ref */}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
