import { useState } from 'react';

export function parseThinking(content: string): { thinking: string | null; answer: string } {
  const m = content.match(/<thinking>([\s\S]*?)<\/thinking>/i) || content.match(/<think>([\s\S]*?)<\/think>/i);
  if (m) {
    return { thinking: m[1].trim(), answer: content.replace(m[0], '').trim() };
  }
  return { thinking: null, answer: content };
}

export function ThinkingBlock({ thinking }: { thinking: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-2 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-300">
        <span>🧠 Thinking {open ? '▼' : '▶'}</span>
        <span className="opacity-60">{thinking.length} chars</span>
      </button>
      {open && <pre className="px-3 pb-3 text-xs whitespace-pre-wrap text-gray-700 dark:text-gray-300 max-h-64 overflow-auto">{thinking}</pre>}
    </div>
  );
}
