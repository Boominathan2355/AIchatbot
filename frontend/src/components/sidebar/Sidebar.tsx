import { Conversation } from '../../types';
import { ConversationList } from './ConversationList';
import { PlusIcon, SettingsIcon, CloseIcon, BotIcon } from '../ui/Icons';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
}

export function Sidebar({
  isOpen,
  onClose,
  conversations,
  activeId,
  onSelect,
  onDelete,
  onNewChat,
  onOpenSettings,
}: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-[280px] bg-gray-50/80 dark:bg-[#171717] border-r border-gray-200/60 dark:border-gray-800 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center">
              <BotIcon className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium text-gray-900 dark:text-white text-[0.8125rem] tracking-tight">AI Agent Chatbot</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat */}
        <div className="px-3 pb-2">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl transition-all duration-150 font-medium text-[0.8125rem] shadow-sm hover:shadow"
          >
            <PlusIcon className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Conversations */}
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={onSelect}
          onDelete={onDelete}
        />

        {/* Settings */}
        <div className="px-3 py-2 mt-auto flex-shrink-0">
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800 rounded-xl transition-colors text-[0.8125rem]"
          >
            <SettingsIcon className="w-4 h-4" />
            Settings
          </button>
        </div>
      </aside>
    </>
  );
}
