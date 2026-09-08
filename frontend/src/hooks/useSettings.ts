import { useState, useEffect } from 'react';
import { Settings } from '../types/chat';
import { getSettings, saveSettings } from '../services/storage';
import { api } from '../services/api';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(getSettings);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    api.setApiKey(settings.apiKey);
  }, [settings.apiKey]);

  const updateSettings = (updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    saveSettings(newSettings);
    if (updates.apiKey !== undefined) {
      api.setApiKey(updates.apiKey);
    }
  };

  return {
    settings,
    updateSettings,
    showSettings,
    setShowSettings,
  };
}
