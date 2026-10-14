# ReadiumProps

The props of [ReadiumView](../variables/ReadiumView.md).

Built from the view's own definition — `ReadiumViewProps` in
`src/specs/ReadiumView.nitro.ts`, which the native bindings are generated
from — so that a prop passed straight through to the view is declared, and
documented, in one place. What follows is only what this surface adds or
changes:

  - `file` is required here. A view with nothing to open is a state the
    library allows itself, not one to hand a consumer.
  - `onPublicationReady` carries a nested table of contents, which the
    bridge cannot: a self-referencing type is more than nitrogen can
    generate, so it crosses flat and is rebuilt here.
  - `preferences` offers the font families Readium knows as suggestions,
    which the bridge cannot carry: nitrogen refuses "an enum or any string"
    as ambiguous.
  - `style` is the React Native view's, not the Readium view's.

It takes nothing away any more: every prop the view understands is a prop a
consumer may set.

## Properties

### file

```ts
file: ReadiumFile;
```

The publication to open, and where to start. Setting a different `url` opens that
publication in the same view.

***

### preferences?

```ts
optional preferences?: Preferences;
```

How the reader lays out and styles the publication: theme, font size,
margins, …. Readium's defaults apply to anything left out. Check
`capabilities` for what applies.

The view's own preferences, with the font families Readium knows offered
as suggestions; see [Preferences](Preferences.md).

***

### onPublicationReady?

```ts
optional onPublicationReady?: (event) => void;
```

The publication opened: its metadata, table of contents, positions and capabilities.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`PublicationReadyEvent`](PublicationReadyEvent.md) |

#### Returns

`void`

***

### style?

```ts
optional style?: any;
```

The view's style.

***

### decorations?

```ts
optional decorations?: DecorationGroup[];
```

Highlights and underlines to render, in named groups.

***

### selectionActions?

```ts
optional selectionActions?: SelectionAction[];
```

Items added to the text-selection menu; picking one fires
`onSelectionAction`.

The menu is the operating system's on iOS and Android. A browser has
none, so on web the library draws one beside the selection, with these
same items.

***

### onLocationChange?

```ts
optional onLocationChange?: (locator) => void;
```

The reading position changed, e.g. the user turned a page. Save it to reopen there.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `locator` | [`Locator`](Locator.md) |

#### Returns

`void`

***

### onPreferencesChanged?

```ts
optional onPreferencesChanged?: (event) => void;
```

Preferences were applied; reports which ones now apply.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`PreferencesChangedEvent`](PreferencesChangedEvent.md) |

#### Returns

`void`

***

### onPublicationError?

```ts
optional onPublicationError?: (event) => void;
```

Something went wrong with the publication; `code` says what and `stage`
says how bad. The public event adds the `message` that goes with `code`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`PublicationErrorEvent`](PublicationErrorEvent.md) |

#### Returns

`void`

***

### shouldRefreshSource?

```ts
optional shouldRefreshSource?: (failure) => Promise<boolean>;
```

Whether a failed request should prompt a new location from
`resolveSource`.

Left unset, the platform decides, and the default is the shapes a
credential that has expired or been refused takes: a 401 or a 403 on every
platform, and on web also an `unreadable` failure, which exists because a
cross-origin error response withholds its status. Native always has the
status, so it has no equivalent.

Return false to let the failure stand. It is then reported through
`onPublicationError` with `stage: 'read'`, on every platform, so a
consumer can offer a retry rather than leaving a page quietly missing.

Worth overriding where those statuses mean something else: a host that
answers 403 for "not permitted" rather than "credential stale" gains
nothing from a new location, and a host that signals expiry with a 404 or
a 400 would otherwise never be refreshed at all.

Always asynchronous, even where the answer is a comparison: native cannot
wait on the JS thread for a value, so an answer always arrives as a
promise.

A location that keeps failing is not asked for again indefinitely: two
relocations without a request succeeding in between, and ten seconds for
this and `resolveSource` together to answer a failure before it is left to
stand. Only one failure is answered at a time, so a predicate that never
settles would otherwise hold back every later one.

Requires `resolveSource`. On iOS and Android, leaving it unset means an
ordinary expiry never crosses the bridge to be classified; setting it
costs a round trip per failed read.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `failure` | [`SourceRequestFailure`](SourceRequestFailure.md) |

#### Returns

`Promise`\<`boolean`\>

***

### resolveSource?

```ts
optional resolveSource?: (request) => Promise<PublicationSource>;
```

Where to read `file` from, when that is not `file.url` itself — a signed
url, say, which `file.url` should not be because it expires.

`file.url` remains the publication's identity: it decides when a different
publication has been opened and keys the positions you save, and it is not
fetched while this is set. This supplies only the location, and is asked
again whenever a request fails, without the publication being treated as
a new one.

Called before the first open and on each refresh — never per request. The
request says which publication, and whether this is the first location or
a replacement.

Answering a failed request is on a ten second deadline, shared with
`shouldRefreshSource`; past it the failure stands. Resolving with an empty
url, or rejecting, declines.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`ResolveSourceRequest`](ResolveSourceRequest.md) |

#### Returns

`Promise`\<[`PublicationSource`](PublicationSource.md)\>

***

### onDecorationActivated?

```ts
optional onDecorationActivated?: (event) => void;
```

The user tapped a decoration, e.g. a highlight.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`DecorationActivatedEvent`](DecorationActivatedEvent.md) |

#### Returns

`void`

***

### onSelectionChange?

```ts
optional onSelectionChange?: (event) => void;
```

The text selection changed, as the user adjusts it.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`SelectionEvent`](SelectionEvent.md) |

#### Returns

`void`

***

### onSelectionAction?

```ts
optional onSelectionAction?: (event) => void;
```

The user picked one of the `selectionActions`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`SelectionActionEvent`](SelectionActionEvent.md) |

#### Returns

`void`

***

### onZoomChange?

```ts
optional onZoomChange?: (event) => void;
```

A PDF's magnification changed, including by a pinch.

Web only, and declared here anyway so that the view has one definition:
iOS and Android hand a PDF to PDFKit and AndroidPdfViewer, both of which
zoom by themselves and report nothing back, so there is nothing for them
to relay.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`ZoomEvent`](ZoomEvent.md) |

#### Returns

`void`
