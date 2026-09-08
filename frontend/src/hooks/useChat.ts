import { useState, useCallback, useRef } from 'react';
import { Message, Attachment, AgentMode, ProviderType } from '../types';
import { apiClient } from '../services/apiClient';

const QUOTA_ERROR_PREFIX = 'QUOTA_EXCEEDED: ';

function createMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
}

function createMessage(role: Message['role'], content: string, attachments?: Message['attachments']): Message {
  return { id: createMessageId(), role, content, attachments, createdAt: new Date().toISOString() };
}

function isQuotaError(message: string): boolean {
  return (
    message.includes('QUOTA_EXCEEDED') ||
    message.includes('429') ||
    message.toLowerCase().includes('quota') ||
    message.includes('Too Many Requests')
  );
}

function formatChatError(rawMessage: string, model: string): string {
  const details = rawMessage.replace(QUOTA_ERROR_PREFIX, '');

  if (isQuotaError(rawMessage)) {
    return (
      `🚨 **Quota exceeded (429)**\n\n` +
      `You exceeded your current quota on **${model}**. Please check your plan/billing at ` +
      `[ai.google.dev/gemini-api/docs/billing](https://ai.google.dev/gemini-api/docs/billing) or try again later.\n\n` +
      `**Fix now:**\n` +
      `1. Wait 60s and click **Retry** (last message) – fallback may work\n` +
      `2. Switch provider/model in **Settings** → try \`gemini-2.5-flash-lite\`, Ollama or ChatGPT\n` +
      `3. Check Google Cloud **Billing** and **API Quotas**\n\n` +
      `Details: ${details}`
    );
  }

  return (
    `**Error:** ${details}\n\nPlease make sure:\n` +
    `1. The backend server is running\n` +
    `2. Your provider settings and API key / base URL are configured in Settings\n` +
    `3. The selected model service is accessible\n\n` +
    `Raw: ${rawMessage}`
  );
}

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

  const sendMessage = useCallback(
    async (content: string, attachments?: Attachment[], overrideConversationId?: string) => {
      if (!content.trim() && (!attachments || attachments.length === 0)) return;
      if (isStreaming) return;

      setError(null);
      setIsStreaming(true);
      setStreamingContent('');

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Only metadata is kept in the transcript; the payload goes to the server once.
      const attachmentSummaries = attachments?.map(({ id, fileName, fileType, fileSize }) => ({ id, fileName, fileType, fileSize }));
      setMessages((previous) => [...previous, createMessage('user', content, attachmentSummaries)]);

      let assistantContent = '';

      try {
        const stream = await apiClient.streamChat(
          content,
          model,
          agentMode,
          attachments,
          (overrideConversationId ?? conversationId) || undefined,
          provider,
          baseUrl,
          abortController.signal
        );
        const reader = stream.getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantContent += value;
          setStreamingContent(assistantContent);
        }

        if (assistantContent && !abortController.signal.aborted) {
          setMessages((previous) => [...previous, createMessage('assistant', assistantContent)]);
        }
        setStreamingContent('');
      } catch (caught: any) {
        setStreamingContent('');

        if (caught?.name === 'AbortError') {
          // User pressed Stop: keep whatever streamed rather than dropping it.
          if (assistantContent) {
            setMessages((previous) => [...previous, createMessage('assistant', `${assistantContent}\n\n_(stopped)_`)]);
          }
        } else {
          const errorMessage = formatChatError(
            caught?.message || 'Failed to get response. Make sure the backend server is running.',
            model
          );
          setError(errorMessage);
          setMessages((previous) => [...previous, createMessage('assistant', errorMessage)]);
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [conversationId, model, agentMode, provider, baseUrl, isStreaming]
  );

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

  const setInitialMessages = useCallback((initialMessages: Message[]) => {
    setMessages(initialMessages);
  }, []);

  return { messages, isStreaming, streamingContent, error, sendMessage, stopStreaming, clearMessages, setInitialMessages };
}
