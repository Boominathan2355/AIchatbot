import { useState, useEffect } from 'react';
import { Settings, ProviderType } from '../../types/chat';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ModelSelector } from './ModelSelector';
import { EyeIcon, EyeOffIcon, CheckIcon } from '../ui/Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdateSettings: (updates: Partial<Settings>) => void;
  models: any[];
  onRefreshModels: (provider: ProviderType, apiKey?: string, baseUrl?: string) => void;
}

export function SettingsModal({ isOpen, onClose, settings, onUpdateSettings, models, onRefreshModels }: SettingsModalProps) {
  const [provider, setProvider] = useState<ProviderType>(settings.provider);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl || '');
  const [allowedPath, setAllowedPath] = useState(settings.allowedPath || '');
  const [enableFileManager, setEnableFileManager] = useState(!!settings.enableFileManager);
  const [enableGit, setEnableGit] = useState(!!settings.enableGit);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tools, setTools] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      setProvider(settings.provider);
      setApiKey(settings.apiKey);
      setBaseUrl(settings.baseUrl || '');
      setAllowedPath(settings.allowedPath || '');
      setEnableFileManager(!!settings.enableFileManager);
      setEnableGit(!!settings.enableGit);
      // fetch MCP tools for display inside Settings
      fetch(`/api/mcp/tools`, { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` } })
        .then(r => r.json()).then(j => setTools(j.data || j || [])).catch(() => setTools([]));
    }
  }, [isOpen, settings]);

  const handleSave = () => {
    onUpdateSettings({ provider, apiKey, baseUrl, allowedPath, enableFileManager, enableGit });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleProviderChange = (newProvider: ProviderType) => {
    setProvider(newProvider);
    onRefreshModels(newProvider, apiKey, baseUrl);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="lg">
      <div className="space-y-5">
        {/* Group: General */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700/60 space-y-4">
          <h4 className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">General</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Provider
            </label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as ProviderType)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
            >
              <option value="gemini">Gemini</option>
              <option value="chatgpt">ChatGPT</option>
              <option value="ollama">Ollama</option>
              <option value="llamacpp">llama.cpp</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API Key {provider === 'ollama' || provider === 'llamacpp' ? '(Optional)' : ''}
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                className="w-full px-3 py-2 pr-10 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showApiKey ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {(provider === 'ollama' || provider === 'llamacpp') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Base URL
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="e.g., http://localhost:11434/v1"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Model
            </label>
            <ModelSelector
              models={models}
              selectedModel={settings.model}
              onSelect={(model) => onUpdateSettings({ model })}
            />
          </div>
        </div>

        {/* Group: Local Access */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700/60 space-y-3">
          <h4 className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Local Access — Agent Tools</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">Allow agent to access local files/git on desktop/mobile. Set an absolute path (e.g., /home/user/projects or C:\Users\You\Desktop). Works when running locally; on Render it accesses server's filesystem.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Allowed Path</label>
            <input
              type="text"
              value={allowedPath}
              onChange={(e) => setAllowedPath(e.target.value)}
              placeholder="/tmp or ./  or C:\Users\...\Desktop"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex flex-col gap-2 p-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <label className="flex items-center justify-between cursor-pointer">
              <span className={enableFileManager ? 'text-sm font-medium text-green-600 dark:text-green-400' : 'text-sm text-gray-700 dark:text-gray-300'}>Enable File Manager</span>
              <input type="checkbox" checked={enableFileManager} onChange={(e) => setEnableFileManager(e.target.checked)} className="w-4 h-4 rounded accent-violet-600" />
            </label>
            <div className="h-px bg-gray-100 dark:bg-gray-800" />
            <label className="flex items-center justify-between cursor-pointer">
              <span className={enableGit ? 'text-sm font-medium text-green-600 dark:text-green-400' : 'text-sm text-gray-700 dark:text-gray-300'}>Enable Git</span>
              <input type="checkbox" checked={enableGit} onChange={(e) => setEnableGit(e.target.checked)} className="w-4 h-4 rounded accent-violet-600" />
            </label>
          </div>
          <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full w-fit inline-block">Web Free APIs ON</span>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700/60 space-y-3">
          <h4 className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Tools — MCP + Free Web (Grouped)</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">Auto-connected with LLM — no manual search needed. Toggle groups above to enable/disable. Web free APIs always ON.</p>
          {(() => {
            const groups: Record<string, any[]> = {};
            tools.forEach((t: any) => {
              const cat = t.name.startsWith('file_') || t.name.startsWith('dir_') ? 'File Manager' : t.name.startsWith('git_') ? 'Git' : 'Web';
              (groups[cat] = groups[cat] || []).push(t);
            });
            const filtered: Record<string, any[]> = {};
            Object.entries(groups).forEach(([cat, list]) => {
              if (cat === 'File Manager' && !enableFileManager) return;
              if (cat === 'Git' && !enableGit) return;
              filtered[cat] = list;
            });
            if (tools.length === 0) return <p className="text-sm text-gray-500">Loading tools...</p>;
            if (Object.keys(filtered).length === 0) return <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl">All groups disabled. Enable File Manager / Git above to show their tools.</p>;
            return Object.entries(filtered).map(([cat, list]: any) => (
              <div key={cat} className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-bold tracking-wide text-violet-600 dark:text-violet-400 uppercase">{cat} • {list.length} tools</h5>
                  {cat !== 'Web' && <span className="text-[11px] px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">ON</span>}
                </div>
                <div className="grid gap-1.5">
                  {list.map((t: any) => (
                    <div key={t.name} className="px-3 py-2 bg-gray-50 dark:bg-[#232323] border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="text-sm font-mono font-medium text-gray-900 dark:text-white">{t.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{t.description}</div>
                      <div className="text-[10px] text-gray-400 mt-1 font-mono">{JSON.stringify(t.inputSchema?.properties || {})}</div>
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}
          <div className="text-[11px] text-gray-400">MCP: <code>/api/mcp/call</code> {"{name, arguments}"} • Web: <code>/api/web/search?q=</code></div>
        </div>

        <Button onClick={handleSave} className="w-full">
          {saved ? <CheckIcon className="w-4 h-4 mr-2" /> : null}
          {saved ? 'Saved' : 'Save Settings'}
        </Button>
      </div>
    </Modal>
  );
}
