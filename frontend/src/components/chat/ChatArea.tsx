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

  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {messages.map((message, index) => {
          const isLast = index === messages.length - 1;
          const retryContent = message.role === 'user' ? message.content : lastUserMessage?.content;
          return (
          <MessageBubble
            key={message.id}
            message={message}
            isLast={isLast}
            onRetry={onRetry && retryContent ? () => onRetry(retryContent) : undefined}
          />
        )})}

        {isStreaming && streamingContent && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-2 mb-1 ml-11">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-full border border-violet-200 dark:border-violet-800">
                <span className="w-1.5 h-1.5 bg-violet-600 dark:bg-violet-400 rounded-full animate-pulse" />
                Live streaming
              </span>
              <span className="text-[11px] text-gray-400">{streamingContent.length} chars</span>
            </div>
            <MessageBubble
              message={{
                id: 'streaming',
                role: 'assistant',
                content: streamingContent + ' ▌',
                createdAt: new Date().toISOString(),
              }}
            />
          </div>
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
