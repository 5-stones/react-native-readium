# API reference

## Components

| Name | Description |
| ------ | ------ |
| [ReadiumView](variables/ReadiumView.md) | Renders a publication: an EPUB or PDF on iOS and Android, or a web publication on web. |
| [ReadiumViewRef](interfaces/ReadiumViewRef.md) | Moves the reader, searches and zooms; get it with a ref on [ReadiumView](variables/ReadiumView.md). |
| [ReadiumProps](interfaces/ReadiumProps.md) | The props of [ReadiumView](variables/ReadiumView.md). |

## Hooks

| Name | Description |
| ------ | ------ |
| [UseSearchResult](interfaces/UseSearchResult.md) | What [useSearch](functions/useSearch.md) returns: the accumulated results, their state, and the actions. |
| [useSearch](functions/useSearch.md) | Drives paginated full-text search for a `ReadiumView`. |

## Functions

| Function | Description |
| ------ | ------ |
| [describePublicationError](functions/describePublicationError.md) | The default English description of a `PublicationErrorCode`, as `message` reports it. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [Dimensions](interfaces/Dimensions.md) | - |
| [Link](interfaces/Link.md) | An interface representing the Readium Link object. Extends the Nitro spec Link with an optional properties bag and supports hierarchical TOC via nested children. |
| [Preferences](interfaces/Preferences.md) | How the reader lays out and styles a publication: theme, font size, margins and the rest. Readium's defaults apply to anything left out, and `PublicationReadyEvent.capabilities` says which of these the publication you opened responds to. |
| [PublicationMetadata](interfaces/PublicationMetadata.md) | Publication metadata following Readium Web Publication Manifest spec. Extends the Nitro spec metadata with the `@type` field. |
| [PublicationReadyEvent](interfaces/PublicationReadyEvent.md) | - |
| [ZoomEvent](interfaces/ZoomEvent.md) | Reports the reader's magnification, including changes the reader makes with a pinch or a double tap rather than through `setZoom`. |
| [ReadiumFile](interfaces/ReadiumFile.md) | The publication a `ReadiumView` opens. |
| [DecorationStyle](interfaces/DecorationStyle.md) | How a decoration looks. |
| [Decoration](interfaces/Decoration.md) | One annotation rendered over the publication, such as a highlight. |
| [DecorationGroup](interfaces/DecorationGroup.md) | A named set of decorations, such as `"highlights"`. |
| [Rect](interfaces/Rect.md) | Where something is on screen, as reported with a tapped decoration below. |
| [Point](interfaces/Point.md) | A single position, in the same coordinates as [Rect](interfaces/Rect.md). |
| [DecorationActivatedEvent](interfaces/DecorationActivatedEvent.md) | - |
| [PublicationErrorEvent](interfaces/PublicationErrorEvent.md) | Something went wrong with a publication; `code` says what. |
| [LocatorLocations](interfaces/LocatorLocations.md) | Where in its resource a `Locator` points. |
| [LocatorText](interfaces/LocatorText.md) | Text around a location, e.g. a search match in context. |
| [Locator](interfaces/Locator.md) | A location in a publication, as Readium describes it: reading positions, bookmarks, highlights and search results are all locators. Store them as they are to reopen there later. |
| [Contributor](interfaces/Contributor.md) | What a publication says about itself: title, authors, subjects, accessibility and where it belongs in a series. |
| [Subject](interfaces/Subject.md) | - |
| [SeriesInfo](interfaces/SeriesInfo.md) | - |
| [BelongsTo](interfaces/BelongsTo.md) | - |
| [AccessibilityCertification](interfaces/AccessibilityCertification.md) | - |
| [Accessibility](interfaces/Accessibility.md) | - |
| [PreferencesChangedEvent](interfaces/PreferencesChangedEvent.md) | Reported by `onPreferencesChanged` once preferences are applied. |
| [SearchOptions](interfaces/SearchOptions.md) | - |
| [SearchResult](interfaces/SearchResult.md) | - |
| [SearchPage](interfaces/SearchPage.md) | A single page of search results, returned by `search()` and `loadMoreSearchResults()`. Results are paginated lazily: keep calling `loadMoreSearchResults()` while `hasMore` is true. |
| [SelectionAction](interfaces/SelectionAction.md) | An item added to the text-selection menu. |
| [SelectionEvent](interfaces/SelectionEvent.md) | Reported by `onSelectionChange` as the user adjusts a selection. |
| [SelectionActionEvent](interfaces/SelectionActionEvent.md) | Reported by `onSelectionAction` when the user picks one of the `selectionActions`. |
| [ResolveSourceRequest](interfaces/ResolveSourceRequest.md) | What `resolveSource` is being asked to resolve. |
| [PublicationSource](interfaces/PublicationSource.md) | Where a publication's bytes are, as opposed to which publication it is. |
| [SourceRequestFailure](interfaces/SourceRequestFailure.md) | A request the library made for the publication, which failed. |

## References

### ~~File~~

Renames and re-exports [ReadiumFile](interfaces/ReadiumFile.md)

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [~~DecorationGroups~~](type-aliases/DecorationGroups.md) | - |
| [~~ReaderColumnCountLegacy~~](type-aliases/ReaderColumnCountLegacy.md) | The column counts kept for compatibility. |
| [ReaderColumnCount](type-aliases/ReaderColumnCount.md) | How many columns a reflowable publication is laid out in: one, two, or whatever suits the viewport. |
| [PublicationErrorCode](type-aliases/PublicationErrorCode.md) | What went wrong with a publication. - `protectionNotSupported`: protected with a scheme no registered content protection handles. - `restricted`: a protection matched but refused access, e.g. an expired license. - `cancelled`: restricted with no error, e.g. the passphrase prompt was dismissed. - `readFailed`: a read of an *open* publication failed and was not recovered. The only code that does not mean the publication failed to open; see the event's `stage`. |
| [PublicationErrorStage](type-aliases/PublicationErrorStage.md) | Whether a publication failed to open, or failed to be read after it was open. |
| [PublicationErrorKind](type-aliases/PublicationErrorKind.md) | For a read failure, whether a status was readable at all. `'unreadable'` covers a host that omits CORS headers from its errors, which withholds the status from a web reader; native always has one. |
| [ReaderFontFamily](type-aliases/ReaderFontFamily.md) | Font families Readium knows by name, including the ones it ships. |
| [ReaderImageFilter](type-aliases/ReaderImageFilter.md) | What to do with a publication's images in a dark theme. |
| [ReaderReadingProgression](type-aliases/ReaderReadingProgression.md) | Which way the reader turns pages: left to right, or right to left. |
| [ReaderSpread](type-aliases/ReaderSpread.md) | Whether two pages are shown side by side, as in a printed book. |
| [ReaderTextAlign](type-aliases/ReaderTextAlign.md) | How a publication's text is aligned, where the publication allows it. |
| [ReaderTheme](type-aliases/ReaderTheme.md) | The reader's colour scheme. |
| [ReaderFit](type-aliases/ReaderFit.md) | How a PDF's page is sized to the view. |
| [ReaderScrollAxis](type-aliases/ReaderScrollAxis.md) | Which way a scrolled PDF scrolls. |
| [Capabilities](type-aliases/Capabilities.md) | Something the reader can do with the publication it opened. |
| [SourceRequestReason](type-aliases/SourceRequestReason.md) | Why a location is being asked for. |

## Variables

| Variable | Description |
| ------ | ------ |
| [RANGES](variables/RANGES.md) | The range of each numeric preference, as `[min, max]`, e.g. for a slider. |
