# Bookent inline translation extension

This fork adds an opt-in iOS integration used by the Bookent reader application.
The upstream reader behavior is unchanged unless the application registers a
selection action with the ID `get-word`.

## Interaction flow

1. A stationary 500 ms press resolves the word at the touch coordinates without
   creating a WebKit selection.
2. The extension wraps the word in a local inline container and renders the
   translation under the source text.
3. The EPUB web view posts a `BookentTranslationRequest` notification to the host
   application.
4. The host application posts `BookentTranslationResult` with the same request ID.
5. Tapping the translated word posts `BookentTranslationPresentationRequest` so the
   host application can present its detailed translation UI.

The wrapper remains inline with its source text, while the translation is
positioned relative to that local anchor. The wrapper's width is defined only by
the underlined source span; the translation is centered at `left: 50%` with
`translateX(-50%)`. This avoids Safari's separate ruby annotation coordinate
system, keeps the translation out of the line box, and does not require a fixed
full-page overlay or viewport measurements. Very tight line spacing can place a
translation close to the next line, so the host keeps a translation-friendly
minimum line height.
The wrapper uses a compact internal `1.05` line height so its dashed source
underline stays close to the glyphs; the surrounding paragraph keeps the
larger reader line height that reserves space for the translation.
Translation sizing uses the EPUB body root `rem`, with an absolute `10px` floor,
so headings, body text, and footnotes all present translations at one consistent
reader-controlled size. Critical inline geometry, spacing, and font inheritance
are explicitly isolated from publisher `span` rules. Adjacent translations are
measured only after insertion or a reader appearance change. Readium's horizontal
page columns and individual text lines are grouped independently before any
collision adjustment, including columns currently outside the viewport. When
labels collide, they stay in the same reserved vertical lane and receive the
smallest available horizontal displacement. Non-colliding labels remain exactly
centered on their source words. Their font size is never reduced. A label is
hidden only when the full-size labels on one physical line cannot geometrically
fit without overlap; its source underline remains visible and tappable. Temporary
rectangles and visibility decisions are recalculated and are never stored as page
positions.

## Host application contract

The host is responsible for translating the request and posting the result. The
notification payloads use these keys:

- Request: `id`, `word`, `sentence`, `wordStart`, `wordLength`,
  `sourceLanguage`, `targetLanguage`.
- Result: `id`, `translation`, `sentenceTranslation`, and optional `error`.
- Presentation: `text`, `translation`, `sentence`, `sentenceTranslation`,
  `sourceLanguage`, `targetLanguage`.

The host can update the translation font scale by storing
`BookentInlineTranslationFontScale` in `UserDefaults` and posting
`BookentTranslationAppearanceChanged` with a `fontScale` value. The extension
clamps the scale to `0.6...0.92`; the default is `0.85` of the EPUB root font
size. CSS also enforces an absolute `10px` floor for unusually small EPUB root
font sizes.

## Maintenance boundaries

- Keep translation and presentation business logic in the host application.
- Keep this fork limited to EPUB interaction, inline presentation, and the WebKit bridge.
- Rebase upstream releases in a dedicated branch and run the inline translation
  tests before updating the application dependency.
- Do not add `patch-package` on top of this fork.
