import { useState, useEffect } from 'react';
import { Settings, ProviderType, ModelInfo } from '../../types';
import { apiClient } from '../../services/apiClient';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ModelSelector } from './ModelSelector';
import {
  EyeIcon, EyeOffIcon, CheckIcon,
  SettingsIcon, SunIcon, MoonIcon,
  UserIcon
} from '../ui/Icons';

const SAVED_INDICATOR_MS = 2000;

type TabId = 'general' | 'personalization' | 'appearance';

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

export function SettingsModal({ isOpen, onClose, settings, onUpdateSettings, models, onRefreshModels }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [provider, setProvider] = useState<ProviderType>(settings.provider);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [memoryEnabled, setMemoryEnabled] = useState(settings.memoryEnabled !== false);

  // Personalization — loaded from API
  const [nickname, setNickname] = useState('');
  const [occupation, setOccupation] = useState('');
  const [moreAbout, setMoreAbout] = useState('');
  const [memoryLoading, setMemoryLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setProvider(settings.provider);
    // Restore per-provider key from the map, falling back to legacy apiKey
    const savedKey = settings.apiKeys?.[settings.provider] || settings.apiKey || '';
    setApiKey(savedKey);
    // Restore per-provider baseUrl from the map, falling back to legacy baseUrl
    const savedBaseUrl = settings.baseUrls?.[settings.provider] || settings.baseUrl || '';
    setBaseUrl(savedBaseUrl);
    setMemoryEnabled(settings.memoryEnabled !== false);

    // Load memory from API
    setMemoryLoading(true);
    apiClient.getMemory()
      .then((mem) => {
        setNickname(mem.nickname || '');
        setOccupation(mem.occupation || '');
        setMoreAbout(mem.moreAbout || '');
        setMemoryEnabled(mem.enabled !== false);
      })
      .catch(() => {})
      .finally(() => setMemoryLoading(false));
  }, [isOpen, settings]);

  const handleSave = async () => {
    // Store key and baseUrl in per-provider maps
    const updatedApiKeys = { ...settings.apiKeys, [provider]: apiKey };
    const updatedBaseUrls = { ...settings.baseUrls, [provider]: baseUrl };
    onUpdateSettings({ provider, apiKey, apiKeys: updatedApiKeys, baseUrl, baseUrls: updatedBaseUrls, memoryEnabled });

    // Save memory to API
    try {
      await apiClient.saveMemory({ nickname, occupation, moreAbout, enabled: memoryEnabled });
    } catch {
      // silently fail — settings still saved locally
    }

    setSaved(true);
    setTimeout(() => setSaved(false), SAVED_INDICATOR_MS);
  };

  const handleProviderChange = (nextProvider: ProviderType) => {
    setProvider(nextProvider);
    // Restore saved key and baseUrl for the newly selected provider
    const savedKey = settings.apiKeys?.[nextProvider] || '';
    const savedBaseUrl = settings.baseUrls?.[nextProvider] || '';
    setApiKey(savedKey);
    setBaseUrl(savedBaseUrl);
    onRefreshModels(nextProvider, savedKey, savedBaseUrl);
  };

  const isLocalProvider = provider === 'ollama' || provider === 'llamacpp';

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General', icon: <SettingsIcon className="w-4 h-4" /> },
    { id: 'personalization', label: 'Personalization', icon: <UserIcon className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance', icon: settings.theme === 'dark' ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4" /> },
  ];

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
                <>
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

                  <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700/60 space-y-2">
                    <h5 className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {provider === 'ollama' ? 'Ollama' : 'llama.cpp'} Reference
                    </h5>
                    {provider === 'ollama' ? (
                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1.5 font-mono">
                        <p><span className="text-gray-400 dark:text-gray-500"># Install & run</span></p>
                        <p>curl -fsSL https://ollama.com/install.sh | sh</p>
                        <p>ollama serve</p>
                        <p className="pt-1"><span className="text-gray-400 dark:text-gray-500"># Pull a model</span></p>
                        <p>ollama pull llama3</p>
                        <p className="pt-1"><span className="text-gray-400 dark:text-gray-500"># Default base URL</span></p>
                        <p>http://localhost:11434/v1</p>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1.5 font-mono">
                        <p><span className="text-gray-400 dark:text-gray-500"># Build & run</span></p>
                        <p>git clone https://github.com/ggerganov/llama.cpp</p>
                        <p>cd llama.cpp && make</p>
                        <p>./llama-server -m model.gguf</p>
                        <p className="pt-1"><span className="text-gray-400 dark:text-gray-500"># Default base URL</span></p>
                        <p>http://localhost:8080/v1</p>
                      </div>
                    )}
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 pt-1">
                      Local providers require the backend to run on the same machine. If deployed on Render, use Gemini or ChatGPT instead.
                    </p>
                  </div>
                </>
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
              {memoryLoading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading profile...</p>
              ) : (
                <>
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
                </>
              )}
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

        <Button onClick={handleSave} className="w-full">
          {saved ? <CheckIcon className="w-4 h-4 mr-2" /> : null}
          {saved ? 'Saved' : 'Save Settings'}
        </Button>
      </div>
    </Modal>
  );
}
