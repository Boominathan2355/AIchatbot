export interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl?: string;
  base64Data?: string;
  mimeType?: string;
  preview?: string;
}

export type ProviderType = 'gemini' | 'chatgpt' | 'ollama' | 'llamacpp';

export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  baseUrl?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  agentMode: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  messages?: Message[];
}

export type AgentMode =
  | 'chat'
  | 'code'
  | 'dev-explain'
  | 'business-explain'
  | 'analyze'
  | 'debug'
  | 'architect'
  | 'write'
  | 'brainstorm'
  | 'file-manager'
  | 'git';

export interface AgentModeConfig {
  mode: AgentMode;
  label: string;
  description: string;
  icon: string;
}

export const AGENT_MODES: AgentModeConfig[] = [
  { mode: 'chat', label: 'General Chat', description: 'Open-ended conversation', icon: 'chat' },
  { mode: 'code', label: 'Code Assistant', description: 'Write, review, and explain code', icon: 'code' },
  { mode: 'dev-explain', label: 'Developer Explainer', description: 'Technical explanations with examples', icon: 'developer' },
  { mode: 'business-explain', label: 'Business Explainer', description: 'Business-level explanations', icon: 'business' },
  { mode: 'analyze', label: 'Document Analyzer', description: 'Analyze documents and extract requirements', icon: 'search' },
  { mode: 'debug', label: 'Debugger', description: 'Find and fix bugs in code', icon: 'bug' },
  { mode: 'architect', label: 'System Architect', description: 'System design and architecture', icon: 'architecture' },
  { mode: 'write', label: 'Technical Writer', description: 'Documentation, READMEs, specs', icon: 'write' },
  { mode: 'brainstorm', label: 'Brainstorm', description: 'Generate ideas and creative solutions', icon: 'lightbulb' },
  { mode: 'file-manager', label: 'File Manager', description: 'Browse, read, write local files', icon: 'file' },
  { mode: 'git', label: 'Git Assistant', description: 'Git operations, commit, status', icon: 'git' },
];

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
}

export interface Settings {
  provider: ProviderType;
  apiKey: string;
  baseUrl?: string;
  model: string;
  theme: 'light' | 'dark' | 'system';
  allowedPath?: string;
  enableFileManager?: boolean;
  enableGit?: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
}
