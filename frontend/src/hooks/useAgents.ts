import { useState, useEffect } from 'react';
import { AgentMode, AGENT_MODES } from '../types/chat';

export interface CustomAgent {
  mode: string;
  label: string;
  description: string;
  systemPrompt: string;
  icon: string;
}

const KEY = 'aichatbot-custom-agents';

export function useAgents() {
  const [custom, setCustom] = useState<CustomAgent[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(custom));
  }, [custom]);

  const allModes = [...AGENT_MODES, ...custom.map(c => ({ mode: c.mode as AgentMode, label: c.label, description: c.description, icon: c.icon }))];

  const createAgent = (a: CustomAgent) => setCustom(prev => [...prev, a]);
  const deleteAgent = (mode: string) => setCustom(prev => prev.filter(a => a.mode !== mode));

  return { custom, allModes, createAgent, deleteAgent };
}
