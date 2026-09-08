import { useEffect, useRef } from 'react';
import { Message } from '../../types/chat';
import { MessageBubble } from './MessageBubble';
import { WelcomeScreen } from './WelcomeScreen';
import { AgentMode } from '../../types/chat';
import { BotIcon } from '../ui/Icons';

interface ChatAreaProps {
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  agentMode: AgentMode;
  onRetry?: (content: string) => void;
}

export function ChatArea({ messages, isStreaming, streamingContent, agentMode, onRetry }: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  if (messages.length === 0 && !isStreaming) {
    return <WelcomeScreen agentMode={agentMode} />;
  }

  const lastUserMessageIndex = [...messages].reverse().findIndex(m => m.role === 'user');
  const lastUserMessageGlobalIndex = lastUserMessageIndex >= 0 ? messages.length - 1 - lastUserMessageIndex : -1;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isLast={index === lastUserMessageGlobalIndex}
            onRetry={onRetry ? () => onRetry(message.content) : undefined}
          />
        ))}

        {isStreaming && streamingContent && (
          <MessageBubble
            message={{
              id: 'streaming',
              role: 'assistant',
              content: streamingContent,
              createdAt: new Date().toISOString(),
            }}
          />
        )}

        {isStreaming && !streamingContent && (
          <div className="flex justify-start animate-fade-in">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                <BotIcon className="w-4 h-4" />
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
                <div className="flex gap-1.5 items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
