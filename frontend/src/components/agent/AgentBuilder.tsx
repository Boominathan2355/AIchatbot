import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CustomAgent } from '../../hooks/useAgents';

export function AgentBuilder({ isOpen, onClose, onCreate }: { isOpen: boolean; onClose: () => void; onCreate: (a: CustomAgent) => void }) {
  const [label, setLabel] = useState('');
  const [mode, setMode] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [icon, setIcon] = useState('bot');

  const handleCreate = () => {
    if (!label || !mode) return;
    onCreate({ label, mode: mode.toLowerCase().replace(/\s+/g, '-'), description, systemPrompt: prompt, icon });
    setLabel(''); setMode(''); setDescription(''); setPrompt('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Custom Agent">
      <div className="space-y-3">
        <input placeholder="Label (e.g., My QA Agent)" value={label} onChange={e=>setLabel(e.target.value)} className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border rounded-lg" />
        <input placeholder="Mode id (e.g., qa)" value={mode} onChange={e=>setMode(e.target.value)} className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border rounded-lg" />
        <input placeholder="Description" value={description} onChange={e=>setDescription(e.target.value)} className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border rounded-lg" />
        <input placeholder="Icon (bot, code, git, file...)" value={icon} onChange={e=>setIcon(e.target.value)} className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border rounded-lg" />
        <textarea placeholder="System prompt" value={prompt} onChange={e=>setPrompt(e.target.value)} rows={4} className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border rounded-lg" />
        <Button onClick={handleCreate} className="w-full">Create Agent</Button>
      </div>
    </Modal>
  );
}
