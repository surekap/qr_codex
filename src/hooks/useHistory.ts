import { useState, useCallback } from 'react';
import type { ScanEntry } from '../types';
import { STORAGE_KEYS } from '../types';
import { storageGet, storageSet } from '../utils/storage';

export function useHistory() {
  const [history, setHistory] = useState<ScanEntry[]>(() =>
    storageGet<ScanEntry[]>(STORAGE_KEYS.history, [])
  );

  const addEntry = useCallback((entry: ScanEntry) => {
    setHistory(prev => {
      const next = [entry, ...prev];
      storageSet(STORAGE_KEYS.history, next);
      return next;
    });
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setHistory(prev => {
      const next = prev.filter(e => e.id !== id);
      storageSet(STORAGE_KEYS.history, next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    storageSet(STORAGE_KEYS.history, []);
  }, []);

  const hasText = useCallback((text: string) =>
    history.some(e => e.text === text),
  [history]);

  return { history, addEntry, deleteEntry, clearHistory, hasText };
}
