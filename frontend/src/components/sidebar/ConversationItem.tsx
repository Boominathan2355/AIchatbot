import { Conversation } from '../../types/chat';
import { TrashIcon } from '../ui/Icons';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function ConversationItem({ conversation, isActive, onSelect, onDelete }: ConversationItemProps) {
  return (
    <div
      className={`group relative flex items-center gap-2.5 mx-2 px-3 py-2 rounded-xl cursor-pointer transition-all duration-150 ${
        isActive
          ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-700/50'
          : 'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-800/40'
      }`}
      onClick={onSelect}
    >
      <svg className="w-4 h-4 flex-shrink-0 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
      <span className="flex-1 text-[0.8125rem] truncate">{conversation.title}</span>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-1 text-gray-400 hover:text-red-500 transition-all rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        <TrashIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
