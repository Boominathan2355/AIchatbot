import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate, Navigate } from 'react-router-dom';
import { Conversation, AgentMode, Message, Attachment } from './types/chat';
import { api } from './services/api';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { ChatInput } from './components/chat/ChatInput';
import { SettingsModal } from './components/settings/SettingsModal';
import { LoginPage } from './components/auth/LoginPage';
import { useSettings } from './hooks/useSettings';
import { useTheme } from './hooks/useTheme';
import { useChat } from './hooks/useChat';
import { useAuth } from './contexts/AuthContext';
import { MenuIcon, SunIcon, MoonIcon, LogoutIcon, WrenchIcon } from './components/ui/Icons';
import { ToolsPanel } from './components/tools/ToolsPanel';
import { AuthProvider } from './contexts/AuthContext';
import { ProviderType } from './types/chat';

function ChatApp({ conversationId }: { conversationId: string | null }) {
  const { settings, updateSettings, showSettings, setShowSettings } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [agentMode, setAgentMode] = useState<AgentMode>('chat');
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [conversationLoaded, setConversationLoaded] = useState(false);
  const [showTools, setShowTools] = useState(false);

  const { messages, isStreaming, streamingContent, error, sendMessage, stopStreaming, clearMessages, setInitialMessages } = useChat(
    conversationId,
    settings.model,
    agentMode
  );

  useEffect(() => {
    loadConversations();
    loadModels();
  }, []);

  useEffect(() => {
    setConversationLoaded(false);
    if (conversationId) {
      loadConversationMessages(conversationId);
    } else {
      clearMessages();
      setConversationLoaded(true);
    }
  }, [conversationId]);

  const loadConversations = async () => {
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async () => {
    try {
      const data = await api.getModels(settings.provider, settings.baseUrl);
      setModels(data);
    } catch (err) {
      console.error('Failed to load models:', err);
      setModels([
        { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' },
        { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite' },
        { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite' },
        { id: 'gemini-nano', name: 'Gemini Nano' },
        { id: 'gpt-4o', name: 'GPT-4o' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
        { id: 'llama3', name: 'Llama 3' },
        { id: 'mistral', name: 'Mistral' },
        { id: 'codellama', name: 'CodeLlama' },
        { id: 'default', name: 'Local Model' },
      ]);
    }
  };

  const loadConversationMessages = async (id: string) => {
    try {
      const data = await api.getConversation(id);
      if (data?.messages) {
        setInitialMessages(data.messages);
        if (data.agentMode) {
          setAgentMode(data.agentMode as AgentMode);
        }
      } else {
        setInitialMessages([]);
      }
      setConversationLoaded(true);
    } catch (err) {
      console.error('Failed to load conversation:', err);
      setInitialMessages([]);
      setConversationLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setAgentMode('chat');
    clearMessages();
    setSidebarOpen(false);
    navigate('/chat');
  };

  const handleSelectConversation = (id: string) => {
    setSidebarOpen(false);
    navigate(`/chat/${id}`);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await api.deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (conversationId === id) {
        setAgentMode('chat');
        clearMessages();
        navigate('/chat');
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleSend = useCallback(async (content: string, attachments?: Attachment[]) => {
    let cid = conversationId || new URLSearchParams(window.location.search).get('id');

    if (!cid) {
      try {
        const conversation = await api.createConversation({
          title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
          model: settings.model,
          agentMode,
        });
        cid = conversation.id;
        navigate(`/chat/${conversation.id}`, { replace: true });
        setConversations(prev => [conversation, ...prev]);
      } catch (err) {
        console.error('Failed to create conversation:', err);
      }
    }

    await sendMessage(content, attachments, cid || undefined);
    loadConversations();
  }, [conversationId, settings.model, agentMode, sendMessage, navigate]);

  const handleRetry = useCallback(async (content: string) => {
    await sendMessage(content);
    loadConversations();
  }, [sendMessage]);

  const onRefreshModels = useCallback((provider: ProviderType, apiKey?: string, baseUrl?: string) => {
    api.getModels(provider, baseUrl).then((data) => {
      setModels(data);
    });
  }, []);

  return (
    <div className="flex h-screen bg-white dark:bg-[#171717]">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        activeId={conversationId}
        onSelect={handleSelectConversation}
        onDelete={handleDeleteConversation}
        onNewChat={handleNewChat}
        onOpenSettings={() => setShowSettings(true)}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#171717]">
        <header className="flex items-center justify-between px-4 h-14 flex-shrink-0 border-b border-gray-200/60 dark:border-gray-800 bg-white dark:bg-[#171717]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <MenuIcon className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowTools(true)}
              className="p-2 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Tools (MCP + Web free APIs)"
            >
              <WrenchIcon className="w-[1.125rem] h-[1.125rem]" />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <SunIcon className="w-[1.125rem] h-[1.125rem]" />
              ) : (
                <MoonIcon className="w-[1.125rem] h-[1.125rem]" />
              )}
            </button>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Log out"
            >
              <LogoutIcon className="w-[1.125rem] h-[1.125rem]" />
            </button>
          </div>
        </header>

        <ChatArea
          messages={messages}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          agentMode={agentMode}
          onRetry={handleRetry}
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
        />
      </main>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        models={models}
        onRefreshModels={onRefreshModels}
      />
      <ToolsPanel isOpen={showTools} onClose={() => setShowTools(false)} settings={settings} onUpdateSettings={updateSettings} />
    </div>
  );
}

function ChatRoute() {
  const { id } = useParams<{ id: string }>();
  return <ChatApp conversationId={id || null} />;
}

function App() {
  const { isLoading, isAuthenticated } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
        <div className="w-10 h-10 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginPage
        onToggleMode={() => setIsRegisterMode(!isRegisterMode)}
        isRegister={isRegisterMode}
      />
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/chat" replace />} />
      <Route path="/chat" element={<ChatRoute />} />
      <Route path="/chat/:id" element={<ChatRoute />} />
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
}

function Root() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default Root;