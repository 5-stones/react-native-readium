import type { Preferences, File, PublicationReadyEvent } from '../interfaces';
import type { ReadiumViewMethods, ReadiumViewProps } from '../specs';

/**
 * A request the library made for the publication, which failed.
 *
 * @interface
 * @group Components
 */
export type {
  PublicationSource,
  ResolveSourceRequest,
  SourceRequestFailure,
} from '../specs';

/**
 * Moves the reader, searches and zooms; get it with a ref on {@link ReadiumView}.
 *
 * @example
 * ```tsx
 * const ref = useRef<ReadiumViewRef>(null);
 * <ReadiumView ref={ref} file={file} />;
 * ref.current?.goForward();
 * ```
 *
 * @interface
 * @group Components
 */
export type ReadiumViewRef = Omit<ReadiumViewMethods, 'destroy'>;

/**
 * The props of {@link ReadiumView}.
 *
 * Built from the view's own definition — `ReadiumViewProps` in
 * `src/specs/ReadiumView.nitro.ts`, which the native bindings are generated
 * from — so that a prop passed straight through to the view is declared, and
 * documented, in one place. What follows is only what this surface adds or
 * changes:
 *
 *   - `file` is required here. A view with nothing to open is a state the
 *     library allows itself, not one to hand a consumer.
 *   - `onPublicationReady` carries a nested table of contents, which the
 *     bridge cannot: a self-referencing type is more than nitrogen can
 *     generate, so it crosses flat and is rebuilt here.
 *   - `preferences` offers the font families Readium knows as suggestions,
 *     which the bridge cannot carry: nitrogen refuses "an enum or any string"
 *     as ambiguous.
 *   - `style` is the React Native view's, not the Readium view's.
 *
 * It takes nothing away any more: every prop the view understands is a prop a
 * consumer may set.
 *
 * @interface
 * @group Components
 */
export type ReadiumProps = Omit<
  ReadiumViewProps,
  'file' | 'preferences' | 'onPublicationReady'
> & {
  /**
   * The publication to open, and where to start. Setting a different `url` opens that
   * publication in the same view.
   */
  file: File;
  /**
   * How the reader lays out and styles the publication: theme, font size,
   * margins, …. Readium's defaults apply to anything left out. Check
   * `capabilities` for what applies.
   *
   * The view's own preferences, with the font families Readium knows offered
   * as suggestions; see {@link Preferences}.
   */
  preferences?: Preferences;
  /** The publication opened: its metadata, table of contents, positions and capabilities. */
  onPublicationReady?: (event: PublicationReadyEvent) => void;
  /** The view's style. */
  style?: any;
};
