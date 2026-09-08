import { useState, useEffect } from 'react';
import { Settings, ProviderType, ModelInfo, ToolDefinition } from '../../types';
import { apiClient } from '../../services/apiClient';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ModelSelector } from './ModelSelector';
import { EyeIcon, EyeOffIcon, CheckIcon } from '../ui/Icons';

const SAVED_INDICATOR_MS = 2000;

type ToolCategory = 'File Manager' | 'Git' | 'Web';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdateSettings: (changes: Partial<Settings>) => void;
  models: ModelInfo[];
  onRefreshModels: (provider: ProviderType, apiKey?: string, baseUrl?: string) => void;
}

function categorizeTool(tool: ToolDefinition): ToolCategory {
  if (tool.name.startsWith('file_') || tool.name.startsWith('dir_')) return 'File Manager';
  if (tool.name.startsWith('git_')) return 'Git';
  return 'Web';
}

function groupToolsByCategory(tools: ToolDefinition[]): Partial<Record<ToolCategory, ToolDefinition[]>> {
  const groups: Partial<Record<ToolCategory, ToolDefinition[]>> = {};
  for (const tool of tools) {
    const category = categorizeTool(tool);
    (groups[category] ??= []).push(tool);
  }
  return groups;
}

const INPUT_CLASS =
  'w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white';

const GROUP_CLASS = 'p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700/60';

const GROUP_TITLE_CLASS = 'text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase';

const LABEL_CLASS = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2';

export function SettingsModal({ isOpen, onClose, settings, onUpdateSettings, models, onRefreshModels }: SettingsModalProps) {
  const [provider, setProvider] = useState<ProviderType>(settings.provider);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl || '');
  const [allowedPath, setAllowedPath] = useState(settings.allowedPath || '');
  const [enableFileManager, setEnableFileManager] = useState(Boolean(settings.enableFileManager));
  const [enableGit, setEnableGit] = useState(Boolean(settings.enableGit));
  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tools, setTools] = useState<ToolDefinition[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setProvider(settings.provider);
    setApiKey(settings.apiKey);
    setBaseUrl(settings.baseUrl || '');
    setAllowedPath(settings.allowedPath || '');
    setEnableFileManager(Boolean(settings.enableFileManager));
    setEnableGit(Boolean(settings.enableGit));
    apiClient
      .listTools()
      .then(setTools)
      .catch(() => setTools([]));
  }, [isOpen, settings]);

  const handleSave = () => {
    onUpdateSettings({ provider, apiKey, baseUrl, allowedPath, enableFileManager, enableGit });
    setSaved(true);
    setTimeout(() => setSaved(false), SAVED_INDICATOR_MS);
  };

  const handleProviderChange = (nextProvider: ProviderType) => {
    setProvider(nextProvider);
    onRefreshModels(nextProvider, apiKey, baseUrl);
  };

  const isLocalProvider = provider === 'ollama' || provider === 'llamacpp';

  const visibleToolGroups = Object.entries(groupToolsByCategory(tools)).filter(([category]) => {
    if (category === 'File Manager') return enableFileManager;
    if (category === 'Git') return enableGit;
    return true;
  }) as [ToolCategory, ToolDefinition[]][];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="lg">
      <div className="space-y-5">
        <section className={`${GROUP_CLASS} space-y-4`}>
          <h4 className={GROUP_TITLE_CLASS}>General</h4>

          <div>
            <label className={LABEL_CLASS}>Provider</label>
            <select value={provider} onChange={(event) => handleProviderChange(event.target.value as ProviderType)} className={INPUT_CLASS}>
              <option value="gemini">Gemini</option>
              <option value="chatgpt">ChatGPT</option>
              <option value="ollama">Ollama</option>
              <option value="llamacpp">llama.cpp</option>
            </select>
          </div>

          <div>
            <label className={LABEL_CLASS}>API Key {isLocalProvider ? '(Optional)' : ''}</label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="Enter your API key"
                className={`${INPUT_CLASS} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowApiKey((previous) => !previous)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
              >
                {showApiKey ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {isLocalProvider && (
            <div>
              <label className={LABEL_CLASS}>Base URL</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder="e.g., http://localhost:11434/v1"
                className={INPUT_CLASS}
              />
            </div>
          )}

          <div>
            <label className={LABEL_CLASS}>Default Model</label>
            <ModelSelector models={models} selectedModel={settings.model} onSelect={(model) => onUpdateSettings({ model })} />
          </div>
        </section>

        <section className={`${GROUP_CLASS} space-y-3`}>
          <h4 className={GROUP_TITLE_CLASS}>Local Access — Agent Tools</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Allow the agent to access local files and git. Set an absolute path (e.g., /home/user/projects or C:\Users\You\Desktop).
            Works when running locally; on a hosted server it accesses that server's filesystem.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Allowed Path</label>
            <input
              type="text"
              value={allowedPath}
              onChange={(event) => setAllowedPath(event.target.value)}
              placeholder="/tmp or ./  or C:\Users\...\Desktop"
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex flex-col gap-2 p-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <label className="flex items-center justify-between cursor-pointer">
              <span className={enableFileManager ? 'text-sm font-medium text-green-600 dark:text-green-400' : 'text-sm text-gray-700 dark:text-gray-300'}>
                Enable File Manager
              </span>
              <input type="checkbox" checked={enableFileManager} onChange={(event) => setEnableFileManager(event.target.checked)} className="w-4 h-4 rounded accent-violet-600" />
            </label>
            <div className="h-px bg-gray-100 dark:bg-gray-800" />
            <label className="flex items-center justify-between cursor-pointer">
              <span className={enableGit ? 'text-sm font-medium text-green-600 dark:text-green-400' : 'text-sm text-gray-700 dark:text-gray-300'}>Enable Git</span>
              <input type="checkbox" checked={enableGit} onChange={(event) => setEnableGit(event.target.checked)} className="w-4 h-4 rounded accent-violet-600" />
            </label>
          </div>
          <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full w-fit inline-block">Web Free APIs ON</span>
        </section>

        <section className={`${GROUP_CLASS} space-y-3`}>
          <h4 className={GROUP_TITLE_CLASS}>Tools — Local + Free Web</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Available to the assistant automatically. Toggle the groups above to enable or disable them. Web free APIs are always on.
          </p>

          {tools.length === 0 ? (
            <p className="text-sm text-gray-500">Loading tools...</p>
          ) : visibleToolGroups.length === 0 ? (
            <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl">
              All groups disabled. Enable File Manager / Git above to show their tools.
            </p>
          ) : (
            visibleToolGroups.map(([category, categoryTools]) => (
              <div key={category} className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-bold tracking-wide text-violet-600 dark:text-violet-400 uppercase">
                    {category} • {categoryTools.length} tools
                  </h5>
                  {category !== 'Web' && (
                    <span className="text-[11px] px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">ON</span>
                  )}
                </div>
                <div className="grid gap-1.5">
                  {categoryTools.map((tool) => (
                    <div key={tool.name} className="px-3 py-2 bg-gray-50 dark:bg-[#232323] border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="text-sm font-mono font-medium text-gray-900 dark:text-white">{tool.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{tool.description}</div>
                      <div className="text-[10px] text-gray-400 mt-1 font-mono">{JSON.stringify(tool.inputSchema?.properties || {})}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          <div className="text-[11px] text-gray-400">
            Tools: <code>POST /api/tools/execute</code> {'{name, arguments}'} • Web: <code>/api/web/search?q=</code>
          </div>
        </section>

        <Button onClick={handleSave} className="w-full">
          {saved ? <CheckIcon className="w-4 h-4 mr-2" /> : null}
          {saved ? 'Saved' : 'Save Settings'}
        </Button>
      </div>
    </Modal>
  );
}
