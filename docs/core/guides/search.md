---
title: Search
---

# Search

EPUBs support full-text search on iOS and Android; web doesn't support search yet. Check
`capabilities.search` before offering it.

## The `useSearch` hook

For most apps, `useSearch(ref)` does the work: it pages through results, accumulates them, and
tracks loading state.

```tsx
import { useRef } from 'react';
import {
  ReadiumView,
  useSearch,
  type ReadiumViewRef,
} from 'react-native-readium';

const ref = useRef<ReadiumViewRef>(null);
const {
  results,
  hasMore,
  isSearching,
  isLoadingMore,
  search,
  loadMore,
  clear,
} = useSearch(ref);

search('whale'); // start a search
loadMore(); // fetch the next page, e.g. as the list nears its end
clear(); // cancel and reset

<ReadiumView ref={ref} file={file} />;
```

Each result has a `locator`, which you pass to `ref.current?.goTo(locator)` to show the match, and
`before`, `highlight` and `after` text for showing it in context.

## The ref methods

The hook wraps three ref methods, for apps that manage results themselves:

```tsx
const first = await ref.current?.search('whale', {
  caseSensitive: false, // also: diacriticSensitive, wholeWord, regularExpression, language
});
// first.results, first.hasMore, first.totalCount, first.isSupported

if (first?.hasMore) {
  const next = await ref.current?.loadMoreSearchResults();
}

ref.current?.cancelSearch(); // releases the search
```

Results are paged lazily. Wait for each page before asking for the next: Readium's search can't
be advanced concurrently. The hook already serializes requests.

The [example app's search panel](https://github.com/5-stones/react-native-readium/blob/main/apps/common-app/src/components/SearchPanel.tsx)
shows a full UI with infinite scroll.
