# SearchPage

A single page of search results, returned by `search()` and
`loadMoreSearchResults()`. Results are paginated lazily: keep calling
`loadMoreSearchResults()` while `hasMore` is true.

## Properties

### results

```ts
results: SearchResult[];
```

The matches in this page (may be empty on the terminal page).

***

### hasMore

```ts
hasMore: boolean;
```

True while more pages remain to be fetched via `loadMoreSearchResults()`.

***

### totalCount?

```ts
optional totalCount?: number;
```

Total number of matches across the whole search, when the service knows it.

***

### isSupported

```ts
isSupported: boolean;
```

False when the publication has no search service (e.g. not searchable).
