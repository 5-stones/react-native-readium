# react-native-readium — API reference

All exports come from the package root: `import { ReadiumView, RANGES } from 'react-native-readium'`
and `import type { ... } from 'react-native-readium'`.

## `<ReadiumView>` props (`ReadiumProps`)

| Prop | Type | Required | Notes |
| --- | --- | --- | --- |
| `file` | `File` | yes | `{ url, initialLocation? }`. `url` = local epub path (native) or manifest.json URL (web). |
| `preferences` | `Preferences` (`Partial`) | yes (type) | Reader UI settings (EPUB). Pass `{}` for defaults. |
| `decorations` | `DecorationGroup[]` | no | Highlights/underlines, grouped by name. |
| `selectionActions` | `SelectionAction[]` | no | Custom items in the text-selection context menu. |
| `style` | `ViewStyle` | no | Standard RN style. Give it size (`flex: 1`). |
| `onLocationChange` | `(locator: Locator) => void` | no | Fires on page/location change. |
| `onPublicationReady` | `(e: PublicationReadyEvent) => void` | no | TOC, positions, metadata once loaded. |
| `onReady` | `(e: PublicationInfo) => void` | no | Publication info incl. `capabilities`. |
| `onError` | `(e: ReadiumError) => void` | no | Native error. |
| `onUnsupportedCapability` | `(e: UnsupportedCapabilityEvent) => void` | no | A requested capability isn't available. |
| `onSearchProgress` | `(e: SearchProgressEvent) => void` | no | Incremental search progress. |
| `onDecorationActivated` | `(e: DecorationActivatedEvent) => void` | no | User tapped a decoration. |
| `onSelectionChange` | `(e: SelectionEvent) => void` | no | Selection adjusted. |
| `onSelectionAction` | `(e: SelectionActionEvent) => void` | no | User chose a custom selection action. |
| `onMediaStateChange` | `(s: MediaState) => void` | no | Audiobook playback state. |
| `onMediaError` | `(e: ReadiumError) => void` | no | Media playback error. |

## `ReadiumViewRef` methods

Navigation / location:
- `goTo(locator: Locator): void`
- `goForward(): void`
- `goBackward(): void`
- `getCurrentLocation(): Promise<Locator>`
- `getPositions(): Promise<Locator[]>`
- `getTableOfContents(): Promise<Link[]>`

Selection:
- `getCurrentSelection(): Promise<SelectionEvent>`
- `setSelection(locator: Locator): Promise<boolean>`
- `clearSelection(): void`

Search:
- `search(query: string, options?: SearchOptions): Promise<SearchResult[]>`
- `cancelSearch(): void`

Resources / preferences:
- `getResource(href: string): Promise<ResourceResponse>`
- `setPreferences(p: Preferences): void`
- `setPdfPreferences(p: PdfPreferences): void` · `setComicPreferences(p: ComicPreferences): void` · `setAudioPreferences(p: AudioPreferences): void`

Audio (audiobook publications only — see limitations):
- `play(): void` · `pause(): void` · `stop(): void`
- `seekTo(position: number): void` · `skipToNext(): void` · `skipToPrevious(): void`
- `setPlaybackRate(rate: number): void`
- `getMediaState(): Promise<MediaState>`

## Key interfaces

`File`: `{ url: string; initialLocation?: Locator }`

`Locator` (Readium locator): `{ href, type, title?, locations?: { progression?, totalProgression?, position?, fragments? }, text? }`.
Use `locations.totalProgression` (0..1) for whole-book progress; persist a `Locator` to restore via `file.initialLocation`.

`Link` (TOC/reading-order entry): `{ href, type?, title?, children? }`.

`PublicationReadyEvent`: `{ tableOfContents: Link[]; positions: Locator[]; metadata: PublicationMetadata }`.

`PublicationInfo` (from `onReady`/`getPublication`): `{ format, capabilities: PublicationCapabilities, tableOfContents, readingOrder, resources, positions, metadata }`.

`PublicationCapabilities`: `{ locations, tableOfContents, positions, preferences, decorations, selection, search, resources, mediaPlayback, mediaOverlays, tts }` (all `boolean`). Note `mediaOverlays` is always `false` today.

`Decoration`: `{ id: string; locator: Locator; style: DecorationStyle; extras?: Record<string,string> }`.
`DecorationStyle`: `{ type: 'highlight' | 'underline'; tint?: string }`.
`DecorationGroup`: `{ name: string; decorations: Decoration[] }`. Keep a group present (even empty) so the native side gets the "clear all" signal.

`SelectionAction`: `{ id: string; label: string }`.
`SelectionActionEvent`: `{ actionId: string; locator: Locator; selectedText?: string }`.
`SelectionEvent`: `{ locator?: Locator; selectedText?: string }`.
`DecorationActivatedEvent`: `{ decoration: Decoration; group?: string; rect?: Rect; point?: Point }`.

`SearchOptions`: `{ caseSensitive?, diacriticSensitive?, wholeWord?, exact?, language?, regularExpression?, limit? }`.
`SearchResult`: `{ locator: Locator; title?; snippet?; index }`.

`MediaState`: `{ state: 'playing'|'paused'|'loading'; resourceIndex; position; duration?; totalDuration?; playbackRate; track?: MediaTrack }`.
`AudioPreferences`: `{ speed?; volume? }`.

`Preferences` (EPUB; `Partial`): common keys include `theme` (`'light'|'dark'|'sepia'`), `fontSize`, `fontFamily`,
`pageMargins`, `lineHeight`, `paragraphSpacing`, `scroll` (boolean), `publisherStyles` (boolean), `columnCount`,
`textAlign`, `hyphens`. Full constraints: Readium "Navigator Preferences" guide.

`RANGES` — exported helper constant for preference value ranges.

## Highlights flow (full example)

```tsx
import React, { useState, useCallback } from 'react';
import { ReadiumView } from 'react-native-readium';
import type {
  File, Decoration, DecorationGroup, SelectionAction,
  SelectionActionEvent, DecorationActivatedEvent,
} from 'react-native-readium';

const selectionActions: SelectionAction[] = [{ id: 'highlight', label: 'Highlight' }];

export function Reader({ file }: { file: File }) {
  const [decorations, setDecorations] = useState<DecorationGroup[]>([
    { name: 'highlights', decorations: [] },
  ]);

  const onSelectionAction = useCallback((e: SelectionActionEvent) => {
    if (e.actionId !== 'highlight') return;
    const d: Decoration = {
      id: `hl-${Date.now()}`,
      locator: e.locator,
      style: { type: 'highlight', tint: '#FFFF00' },
      extras: { note: '', selectedText: e.selectedText ?? '' },
    };
    setDecorations((prev) =>
      prev.map((g) => (g.name === 'highlights'
        ? { ...g, decorations: [...g.decorations, d] } : g)));
  }, []);

  const onDecorationActivated = useCallback((e: DecorationActivatedEvent) => {
    // open an edit/delete UI for e.decoration
  }, []);

  return (
    <ReadiumView
      file={file}
      preferences={{}}
      decorations={decorations}
      selectionActions={selectionActions}
      onSelectionAction={onSelectionAction}
      onDecorationActivated={onDecorationActivated}
      style={{ flex: 1 }}
    />
  );
}
```

## Source pointers

- Repo: https://github.com/5-stones/react-native-readium
- Types: `src/interfaces/*`, `src/components/ReadiumView.types.ts`, `src/specs/ReadiumView.nitro.ts`
- Full example app: `apps/example-native` + shared UI in `apps/common-app`
