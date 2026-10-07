---
title: Quick start
---

# Quick start

Give `ReadiumView` a file and it renders the publication:

```tsx
import { ReadiumView } from 'react-native-readium';

export function Reader({ path }: { path: string }) {
  return (
    <ReadiumView
      file={{ url: path }} // a local EPUB or PDF
      onLocationChange={(locator) => console.log(locator)}
      onPublicationReady={({ metadata, tableOfContents }) =>
        console.log(metadata.title, tableOfContents)
      }
    />
  );
}
```

On iOS and Android, `file.url` is a local path, such as a book your app downloaded into its
documents folder. On web it's the URL of an unpacked EPUB's `manifest.json`; see [Web](../guides/web.md).

## Where to go next

| To...                                                             | See                                                       |
| ----------------------------------------------------------------- | --------------------------------------------------------- |
| Restore the reader's position, or react when it can't open a book | [Opening publications](../guides/opening-publications.md) |
| Turn pages, jump to a chapter or bookmark                         | [Navigation](../guides/navigation.md)                     |
| Change the theme, font size or margins                            | [Preferences](../guides/preferences.md)                   |
| Add highlights and notes                                          | [Highlights and notes](../guides/highlights.md)           |
| Search the text                                                   | [Search](../guides/search.md)                             |
| Open LCP-protected books                                          | [Readium LCP](/lcp)                                       |

The [example app](https://github.com/5-stones/react-native-readium/blob/main/apps/common-app/src/components/Reader.tsx)
puts all of these together.
