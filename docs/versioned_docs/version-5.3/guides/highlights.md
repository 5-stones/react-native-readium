---
title: Highlights and notes
---

# Highlights and notes

![Highlights](/img/demo-decorators.gif)

Four props work together:

1. `selectionActions` adds your items to the text-selection menu.
2. `onSelectionAction` tells you which item the user picked, and what they selected.
3. `decorations` renders highlights from your state.
4. `onDecorationActivated` tells you when the user taps one.

```tsx
import { useCallback, useState } from 'react';
import { ReadiumView } from 'react-native-readium';
import type {
  Decoration,
  DecorationActivatedEvent,
  DecorationGroup,
  ReadiumFile,
  SelectionAction,
  SelectionActionEvent,
} from 'react-native-readium';

const selectionActions: SelectionAction[] = [
  { id: 'highlight', label: 'Highlight' },
];

export function Reader({ file }: { file: ReadiumFile }) {
  const [decorations, setDecorations] = useState<DecorationGroup[]>([
    { name: 'highlights', decorations: [] },
  ]);

  const onSelectionAction = useCallback((event: SelectionActionEvent) => {
    if (event.actionId !== 'highlight') return;
    const highlight: Decoration = {
      id: `highlight-${Date.now()}`,
      locator: event.locator,
      style: { type: 'highlight', tint: '#FFFF00' },
      extras: { note: '', selectedText: event.selectedText },
    };
    setDecorations((groups) =>
      groups.map((group) =>
        group.name === 'highlights'
          ? { ...group, decorations: [...group.decorations, highlight] }
          : group
      )
    );
  }, []);

  const onDecorationActivated = useCallback(
    ({ decoration }: DecorationActivatedEvent) => {
      // e.g. open an editor for decoration.extras?.note
    },
    []
  );

  return (
    <ReadiumView
      file={file}
      decorations={decorations}
      selectionActions={selectionActions}
      onSelectionAction={onSelectionAction}
      onDecorationActivated={onDecorationActivated}
    />
  );
}
```

## Concepts

|                     |                                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `DecorationGroup`   | A named set of decorations, such as `"highlights"` or `"underlines"`. `decorations` takes an array of groups.     |
| `Decoration`        | One annotation: a `Locator` for where it is, and a `style` (`type: 'highlight'` or `'underline'`, with a `tint`). |
| `extras`            | A `Record<string, string>` on each decoration, for your own data: a note, a timestamp, the selected text.         |
| `onSelectionChange` | Fires as the user adjusts a selection, for a live preview.                                                        |

Decorations live in your state: persist them however you like, and pass them back in when the
book reopens.

## Where the selection menu comes from

iOS and Android add your `selectionActions` to the operating system's own selection menu — the
bubble that appears over selected text — and the system places and dismisses it.

A browser has no such menu, and none can be added to its context menu, so on web the library
draws one itself: a small popup beside the selection, labels only, with the same items and the
same `onSelectionAction` payload. Nothing in your code changes between platforms.

Two things to know on web:

- A decoration is anchored by searching the chapter for the selected text, because the web
  navigator reports a selection as its chapter plus that text and nothing more. A phrase that
  appears twice in a chapter can therefore be highlighted at the wrong occurrence. Native is
  unaffected.
- The browser keeps the text visually selected after you pick an action, until the reader taps
  elsewhere. There is no way to clear it through the navigator yet.

On Android, Readium disables text selection in protected publications, so LCP books can't be
highlighted there.

The [example app](https://github.com/5-stones/react-native-readium/blob/main/apps/common-app/src/components/Reader.tsx)
adds color picking, note editing and highlight management.
