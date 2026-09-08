import { useState, useRef, KeyboardEvent, ChangeEvent } from 'react';
import { Attachment, AgentMode, AGENT_MODES } from '../../types/chat';
import { TextArea } from '../ui/TextArea';
import { AttachmentBar } from './AttachmentBar';
import { Icon } from '../ui/IconMap';
import { SendIcon, StopIcon, ChevronDownIcon } from '../ui/Icons';

interface ChatInputProps {
  onSend: (message: string, attachments?: Attachment[]) => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  agentMode: AgentMode;
  onAgentModeChange: (mode: AgentMode) => void;
  disabled?: boolean;
}

export function ChatInput({
  onSend,
  isStreaming,
  onStopStreaming,
  agentMode,
  onAgentModeChange,
  disabled,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const canSend = (message.trim() || attachments.length > 0) && !isStreaming && !uploading;

  const handleSend = () => {
    if (!canSend) return;
    onSend(message, attachments.length > 0 ? attachments : undefined);
    setMessage('');
    setAttachments([]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>, isImage: boolean) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    const newAttachments: Attachment[] = [];

    for (const file of Array.from(files)) {
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(file);
        });

        const attachment: Attachment = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
          fileName: file.name,
          fileType: file.name.split('.').pop() || '',
          fileSize: file.size,
          base64Data: base64,
          mimeType: file.type,
        };

        if (isImage) {
          attachment.preview = URL.createObjectURL(file);
        }

        newAttachments.push(attachment);
      } catch (error) {
        console.error('Failed to read file:', error);
      }
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    setUploading(false);
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const currentMode = AGENT_MODES.find(m => m.mode === agentMode) || AGENT_MODES[0];

  return (
    <div className="border-t border-gray-200/60 dark:border-gray-800 bg-white dark:bg-[#171717]">
      {attachments.length > 0 && (
        <AttachmentBar
          attachments={attachments}
          onRemove={removeAttachment}
        />
      )}

      <div className="max-w-3xl mx-auto px-4 pt-3 pb-4">
        <div className="relative bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm focus-within:shadow-md focus-within:border-gray-300 dark:focus-within:border-gray-600 transition-all duration-200">
          <div className="flex items-end">
            {/* Attachments */}
            <div className="flex items-center gap-0.5 pl-2 pb-2.5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e, false)}
              />
              <input
                ref={imageInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e, true)}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || uploading}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                title="Upload document"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                </svg>
              </button>
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={disabled || uploading}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                title="Upload image"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
              </button>
            </div>

            {/* Text input */}
            <div className="flex-1 min-h-[24px] max-h-[200px] overflow-y-auto py-2.5">
              <TextArea
                value={message}
                onChange={setMessage}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                disabled={disabled || uploading}
                className="min-h-[24px] py-0"
              />
            </div>

            {/* Send button */}
            <div className="pr-2 pb-2.5">
              <button
                onClick={handleSend}
                disabled={!canSend}
                className={`p-2 rounded-xl transition-all duration-200 ${
                  canSend
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-200 shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                }`}
              >
                {isStreaming ? (
                  <StopIcon className="w-4 h-4" />
                ) : (
                  <SendIcon className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between mt-2 px-1">
          <div className="relative">
            <button
              onClick={() => setShowAgentMenu(!showAgentMenu)}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Icon name={currentMode.icon} className="w-3.5 h-3.5" />
              <span>{currentMode.label}</span>
              <ChevronDownIcon className={`w-3 h-3 transition-transform duration-200 ${showAgentMenu ? 'rotate-180' : ''}`} />
            </button>

            {showAgentMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAgentMenu(false)} />
                <div className="absolute bottom-full left-0 mb-2 w-[320px] bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/80 dark:border-gray-700/50 z-50 animate-fade-in overflow-hidden">
                  <div className="p-1.5 max-h-80 overflow-y-auto">
                    {AGENT_MODES.map(mode => (
                      <button
                        key={mode.mode}
                        onClick={() => {
                          onAgentModeChange(mode.mode);
                          setShowAgentMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150 ${
                          mode.mode === agentMode
                            ? 'bg-gray-100 dark:bg-gray-700/50 text-gray-900 dark:text-white'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                            mode.mode === agentMode
                              ? 'bg-gray-200 dark:bg-gray-600'
                              : 'bg-gray-100 dark:bg-gray-700/50'
                          }`}>
                            <Icon name={mode.icon} className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{mode.label}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{mode.description}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <p className="text-[0.6875rem] text-gray-400 dark:text-gray-500">
            Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
