import { useState, useEffect } from 'react';
import { Settings, ProviderType } from '../../types/chat';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ModelSelector } from './ModelSelector';
import { EyeIcon, EyeOffIcon, CheckIcon } from '../ui/Icons';
import { api } from '../../services/api';

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

  useEffect(() => {
    if (isOpen) {
      setProvider(settings.provider);
      setApiKey(settings.apiKey);
      setBaseUrl(settings.baseUrl || '');
      setAllowedPath(settings.allowedPath || '');
      setEnableFileManager(!!settings.enableFileManager);
      setEnableGit(!!settings.enableGit);
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
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Provider
          </label>
          <select
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value as ProviderType)}
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
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
              className="w-full px-3 py-2 pr-10 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
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
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
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

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Local Access (Agent Tools)</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">Allow agent to access local files/git on desktop/mobile. Set an absolute path (e.g., /home/user/projects or C:\Users\You\Desktop). Works when running locally; on Render it accesses server's filesystem.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Allowed Path</label>
            <input
              type="text"
              value={allowedPath}
              onChange={(e) => setAllowedPath(e.target.value)}
              placeholder="/tmp or ./  or C:\Users\...\Desktop"
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={enableFileManager} onChange={(e) => setEnableFileManager(e.target.checked)} className="rounded" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Enable File Manager</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={enableGit} onChange={(e) => setEnableGit(e.target.checked)} className="rounded" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Enable Git</span>
          </label>
        </div>

        <Button onClick={handleSave} className="w-full">
          {saved ? <CheckIcon className="w-4 h-4 mr-2" /> : null}
          {saved ? 'Saved' : 'Save Settings'}
        </Button>
      </div>
    </Modal>
  );
}
