---
title: Navigation
---

# Navigation

## Tracking the reading position

`onLocationChange` fires with a `Locator` whenever the position changes, for example when the user
turns a page. Save it to reopen the book where the user left off, through `file.initialLocation`:

```tsx
const [location, setLocation] = useState<Locator>();

<ReadiumView
  file={{ url: path, initialLocation: savedLocation }}
  onLocationChange={(locator) => {
    setLocation(locator);
    save(bookId, locator);
  }}
/>;
```

## Moving the reader

The view's ref moves the reader:

```tsx
import { useRef } from 'react';
import { ReadiumView, type ReadiumViewRef } from 'react-native-readium';

const ref = useRef<ReadiumViewRef>(null);

<>
  <ReadiumView ref={ref} file={file} />
  <Button title="Previous" onPress={() => ref.current?.goBackward()} />
  <Button title="Next" onPress={() => ref.current?.goForward()} />
</>;

// Jump to a chapter from the table of contents, a bookmark or a search result.
ref.current?.goTo(locator);
```

| Method          |                                                           |
| --------------- | --------------------------------------------------------- |
| `goTo(locator)` | Go to a location: a chapter, a bookmark, a search result. |
| `goForward()`   | The next page.                                            |
| `goBackward()`  | The previous page.                                        |

To open a table-of-contents entry, build a `Locator` from its `Link`:

```tsx
ref.current?.goTo({
  href: link.href,
  type: link.type || 'application/xhtml+xml',
  title: link.title || '',
  locations: { progression: 0 },
});
```

The `positions` from [`onPublicationReady`](./opening-publications.md#when-the-publication-is-ready)
are ready-made locators, one per position, for a page slider or "go to page".

## Zoom (PDF)

PDFs can be magnified through the ref: `zoomIn()`, `zoomOut()`, `setZoom(scale)` and
`resetZoom()`. On web, `onZoomChange` reports the scale, including pinches; on iOS and Android
the platform PDF viewers zoom on a pinch by themselves and report nothing back.
