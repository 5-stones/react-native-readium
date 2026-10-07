'use client';

import { useState, useCallback } from 'react';
import type { Preferences } from 'react-native-readium';

const STORAGE_KEY = 'reader-preferences';

function readFromStorage(): Preferences | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as Preferences;
    }
  } catch {
    // ignore malformed JSON
  }
  return undefined;
}

export function usePersistedPreferences() {
  const [initialPreferences] = useState(() => readFromStorage());

  const handlePreferencesChange = useCallback((preferences: Preferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // ignore storage errors (e.g. quota exceeded)
    }
  }, []);

  return { initialPreferences, handlePreferencesChange };
}
