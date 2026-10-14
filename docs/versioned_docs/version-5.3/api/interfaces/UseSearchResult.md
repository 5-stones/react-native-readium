# UseSearchResult

What [useSearch](../functions/useSearch.md) returns: the accumulated results, their state, and the actions.

## Properties

### query

```ts
query: string;
```

The most recent (trimmed) query passed to `search`.

***

### results

```ts
results: SearchResult[];
```

All results loaded so far, across every page fetched.

***

### isSearching

```ts
isSearching: boolean;
```

True while the first page of a new search is loading.

***

### isLoadingMore

```ts
isLoadingMore: boolean;
```

True while an additional page is loading via `loadMore`.

***

### isSupported

```ts
isSupported: boolean;
```

Whether the current publication supports full-text search.

***

### hasMore

```ts
hasMore: boolean;
```

True while more pages remain; drives infinite scroll / `loadMore`.

***

### totalCount?

```ts
optional totalCount?: number;
```

Total number of matches, when known. Note this is a running tally that
grows as pages are loaded — Readium can rarely report a final total before
the whole publication has been searched.

***

### search

```ts
search: (query, options?) => Promise<void>;
```

Starts a new search, replacing any results from a previous one.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `query` | `string` |
| `options?` | [`SearchOptions`](SearchOptions.md) |

#### Returns

`Promise`\<`void`\>

***

### loadMore

```ts
loadMore: () => Promise<void>;
```

Loads the next page of results for the in-flight search.

#### Returns

`Promise`\<`void`\>

***

### clear

```ts
clear: () => void;
```

Clears results and cancels any in-flight search.

#### Returns

`void`
