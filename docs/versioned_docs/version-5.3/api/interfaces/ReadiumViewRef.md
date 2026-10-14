# ReadiumViewRef

Moves the reader, searches and zooms; get it with a ref on [ReadiumView](../variables/ReadiumView.md).

## Example

```tsx
const ref = useRef<ReadiumViewRef>(null);
<ReadiumView ref={ref} file={file} />;
ref.current?.goForward();
```

## Methods

### goTo()

```ts
goTo(locator): void;
```

Goes to a location: a chapter, a bookmark, a search result or one of the `positions`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `locator` | [`Locator`](Locator.md) |

#### Returns

`void`

***

### goForward()

```ts
goForward(): void;
```

Goes to the next page.

#### Returns

`void`

***

### goBackward()

```ts
goBackward(): void;
```

Goes to the previous page.

#### Returns

`void`

***

### search()

```ts
search(query, options?): Promise<SearchPage>;
```

Starts a new full-text search and resolves with the first page of results.
Most apps should use `useSearch` instead.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `query` | `string` |
| `options?` | [`SearchOptions`](SearchOptions.md) |

#### Returns

`Promise`\<[`SearchPage`](SearchPage.md)\>

#### Platform

iOS, Android. On web, resolves a page with `isSupported: false`.

***

### loadMoreSearchResults()

```ts
loadMoreSearchResults(): Promise<SearchPage>;
```

Resolves with the next page of results for the in-flight search. Wait for
each page before asking for the next: a search cannot be advanced
concurrently.

#### Returns

`Promise`\<[`SearchPage`](SearchPage.md)\>

***

### cancelSearch()

```ts
cancelSearch(): void;
```

Cancels the in-flight search and releases the iterator.

#### Returns

`void`

***

### zoomIn()

```ts
zoomIn(): void;
```

Magnifies a PDF one step.

#### Returns

`void`

#### Platform

web. iOS and Android hand a PDF to PDFKit and AndroidPdfViewer,
which own their own magnification, so this does nothing there.

***

### zoomOut()

```ts
zoomOut(): void;
```

Reduces a PDF's magnification one step.

#### Returns

`void`

#### Platform

web. Does nothing on iOS and Android; see `zoomIn`.

***

### setZoom()

```ts
setZoom(scale): void;
```

Sets a PDF's magnification, where 1 is the page fitted to the view.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `scale` | `number` |

#### Returns

`void`

#### Platform

web. Does nothing on iOS and Android; see `zoomIn`.

***

### resetZoom()

```ts
resetZoom(): void;
```

Fits the PDF's page to the view again.

#### Returns

`void`

#### Platform

web. Does nothing on iOS and Android; see `zoomIn`.
