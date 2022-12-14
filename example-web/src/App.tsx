import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import './App.css';
// @ts-ignore - FIXME: webpack not resolving types
import { ReadiumView, Appearance, Settings } from 'react-native-readium';
// @ts-ignore - FIXME
import type { Locator, Link } from 'react-native-readium';

import {
  Settings as ReaderSettings,
  TableOfContents,
  ReaderButton,
} from './components';

const DEFAULT_SETTINGS = new Settings();
DEFAULT_SETTINGS.appearance = Appearance.NIGHT;

function App() {
  const ref = useRef<any>();
  const [toc, setToc] = useState<Link[]>([]);
  const [location, setLocation] = useState<Link | Locator>();
  const [settings, setSettings] = useState<Partial<Settings>>(DEFAULT_SETTINGS);

  return (
    <div className="App">
      <View style={{
        height: '10%',
        flexDirection: 'row',
      }}>
        <TableOfContents
          items={toc}
          onPress={(loc) => setLocation(loc)}
        />
        <ReaderSettings
          settings={settings}
          onSettingsChanged={(s) => setSettings(s)}
        />
      </View>
      <View style={{ flexDirection: 'row', width: '100%', height: '90%' }}>
        <ReaderButton name="chevron-left" onPress={() => ref.current?.prevPage() } />
        <View style={{ width: '80%', height: '100%' }}>
        <ReadiumView
          ref={ref}
          file={{
            url: 'https://alice.dita.digital/manifest.json',
            initialLocation: {
              href: 'text/chapter-6.xhtml',
              locations: {
                progression: 0.4289308176100629,
              },
              type: 'text/html',
              title: 'Chapter 6'
            },
          }}
          location={location}
          settings={settings}
          onLocationChange={(locator: Locator) => setLocation(locator)}
          onTableOfContents={(toc: Link[] | null) => {
            if (toc) setToc(toc)
          }}
        />
      </View>
        <ReaderButton name="chevron-right" onPress={() => ref.current?.nextPage() } />
      </View>
    </div>
  );
}

export default App;
