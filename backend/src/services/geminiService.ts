import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from '@google/generative-ai';
import { config } from '../config/env';
import { AGENT_MODES, AgentMode, ChatMessage } from '../types/gemini';

const genAIInstances = new Map<string, GoogleGenerativeAI>();

function getGenAI(apiKey?: string): GoogleGenerativeAI {
  const key = apiKey || config.geminiApiKey;
  if (!key) throw new Error('Gemini API key is required');

  if (!genAIInstances.has(key)) {
    genAIInstances.set(key, new GoogleGenerativeAI(key));
  }
  return genAIInstances.get(key)!;
}

function getSystemPrompt(agentMode: AgentMode): string {
  const mode = AGENT_MODES.find(m => m.mode === agentMode);
  return mode?.systemPrompt || '';
}

function buildContents(messages: ChatMessage[]) {
  const contents: any[] = [];

  for (const msg of messages) {
    const parts: any[] = [];

    if (msg.attachments && msg.attachments.length > 0) {
      for (const attachment of msg.attachments) {
        if (attachment.base64Data && attachment.mimeType) {
          parts.push({
            inlineData: {
              mimeType: attachment.mimeType,
              data: attachment.base64Data,
            },
          });
        }
      }
    }

    parts.push({ text: msg.content });
    contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts });
  }

  return contents;
}

function extractTextFromChunk(chunk: any): string {
  try {
    if (chunk.candidates && chunk.candidates[0]) {
      const candidate = chunk.candidates[0];
      if (candidate.content && candidate.content.parts) {
        return candidate.content.parts
          .filter((part: any) => typeof part.text === 'string')
          .map((part: any) => part.text)
          .join('');
      }
    }
  } catch (e) {
    // fallback
  }
  try {
    const text = chunk.text();
    if (typeof text === 'string' && !text.includes('[object Object]')) {
      return text;
    }
  } catch (e) {
    // fallback
  }
  return '';
}

export async function* streamChat(
  messages: ChatMessage[],
  model: string = 'gemini-2.5-flash',
  apiKey?: string,
  agentMode: AgentMode = 'chat'
): AsyncGenerator<string, void, unknown> {
  const genAI = getGenAI(apiKey);

  const systemInstruction = getSystemPrompt(agentMode);
  const generativeModel = genAI.getGenerativeModel({
    model,
    ...(systemInstruction ? { systemInstruction } : {}),
  });

  const contents = buildContents(messages);

  const generationConfig: GenerationConfig = {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192,
  };

  const result = await generativeModel.generateContentStream({
    contents,
    generationConfig,
  });

  for await (const chunk of result.stream) {
    const text = extractTextFromChunk(chunk);
    if (text) yield text;
  }
}

export async function chat(
  messages: ChatMessage[],
  model: string = 'gemini-2.5-flash',
  apiKey?: string,
  agentMode: AgentMode = 'chat'
): Promise<string> {
  const genAI = getGenAI(apiKey);

  const systemInstruction = getSystemPrompt(agentMode);
  const generativeModel = genAI.getGenerativeModel({
    model,
    ...(systemInstruction ? { systemInstruction } : {}),
  });

  const contents = buildContents(messages);

  const result = await generativeModel.generateContent({
    contents,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    },
  });

  const response = result.response;
  const parts = response.candidates?.[0]?.content?.parts;
  if (parts) {
    return parts
      .filter((p: any) => typeof p.text === 'string')
      .map((p: any) => p.text)
      .join('');
  }
  return response.text();
}

export async function listModels(apiKey?: string): Promise<{ id: string; name: string; description: string }[]> {
  return [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fastest, best for most tasks' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Advanced reasoning and analysis' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Legacy model, may be unavailable' },
  ];
}
