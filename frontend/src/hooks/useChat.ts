import { useState, useCallback, useRef } from 'react';
import { Message, Attachment, AgentMode, ProviderType } from '../types/chat';
import { api } from '../services/api';

export function useChat(
  conversationId: string | null,
  model: string,
  agentMode: AgentMode,
  provider: ProviderType = 'gemini',
  baseUrl?: string
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string, attachments?: Attachment[], overrideConversationId?: string) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return;
    if (isStreaming) return;

    setError(null);
    setIsStreaming(true);
    setStreamingContent('');

    const userMessage: Message = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      role: 'user',
      content,
      attachments: attachments?.map(a => ({
        id: a.id,
        fileName: a.fileName,
        fileType: a.fileType,
        fileSize: a.fileSize,
      })),
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const effectiveConversationId = overrideConversationId ?? conversationId;
      const stream = await api.chatStream(
        content,
        model,
        agentMode,
        attachments,
        effectiveConversationId || undefined,
        provider,
        baseUrl
      );
      const reader = stream.getReader();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullContent += value;
        setStreamingContent(fullContent);
      }

      if (fullContent) {
        const assistantMessage: Message = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
          role: 'assistant',
          content: fullContent,
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
      setStreamingContent('');
    } catch (err: any) {
      setStreamingContent('');
      if (err.name !== 'AbortError') {
        const errorMsg = err.message || 'Failed to get response. Make sure the backend server is running.';
        setError(errorMsg);
        const errorMessage: Message = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
          role: 'assistant',
          content: `**Error:** ${errorMsg}\n\nPlease make sure:\n1. The backend server is running on port 3001\n2. Your provider settings and API key / base URL are configured in Settings\n3. The selected model service is accessible`,
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [conversationId, model, agentMode, provider, baseUrl, isStreaming]);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
    setStreamingContent('');
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamingContent('');
    setError(null);
  }, []);

  const setInitialMessages = useCallback((msgs: Message[]) => {
    setMessages(msgs);
  }, []);

  return {
    messages,
    isStreaming,
    streamingContent,
    error,
    sendMessage,
    stopStreaming,
    clearMessages,
    setInitialMessages,
  };
}
