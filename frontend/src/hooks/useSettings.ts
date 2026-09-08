import { useState, useEffect } from 'react';
import { Settings } from '../types';
import { loadSettings, saveSettings } from '../services/settingsStorage';
import { apiClient } from '../services/apiClient';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);

  // Keep the API client in step with the persisted provider key and allowed path.
  useEffect(() => {
    apiClient.setProviderApiKey(settings.apiKey);
    apiClient.setAllowedPath(settings.allowedPath || '');
  }, [settings.apiKey, settings.allowedPath]);

  const updateSettings = (changes: Partial<Settings>) => {
    const nextSettings = { ...settings, ...changes };
    setSettings(nextSettings);
    saveSettings(nextSettings);
  };

  return { settings, updateSettings, showSettings, setShowSettings };
}
