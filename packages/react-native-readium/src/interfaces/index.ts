/**
 * The library's public types.
 *
 * Most are the view's own, declared in `src/specs/*.nitro.ts` and re-exported
 * from here as they are. The files beside this one hold the few that are more
 * than that: a type the bridge cannot express, a value a platform does not
 * report, or a helper that goes with one.
 */

export * from './Decoration';
export * from './Dimensions';
export * from './Link';
export * from './Preferences';
export * from './PublicationError';
export * from './PublicationMetadata';
export * from './PublicationReady';

export type {
  Capabilities,
  // The values a preference accepts, named so that the docs can link them and
  // a consumer can name them too.
  ReaderFit,
  ReaderImageFilter,
  ReaderReadingProgression,
  ReaderScrollAxis,
  ReaderSpread,
  ReaderTextAlign,
  ReaderTheme,
  // What an error says about itself, beyond its code.
  PublicationErrorKind,
  PublicationErrorStage,
  // Why a location is being asked for.
  SourceRequestReason,
  Locator,
  LocatorLocations,
  LocatorText,
  Point,
  PreferencesChangedEvent,
  PublicationErrorCode,
  ReadiumFile,
  Rect,
  SearchOptions,
  SearchPage,
  SearchResult,
  SelectionAction,
  SelectionActionEvent,
  SelectionEvent,
  ZoomEvent,
} from '../specs';

/**
 * @deprecated Use ReadiumFile instead
 */
export type { ReadiumFile as File } from '../specs';
