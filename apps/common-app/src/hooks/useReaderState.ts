import { useState, useCallback } from 'react';
import type {
  Link,
  Locator,
  ReadiumProps,
  PublicationReadyEvent,
} from 'react-native-readium';

export const useReaderState = () => {
  const [toc, setToc] = useState<Link[] | null>([]);
  const [positions, setPositions] = useState<Locator[]>([]);
  const [location, setLocation] = useState<Locator | undefined>();
  const [preferences, setPreferences] = useState<ReadiumProps['preferences']>({
    theme: 'dark',
  });

  const handleLocationChange = useCallback((locator: Locator) => {
    setLocation(locator);
  }, []);

  const handlePublicationReady = useCallback((event: PublicationReadyEvent) => {
    setToc(event.tableOfContents);
    setPositions(event.positions || []);
  }, []);

  return {
    // State
    toc,
    positions,
    location,
    preferences,

    // Setters
    setPreferences,

    // Handlers
    handleLocationChange,
    handlePublicationReady,
  };
};
