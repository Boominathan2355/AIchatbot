import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Conversation, AgentMode, Attachment, ModelInfo, ProviderType } from '../types';
import { apiClient } from '../services/apiClient';
import { Sidebar } from '../components/sidebar/Sidebar';
import { MessageList } from '../components/chat/MessageList';
import { ChatInput } from '../components/chat/ChatInput';
import { SettingsModal } from '../components/settings/SettingsModal';
import { useSettings } from '../hooks/useSettings';
import { useTheme } from '../hooks/useTheme';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../contexts/AuthContext';
import { MenuIcon, SunIcon, MoonIcon, LogoutIcon } from '../components/ui/Icons';

const TITLE_PREVIEW_LENGTH = 50;

/** Shown when the models endpoint cannot be reached at all. */
const OFFLINE_MODELS: ModelInfo[] = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'llama3', name: 'Llama 3' },
  { id: 'mistral', name: 'Mistral' },
  { id: 'codellama', name: 'CodeLlama' },
  { id: 'default', name: 'Local Model' },
];

interface ChatPageProps {
  conversationId: string | null;
}

export function ChatPage({ conversationId }: ChatPageProps) {
  const { settings, updateSettings, showSettings, setShowSettings } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [agentMode, setAgentMode] = useState<AgentMode>('chat');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [conversationLoaded, setConversationLoaded] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');

  const { messages, isStreaming, streamingContent, error, sendMessage, stopStreaming, clearMessages, setInitialMessages } = useChat(
    conversationId,
    settings.model,
    agentMode,
    settings.provider,
    settings.baseUrl
  );

  const loadConversations = useCallback(async () => {
    try {
      setConversations(await apiClient.listConversations());
    } catch (caught) {
      console.error('Failed to load conversations:', caught);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadModels = useCallback(async (provider: ProviderType, baseUrl?: string) => {
    try {
      setModels(await apiClient.listModels(provider, baseUrl));
    } catch (caught) {
      console.error('Failed to load models:', caught);
      setModels(OFFLINE_MODELS);
    }
  }, []);

  const loadConversation = useCallback(
    async (id: string) => {
      try {
        const conversation = await apiClient.getConversation(id);
        setInitialMessages(conversation?.messages ?? []);
        if (conversation?.agentMode) setAgentMode(conversation.agentMode as AgentMode);
      } catch (caught) {
        console.error('Failed to load conversation:', caught);
        setInitialMessages([]);
      } finally {
        setConversationLoaded(true);
        setLoading(false);
      }
    },
    [setInitialMessages]
  );

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    loadModels(settings.provider, settings.baseUrl);
  }, [loadModels, settings.provider, settings.baseUrl]);

  useEffect(() => {
    setConversationLoaded(false);
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      clearMessages();
      setConversationLoaded(true);
    }
  }, [conversationId, loadConversation, clearMessages]);

  const startNewChat = () => {
    setAgentMode('chat');
    clearMessages();
    setSidebarOpen(false);
    navigate('/chat');
  };

  const openConversation = (id: string) => {
    setSidebarOpen(false);
    navigate(`/chat/${id}`);
  };

  const removeConversation = async (id: string) => {
    try {
      await apiClient.deleteConversation(id);
      setConversations((previous) => previous.filter((conversation) => conversation.id !== id));
      if (conversationId === id) startNewChat();
    } catch (caught) {
      console.error('Failed to delete conversation:', caught);
    }
  };

  const handleSend = useCallback(
    async (content: string, attachments?: Attachment[]) => {
      // Older links used ?id=; the route parameter is the primary source.
      let activeConversationId = conversationId || new URLSearchParams(window.location.search).get('id');

      if (!activeConversationId) {
        try {
          const conversation = await apiClient.createConversation({
            title: content.slice(0, TITLE_PREVIEW_LENGTH) + (content.length > TITLE_PREVIEW_LENGTH ? '...' : ''),
            model: settings.model,
            agentMode,
          });
          activeConversationId = conversation.id;
          navigate(`/chat/${conversation.id}`, { replace: true });
          setConversations((previous) => [conversation, ...previous]);
        } catch (caught) {
          console.error('Failed to create conversation:', caught);
        }
      }

      await sendMessage(content, attachments, activeConversationId || undefined);
      loadConversations();
    },
    [conversationId, settings.model, agentMode, sendMessage, navigate, loadConversations]
  );

  const handleRetry = useCallback(
    async (content: string) => {
      await sendMessage(content);
      loadConversations();
    },
    [sendMessage, loadConversations]
  );

  const handleRefreshModels = useCallback(
    (provider: ProviderType, _apiKey?: string, baseUrl?: string) => {
      loadModels(provider, baseUrl);
    },
    [loadModels]
  );

  return (
    <div className="flex h-screen bg-white dark:bg-[#171717]">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        activeId={conversationId}
        onSelect={openConversation}
        onDelete={removeConversation}
        onNewChat={startNewChat}
        onOpenSettings={() => setShowSettings(true)}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#171717]">
        <header className="flex items-center justify-between px-4 h-14 flex-shrink-0 border-b border-gray-200/60 dark:border-gray-800 bg-white dark:bg-[#171717]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Open sidebar"
          >
            <MenuIcon className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-0.5">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <SunIcon className="w-[1.125rem] h-[1.125rem]" /> : <MoonIcon className="w-[1.125rem] h-[1.125rem]" />}
            </button>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Log out"
              aria-label="Log out"
            >
              <LogoutIcon className="w-[1.125rem] h-[1.125rem]" />
            </button>
          </div>
        </header>

        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          agentMode={agentMode}
          onRetry={handleRetry}
          onSuggestionClick={(text) => setSuggestionText(text)}
        />

        {error && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <ChatInput
          onSend={handleSend}
          isStreaming={isStreaming}
          onStopStreaming={stopStreaming}
          agentMode={agentMode}
          onAgentModeChange={setAgentMode}
          disabled={loading || !conversationLoaded}
          suggestionText={suggestionText}
        />
      </main>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        models={models}
        onRefreshModels={handleRefreshModels}
      />
    </div>
  );
}
