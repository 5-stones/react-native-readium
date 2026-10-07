import { useState, useCallback, useRef } from 'react';
import type {
  Link,
  Locator,
  PublicationReadyEvent,
  Capabilities,
  PreferencesChangedEvent,
  Preferences,
} from 'react-native-readium';

export interface UseReaderStateOptions {
  initialPreferences?: Preferences;
  onPreferencesChange?: (preferences: Preferences) => void;
}

export const useReaderState = (options?: UseReaderStateOptions) => {
  const [toc, setToc] = useState<Link[] | null>([]);
  const [positions, setPositions] = useState<Locator[]>([]);
  const [capabilities, setCapabilities] = useState<Capabilities>();
  const [location, setLocation] = useState<Locator | undefined>();
  const [preferences, _setPreferences] = useState<Preferences>(
    options?.initialPreferences ?? { theme: 'dark' }
  );
  const onPreferencesChangeRef = useRef(options?.onPreferencesChange);
  onPreferencesChangeRef.current = options?.onPreferencesChange;

  const setPreferences = useCallback((prefs: Preferences) => {
    _setPreferences(prefs);
    onPreferencesChangeRef.current?.(prefs);
  }, []);

  const handleLocationChange = useCallback((locator: Locator) => {
    setLocation(locator);
  }, []);

  const handlePublicationReady = useCallback((event: PublicationReadyEvent) => {
    setToc(event.tableOfContents);
    setPositions(event.positions || []);
    setCapabilities(event.capabilities);
  }, []);

  const handlePreferencesChanged = useCallback((event: PreferencesChangedEvent) => {
    setCapabilities(event.capabilities);
  }, [])

  return {
    // State
    toc,
    positions,
    capabilities,
    location,
    preferences,

    // Setters
    setPreferences,

    // Handlers
    handleLocationChange,
    handlePublicationReady,
    handlePreferencesChanged,
  };
};
