import { useState } from 'react';
import { Message } from '../../types/chat';
import { MarkdownRenderer } from './MarkdownRenderer';
import { BotIcon, UserIcon, CopyIcon, CheckIcon } from '../ui/Icons';

interface MessageBubbleProps {
  message: Message;
  isLast?: boolean;
  onRetry?: () => void;
}

export function MessageBubble({ message, isLast, onRetry }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in group/msg`}>
      <div className={`flex gap-2.5 max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${
          isUser
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            : 'bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 text-white shadow-sm shadow-purple-500/20'
        }`}>
          {isUser ? (
            <UserIcon className="w-3.5 h-3.5" />
          ) : (
            <BotIcon className="w-3.5 h-3.5" />
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-1 min-w-0">
          <div className={`rounded-2xl px-4 py-2.5 ${
            isUser
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
              : 'bg-transparent text-gray-900 dark:text-white'
          }`}>
            {isUser ? (
              <p className="text-[0.875rem] leading-relaxed whitespace-pre-wrap">{message.content}</p>
            ) : (
              <MarkdownRenderer content={message.content} />
            )}

            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-2">
                  {message.attachments.map(attachment => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-1.5 px-2 py-1 bg-white/10 dark:bg-black/10 rounded text-xs"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                      </svg>
                      <span className="truncate max-w-[100px]">{attachment.fileName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className={`flex items-center gap-0.5 px-1 ${isUser ? 'justify-end' : 'justify-start'} opacity-0 group-hover/msg:opacity-100 transition-opacity duration-200`}>
            <button
              onClick={handleCopy}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Copy"
            >
              {copied ? (
                <CheckIcon className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <CopyIcon className="w-3.5 h-3.5" />
              )}
            </button>
            {isUser && isLast && onRetry && (
              <button
                onClick={onRetry}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Retry"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
