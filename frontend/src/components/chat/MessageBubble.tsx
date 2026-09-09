import { useState, useRef, useEffect } from 'react';
import { Message } from '../../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ThinkingBlock, parseThinking } from './ThinkingBlock';
import { BotIcon, UserIcon, CopyIcon, CheckIcon, ShareIcon, MailIcon, DownloadIcon } from '../ui/Icons';

interface MessageBubbleProps {
  message: Message;
  isLast?: boolean;
  onRetry?: () => void;
}

export function MessageBubble({ message, isLast, onRetry }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareAction, setShareAction] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const isUser = message.role === 'user';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyMarkdown = async () => {
    await navigator.clipboard.writeText(message.content);
    setShareAction('copied-md');
    setTimeout(() => setShareAction(''), 2000);
  };

  const handleShareEmail = async () => {
    const subject = encodeURIComponent('AI Chat Response');
    const body = encodeURIComponent(message.content);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    setShowShareMenu(false);
  };

  const handleCopyAsText = async () => {
    const plain = message.content
      .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*\n?/g, '').replace(/```/g, ''))
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/~~([^~]+)~~/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^\s*[-*+]\s+/gm, '• ')
      .replace(/^\s*\d+\.\s+/gm, (m) => m);
    await navigator.clipboard.writeText(plain);
    setShareAction('copied-text');
    setTimeout(() => setShareAction(''), 2000);
    setShowShareMenu(false);
  };

  const handleDownload = () => {
    const blob = new Blob([message.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-response-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowShareMenu(false);
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
            {(() => {
              if (isUser) return <p className="text-[0.875rem] leading-relaxed whitespace-pre-wrap">{message.content}</p>;
              const { thinking, answer } = parseThinking(message.content);
              return (
                <>
                  {thinking && <ThinkingBlock thinking={thinking} />}
                  <MarkdownRenderer content={answer} />
                </>
              );
            })()}

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

            {/* Share dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Share"
              >
                <ShareIcon className="w-3.5 h-3.5" />
              </button>

              {showShareMenu && (
                <div className="absolute bottom-full mb-1 left-0 z-50 w-52 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
                  <button
                    onClick={() => { handleCopy(); setShowShareMenu(false); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <CopyIcon className="w-4 h-4" />
                    Copy as Markdown
                  </button>
                  <button
                    onClick={handleCopyAsText}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <CopyIcon className="w-4 h-4" />
                    {shareAction === 'copied-text' ? 'Copied!' : 'Copy as Plain Text'}
                  </button>
                  <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                  <button
                    onClick={handleShareEmail}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <MailIcon className="w-4 h-4" />
                    Share via Email
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    Download as .md
                  </button>
                </div>
              )}
            </div>

            {isLast && onRetry && (
              <button
                onClick={onRetry}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                title={isUser ? "Retry" : "Regenerate answer"}
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
