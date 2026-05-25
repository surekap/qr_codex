import { useState, useCallback } from 'react';
import type { AppSettings } from '../types';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../types';
import { storageGet, storageSet } from '../utils/storage';

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(() =>
    storageGet<AppSettings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS)
  );

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...patch };
      storageSet(STORAGE_KEYS.settings, next);
      return next;
    });
  }, []);

  return { settings, updateSettings };
}
