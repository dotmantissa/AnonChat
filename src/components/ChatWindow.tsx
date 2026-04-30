import React, { useCallback } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useMessages } from '../hooks/useMessages';
import { useChatSubscription } from '../hooks/useChatSubscription';

interface Props {
  walletAddress: string;
  sdk: any;
  onSendToChain?: (text: string) => Promise<void>;
  roomId?: string;
}

export const ChatWindow: React.FC<Props> = ({
  walletAddress,
  sdk,
  onSendToChain,
  roomId
}) => {
  const {
    messages,
    addMessage,
    loadMoreMessages,
    isLoading,
    hasMore
  } = useMessages({ roomId, pageSize: 50 });

  useChatSubscription(sdk, addMessage);

  const handleSend = useCallback(async (text: string) => {
    addMessage({ text, sender: walletAddress, isOwn: true, isEncrypted: true });
    try {
      await onSendToChain?.(text);
    } catch (err) {
      console.error('Failed to send message to chain:', err);
    }
  }, [addMessage, walletAddress, onSendToChain]);

  return (
    <div className='flex flex-col h-full bg-gray-950 text-gray-100'>
      <MessageList
        messages={messages}
        onLoadMore={loadMoreMessages}
        isLoading={isLoading}
        hasMore={hasMore}
      />
      <MessageInput onSend={handleSend} />
    </div>
  );
};
