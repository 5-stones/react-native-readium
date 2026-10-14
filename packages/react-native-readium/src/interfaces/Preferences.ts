import type {
  Preferences as SpecPreferences,
  ReaderFontFamily,
} from '../specs';

export type { ReaderFontFamily };

/**
 * The column counts kept for compatibility.
 *
 * @deprecated Use `'one'` and `'two'`. These are removed in the next major,
 * which is also when the vocabulary can move into the view's own definition:
 * see `design/publication-handle.md`.
 */
export type ReaderColumnCountLegacy = '1' | '2';

/**
 * How many columns a reflowable publication is laid out in: one, two, or
 * whatever suits the viewport.
 *
 * `'1'` and `'2'` still work and are deprecated; see
 * {@link ReaderColumnCountLegacy}.
 */
export type ReaderColumnCount =
  | 'auto'
  | 'one'
  | 'two'
  | ReaderColumnCountLegacy;

/**
 * How the reader lays out and styles a publication: theme, font size, margins
 * and the rest. Readium's defaults apply to anything left out, and
 * `PublicationReadyEvent.capabilities` says which of these the publication
 * you opened responds to.
 *
 * Every value a preference accepts is a named type — {@link ReaderTheme},
 * {@link ReaderSpread} and so on — so your editor offers them. `fontFamily`
 * is the exception: it takes any family the platform can resolve, with
 * {@link ReaderFontFamily} offered as suggestions.
 */
export interface Preferences
  extends Omit<SpecPreferences, 'fontFamily' | 'columnCount'> {
  /**
   * How many columns a reflowable publication is laid out in.
   *
   * Narrowed here rather than in the view's own definition, where it would be
   * generated as a native enum with a case called `1`. See
   * {@link ReaderColumnCount}.
   */
  columnCount?: ReaderColumnCount;
  /**
   * Any font family the platform can resolve, by name.
   * {@link ReaderFontFamily} lists the ones Readium knows.
   */
  // `string & {}` keeps the suggestions above from being swallowed: a plain
  // `| string` widens the whole union back to `string` and offers nothing.
  fontFamily?: ReaderFontFamily | (string & {});
}
