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

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

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

    let fullContent = '';
    let reader: ReadableStreamDefaultReader<string> | undefined;

    try {
      const effectiveConversationId = overrideConversationId ?? conversationId;
      const stream = await api.chatStream(
        content,
        model,
        agentMode,
        attachments,
        effectiveConversationId || undefined,
        provider,
        baseUrl,
        abortController.signal
      );
      reader = stream.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullContent += value;
        setStreamingContent(fullContent);
      }

      if (fullContent && !abortController.signal.aborted) {
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
      if (err.name === 'AbortError') {
        // User pressed Stop: keep whatever streamed rather than dropping it.
        if (fullContent) {
          setMessages(prev => [...prev, {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
            role: 'assistant',
            content: fullContent + '\n\n_(stopped)_',
            createdAt: new Date().toISOString(),
          }]);
        }
      } else {
        const raw = err.message || 'Failed to get response. Make sure the backend server is running.';
        const isQuota = raw.includes('QUOTA_EXCEEDED') || raw.includes('429') || raw.toLowerCase().includes('quota') || raw.includes('Too Many Requests');
        let errorMsg = raw.replace('QUOTA_EXCEEDED: ', '');
        if (isQuota) {
          errorMsg = `🚨 **Quota exceeded (429)**\n\nYou exceeded your current quota on **${model}**. Please check your plan/billing at [ai.google.dev/gemini-api/docs/billing](https://ai.google.dev/gemini-api/docs/billing) or try again later.\n\n**Fix now:**\n1. Wait 60s and click **Retry** (last message) – fallback may work\n2. Switch provider/model in **Settings** → try \`gemini-3.5-flash-lite\` / \`gemini-nano\` / \`Ollama\` / \`ChatGPT\`\n3. Check Google Cloud **Billing** and **API Quotas**\n\nDetails: ${errorMsg}`;
        } else {
          errorMsg = `**Error:** ${errorMsg}\n\nPlease make sure:\n1. The backend server is running\n2. Your provider settings and API key / base URL are configured in Settings\n3. The selected model service is accessible\n\nRaw: ${raw}`;
        }
        setError(errorMsg);
        const errorMessage: Message = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
          role: 'assistant',
          content: errorMsg,
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
    // Aborting the controller tears down the fetch and the reader; the
    // in-flight sendMessage resolves through its AbortError path.
    abortControllerRef.current?.abort();
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
