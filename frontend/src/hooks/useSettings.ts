import { useState, useEffect } from 'react';
import { Settings } from '../types';
import { loadSettings, saveSettings } from '../services/settingsStorage';
import { apiClient } from '../services/apiClient';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    apiClient.setProviderApiKey(settings.apiKey);
  }, [settings.apiKey]);

  const updateSettings = (changes: Partial<Settings>) => {
    const nextSettings = { ...settings, ...changes };
    setSettings(nextSettings);
    saveSettings(nextSettings);
  };

  return { settings, updateSettings, showSettings, setShowSettings };
}
