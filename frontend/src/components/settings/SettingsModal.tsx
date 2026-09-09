import { useState, useEffect } from 'react';
import { Settings, ProviderType, ModelInfo, ToolDefinition } from '../../types';
import { apiClient } from '../../services/apiClient';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ModelSelector } from './ModelSelector';
import {
  EyeIcon, EyeOffIcon, CheckIcon,
  SettingsIcon, SunIcon, MoonIcon,
  UserIcon, CodeIcon
} from '../ui/Icons';

const SAVED_INDICATOR_MS = 2000;

type TabId = 'general' | 'personalization' | 'appearance' | 'tools';

const INPUT_CLASS =
  'w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white';

const LABEL_CLASS = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdateSettings: (changes: Partial<Settings>) => void;
  models: ModelInfo[];
  onRefreshModels: (provider: ProviderType, apiKey?: string, baseUrl?: string) => void;
}

function categorizeTool(tool: ToolDefinition): string {
  if (tool.name.startsWith('file_') || tool.name.startsWith('dir_')) return 'File Manager';
  if (tool.name.startsWith('git_')) return 'Git';
  return 'Web';
}

export function SettingsModal({ isOpen, onClose, settings, onUpdateSettings, models, onRefreshModels }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [provider, setProvider] = useState<ProviderType>(settings.provider);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl || '');
  const [allowedPath, setAllowedPath] = useState(settings.allowedPath || '');
  const [enableFileManager, setEnableFileManager] = useState(Boolean(settings.enableFileManager));
  const [enableGit, setEnableGit] = useState(Boolean(settings.enableGit));
  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [memoryEnabled, setMemoryEnabled] = useState(settings.memoryEnabled !== false);

  // Personalization
  const [nickname, setNickname] = useState(() => localStorage.getItem('user_nickname') || '');
  const [occupation, setOccupation] = useState(() => localStorage.getItem('user_occupation') || '');
  const [moreAbout, setMoreAbout] = useState(() => localStorage.getItem('user_more_about') || '');

  useEffect(() => {
    if (!isOpen) return;
    setProvider(settings.provider);
    setApiKey(settings.apiKey);
    setBaseUrl(settings.baseUrl || '');
    setAllowedPath(settings.allowedPath || '');
    setEnableFileManager(Boolean(settings.enableFileManager));
    setEnableGit(Boolean(settings.enableGit));
    setMemoryEnabled(settings.memoryEnabled !== false);
    apiClient
      .listTools()
      .then(setTools)
      .catch(() => setTools([]));
  }, [isOpen, settings]);

  const handleSave = () => {
    onUpdateSettings({ provider, apiKey, baseUrl, allowedPath, enableFileManager, enableGit, memoryEnabled });
    localStorage.setItem('user_nickname', nickname);
    localStorage.setItem('user_occupation', occupation);
    localStorage.setItem('user_more_about', moreAbout);
    setSaved(true);
    setTimeout(() => setSaved(false), SAVED_INDICATOR_MS);
  };

  const handleProviderChange = (nextProvider: ProviderType) => {
    setProvider(nextProvider);
    onRefreshModels(nextProvider, apiKey, baseUrl);
  };

  const isLocalProvider = provider === 'ollama' || provider === 'llamacpp';

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General', icon: <SettingsIcon className="w-4 h-4" /> },
    { id: 'personalization', label: 'Personalization', icon: <UserIcon className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance', icon: settings.theme === 'dark' ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4" /> },
    { id: 'tools', label: 'Tools', icon: <CodeIcon className="w-4 h-4" /> },
  ];

  const groupedTools = tools.reduce<Record<string, ToolDefinition[]>>((acc, tool) => {
    const cat = categorizeTool(tool);
    (acc[cat] ??= []).push(tool);
    return acc;
  }, {});

  const sidebar = (
    <nav className="p-2">
      <div className="px-3 py-2 mb-2">
        <h3 className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Settings</h3>
      </div>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </nav>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={tabs.find(t => t.id === activeTab)?.label || 'Settings'} size="lg" sidebar={sidebar}>
      <div className="space-y-5">
        {/* General Tab */}
        {activeTab === 'general' && (
          <>
            <section className="space-y-4">
              <h4 className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Provider</h4>
              <div>
                <label className={LABEL_CLASS}>AI Provider</label>
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
          </>
        )}

        {/* Personalization Tab */}
        {activeTab === 'personalization' && (
          <>
            <section className="space-y-4">
              <h4 className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">About you</h4>
              <div>
                <label className={LABEL_CLASS}>Nickname</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="Your name"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Occupation</label>
                <input
                  type="text"
                  value={occupation}
                  onChange={(event) => setOccupation(event.target.value)}
                  placeholder="e.g., Software Engineer, Designer"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>More about you</label>
                <textarea
                  value={moreAbout}
                  onChange={(event) => setMoreAbout(event.target.value)}
                  placeholder="Interests, values, or preferences to keep in mind"
                  rows={3}
                  className={`${INPUT_CLASS} resize-none`}
                />
              </div>
            </section>

            <section className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Memory</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Let the AI personalize responses based on your profile
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMemoryEnabled(!memoryEnabled)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${
                    memoryEnabled ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    memoryEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </section>
          </>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <>
            <section className="space-y-4">
              <h4 className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Theme</h4>
              <div className="grid grid-cols-2 gap-3">
                {(['light', 'dark', 'system'] as const).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => onUpdateSettings({ theme })}
                    className={`p-4 rounded-xl border-2 transition-colors text-left ${
                      settings.theme === theme
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {theme === 'light' && <SunIcon className="w-4 h-4 text-amber-500" />}
                      {theme === 'dark' && <MoonIcon className="w-4 h-4 text-blue-400" />}
                      {theme === 'system' && <SettingsIcon className="w-4 h-4 text-gray-500" />}
                      <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">{theme}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {theme === 'light' && 'Light background'}
                      {theme === 'dark' && 'Dark background'}
                      {theme === 'system' && 'Follow system'}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Tools Tab */}
        {activeTab === 'tools' && (
          <>
            <section className="space-y-4">
              <h4 className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Local Access — Agent Tools</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Allow the agent to access local files and git. Set an absolute path (e.g., /home/user/projects or C:\Users\You\Desktop).
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Allowed Path</label>
                <input
                  type="text"
                  value={allowedPath}
                  onChange={(event) => setAllowedPath(event.target.value)}
                  placeholder="/tmp or ./ or C:\Users\...\Desktop"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="flex flex-col gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
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
            </section>

            <section className="space-y-3">
              <h4 className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Available Tools</h4>
              {Object.entries(groupedTools).map(([category, categoryTools]) => (
                <div key={category} className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-xs font-bold tracking-wide text-violet-600 dark:text-violet-400 uppercase">
                      {category} • {categoryTools.length} tools
                    </h5>
                    {category !== 'Web' && (
                      <span className="text-[11px] px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                        {(category === 'File Manager' && enableFileManager) || (category === 'Git' && enableGit) ? 'ON' : 'OFF'}
                      </span>
                    )}
                  </div>
                  <div className="grid gap-1.5">
                    {categoryTools.map((tool) => (
                      <div key={tool.name} className="px-3 py-2 bg-gray-50 dark:bg-[#232323] border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="text-sm font-mono font-medium text-gray-900 dark:text-white">{tool.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{tool.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          </>
        )}

        <Button onClick={handleSave} className="w-full">
          {saved ? <CheckIcon className="w-4 h-4 mr-2" /> : null}
          {saved ? 'Saved' : 'Save Settings'}
        </Button>
      </div>
    </Modal>
  );
}
