import { useState, useCallback, useEffect } from 'react';
import { Message } from '../types/message';

interface UseMessagesOptions {
  roomId?: string;
  pageSize?: number;
}

export function useMessages(options: UseMessagesOptions = {}) {
  const { roomId, pageSize = 50 } = options;
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // Load initial messages
  useEffect(() => {
    if (roomId) {
      loadMessages(0, true);
    }
  }, [roomId]);

  const loadMessages = useCallback(async (currentOffset: number, isInitial = false) => {
    if (!roomId || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/messages?room_id=${roomId}&limit=${pageSize}&offset=${currentOffset}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      const fetchedMessages = data.messages || [];

      // Transform API messages to Message type
      const transformedMessages: Message[] = fetchedMessages.map((msg: any) => ({
        id: msg.id,
        text: msg.content,
        sender: msg.profiles?.display_name || 'Anonymous',
        timestamp: new Date(msg.created_at),
        isOwn: false, // Will be set by the component based on user context
        isEncrypted: msg.is_encrypted || false,
      }));

      if (isInitial) {
        // Reverse for chronological order (API returns descending)
        setMessages(transformedMessages.reverse());
      } else {
        // Prepend older messages (they come in descending order, so reverse them)
        setMessages((prev) => [...transformedMessages.reverse(), ...prev]);
      }

      setHasMore(fetchedMessages.length === pageSize);
      setOffset(currentOffset + fetchedMessages.length);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, pageSize, isLoading]);

  const loadMoreMessages = useCallback(() => {
    if (hasMore && !isLoading) {
      loadMessages(offset);
    }
  }, [hasMore, isLoading, offset, loadMessages]);

  const addMessage = useCallback((msg: Omit<Message, 'id' | 'timestamp'>) => {
    const newMsg: Message = {
      ...msg,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMsg]);
  }, []);

  return {
    messages,
    addMessage,
    loadMoreMessages,
    isLoading,
    hasMore
  };
}
