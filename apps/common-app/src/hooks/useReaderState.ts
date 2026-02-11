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

  const navigateToTocItem = useCallback((loc: Link) => {
    setLocation({
      href: loc.href,
      type: loc.type || 'application/xhtml+xml',
      title: loc.title || '',
      locations: {
        progression: 0,
      },
    });
  }, []);

  return {
    // State
    toc,
    positions,
    location,
    preferences,

    // Setters
    setLocation,
    setPreferences,

    // Handlers
    handleLocationChange,
    handlePublicationReady,
    navigateToTocItem,
  };
};
