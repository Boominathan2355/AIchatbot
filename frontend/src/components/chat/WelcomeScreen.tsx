import { AgentMode } from '../../types';
import { Icon } from '../ui/Icon';

interface WelcomeScreenProps {
  agentMode: AgentMode;
  onSuggestionClick?: (text: string) => void;
}

const WELCOME_MESSAGES: Record<AgentMode, { title: string; subtitle: string; suggestions: string[] }> = {
  chat: {
    title: 'How can I help you today?',
    subtitle: 'Ask me anything -- I can help with questions, writing, analysis, and more.',
    suggestions: [
      'Explain quantum computing in simple terms',
      'Help me write a Python function to sort a list',
      'What are the best practices for REST API design?',
      'Draft a professional email to my team',
    ],
  },
  code: {
    title: 'Code Assistant',
    subtitle: 'Write, review, and explain code in any language.',
    suggestions: [
      'Write a TypeScript function to debounce API calls',
      'Create a React hook for local storage persistence',
      'Review this code for performance issues',
      'Explain how async/await works under the hood',
    ],
  },
  'dev-explain': {
    title: 'Developer Explainer',
    subtitle: 'Technical explanations with code examples and implementation details.',
    suggestions: [
      'Explain microservices architecture with code examples',
      'How does React virtual DOM work internally?',
      'Show me how to implement a rate limiter in Node.js',
      'Explain database indexing with examples',
    ],
  },
  'business-explain': {
    title: 'Business Explainer',
    subtitle: 'Business-level explanations with real-world examples.',
    suggestions: [
      'What is digital transformation and why does it matter?',
      'Explain ROI calculation for software projects',
      'How does Agile methodology improve team productivity?',
      'What are the business benefits of cloud migration?',
    ],
  },
  analyze: {
    title: 'Document Analyzer',
    subtitle: 'Upload a document or paste text for analysis and requirement extraction.',
    suggestions: [
      'Analyze this requirements document',
      'Extract key points from this specification',
      'Review this project scope document',
      'Identify risks in this technical proposal',
    ],
  },
  debug: {
    title: 'Debugger',
    subtitle: 'Paste your code and describe the issue. I will find and fix the bug.',
    suggestions: [
      'My React component re-renders infinitely',
      'This API endpoint returns 500 sometimes',
      'My database query is extremely slow',
      'TypeScript type error I cannot resolve',
    ],
  },
  architect: {
    title: 'System Architect',
    subtitle: 'Design scalable systems and get architecture guidance.',
    suggestions: [
      'Design a real-time chat application architecture',
      'How should I structure a monorepo for multiple services?',
      'Design a notification system for millions of users',
      'Plan a migration from monolith to microservices',
    ],
  },
  write: {
    title: 'Technical Writer',
    subtitle: 'Write documentation, READMEs, and technical specifications.',
    suggestions: [
      'Write a README for this project',
      'Create API documentation for this endpoint',
      'Write a technical design document',
      'Create a getting started guide for new developers',
    ],
  },
  brainstorm: {
    title: 'Brainstorm',
    subtitle: 'Generate ideas and explore creative solutions to problems.',
    suggestions: [
      'Ideas for improving developer experience',
      'How to reduce cloud infrastructure costs',
      'Creative approaches to user onboarding',
      'Ways to improve code review process',
    ],
  },
};

export function WelcomeScreen({ agentMode, onSuggestionClick }: WelcomeScreenProps) {
  const config = WELCOME_MESSAGES[agentMode];

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-xl animate-fade-in">
        <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-purple-500/25 rotate-3 hover:rotate-0 transition-transform duration-300">
          <Icon name={agentMode === 'chat' ? 'bot' : agentMode} className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-[1.75rem] font-semibold text-gray-900 dark:text-white mb-2 tracking-tight">
          {config.title}
        </h1>
        <p className="text-[0.9rem] text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          {config.subtitle}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {config.suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSuggestionClick?.(suggestion)}
              className="group text-left px-4 py-3 bg-white dark:bg-gray-800/40 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200/80 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600/50 rounded-xl transition-all duration-200 text-[0.8125rem] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 shadow-sm hover:shadow"
            >
              <span className="line-clamp-2">{suggestion}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
