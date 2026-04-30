import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Message } from '../types/message';
import { MessageItem } from '@/components/MessageItem';

interface Props {
  messages: Message[];
  onLoadMore?: () => void;
  isLoading?: boolean;
  hasMore?: boolean;
}

export const MessageList: React.FC<Props> = ({
  messages,
  onLoadMore,
  isLoading = false,
  hasMore = false
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const previousScrollHeight = useRef<number>(0);

  // Scroll to bottom on initial load or new messages
  useEffect(() => {
    if (shouldScrollToBottom && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldScrollToBottom]);

  // Handle scroll event for pagination
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || !onLoadMore || isLoading || !hasMore) return;

    // Check if user scrolled to top (within 100px threshold)
    if (container.scrollTop < 100) {
      // Save current scroll position
      previousScrollHeight.current = container.scrollHeight;
      setShouldScrollToBottom(false);
      onLoadMore();
    }

    // Check if user is near bottom to enable auto-scroll for new messages
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShouldScrollToBottom(isNearBottom);
  }, [onLoadMore, isLoading, hasMore]);

  // Restore scroll position after loading older messages
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container && previousScrollHeight.current > 0 && !isLoading) {
      const newScrollHeight = container.scrollHeight;
      const scrollDiff = newScrollHeight - previousScrollHeight.current;
      container.scrollTop = scrollDiff;
      previousScrollHeight.current = 0;
    }
  }, [messages, isLoading]);

  return (
    <div
      ref={scrollContainerRef}
      className='flex-1 overflow-y-auto px-4 py-2 space-y-1'
      onScroll={handleScroll}
    >
      {/* Loading indicator at top */}
      {isLoading && (
        <div className='flex justify-center py-2'>
          <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500'></div>
        </div>
      )}

      {/* Show message if no more messages to load */}
      {!hasMore && messages.length > 0 && (
        <p className='text-center text-gray-500 text-xs py-2'>
          Beginning of conversation
        </p>
      )}

      {/* Empty state */}
      {messages.length === 0 && !isLoading && (
        <p className='text-center text-gray-600 text-sm mt-10'>
          No messages yet. Start the conversation!
        </p>
      )}
      
      {/* Message list */}
      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} />
      ))}
      
      <div ref={bottomRef} />
    </div>
  );
};
