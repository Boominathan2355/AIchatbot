import { useState, useEffect } from 'react';
import { Settings } from '../types/chat';
import { getSettings, saveSettings } from '../services/storage';
import { api } from '../services/api';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(getSettings);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    api.setApiKey(settings.apiKey);
    api.setAllowedPath(settings.allowedPath || '');
  }, [settings.apiKey, settings.allowedPath]);

  useEffect(() => {
    api.setAllowedPath(settings.allowedPath || '');
  }, [settings.allowedPath]);

  const updateSettings = (updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    saveSettings(newSettings);
    if (updates.apiKey !== undefined) {
      api.setApiKey(updates.apiKey);
    }
    if (updates.allowedPath !== undefined) {
      api.setAllowedPath(updates.allowedPath);
    }
  };

  return {
    settings,
    updateSettings,
    showSettings,
    setShowSettings,
  };
}
