# useSearch()

```ts
function useSearch(ref): UseSearchResult;
```

Drives paginated full-text search for a `ReadiumView`.

Pass the same ref you give to `<ReadiumView ref={...} />`. Call `search` to
start, `loadMore` (e.g. on a list's `onEndReached`) while `hasMore` is true,
and `clear` to reset.

The hook serialises page requests internally so a single Readium
`SearchIterator` is never advanced concurrently, and ignores responses from a
search that has since been superseded or cleared.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `ref` | `RefObject`\<[`ReadiumViewRef`](../interfaces/ReadiumViewRef.md) \| `null`\> |

## Returns

[`UseSearchResult`](../interfaces/UseSearchResult.md)
