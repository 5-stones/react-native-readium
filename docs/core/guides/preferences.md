---
title: Preferences
---

# Preferences

The `preferences` prop controls how the reader lays out and styles the publication:

```tsx
<ReadiumView
  file={file}
  preferences={{
    theme: 'dark',
    fontSize: 1.2,
    pageMargins: 1.5,
    scroll: false,
  }}
/>
```

Pass only what you want to change; Readium's defaults apply to the rest. Changing the prop updates
the open publication in place.

## EPUB

| Preference                                                                          | Values                                                                                                                          |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `theme`                                                                             | `'light'`, `'dark'`, `'sepia'`                                                                                                  |
| `backgroundColor`, `textColor`                                                      | CSS colors, overriding the theme's                                                                                              |
| `fontFamily`                                                                        | `'serif'`, `'sans-serif'`, `'cursive'`, `'fantasy'`, `'monospace'`, `'AccessibleDfA'`, `'IA Writer Duospace'`, `'OpenDyslexic'` |
| `fontSize`, `fontWeight`, `typeScale`                                               | Numbers                                                                                                                         |
| `lineHeight`, `letterSpacing`, `wordSpacing`, `paragraphIndent`, `paragraphSpacing` | Numbers                                                                                                                         |
| `pageMargins`                                                                       | A number                                                                                                                        |
| `textAlign`                                                                         | `'center'`, `'justify'`, `'start'`, `'end'`, `'left'`, `'right'`                                                                |
| `columnCount`                                                                       | `'auto'`, `'1'`, `'2'`                                                                                                          |
| `scroll`                                                                            | `true` to scroll instead of paginate                                                                                            |
| `spread`                                                                            | `'auto'`, `'never'`, `'always'`                                                                                                 |
| `readingProgression`                                                                | `'ltr'`, `'rtl'`                                                                                                                |
| `imageFilter`                                                                       | `'darken'`, `'invert'`                                                                                                          |
| `hyphens`, `ligatures`, `publisherStyles`, `textNormalization`, `verticalText`      | Booleans                                                                                                                        |
| `language`                                                                          | A BCP 47 language tag                                                                                                           |

Each preference's range and default follow Readium's; see the
[preference constraints](https://github.com/readium/swift-toolkit/blob/main/docs/Guides/Navigator%20Preferences.md#appendix-preference-constraints).

## PDF

`fit` (`'cover'`, `'contain'`, `'width'`, `'height'`), `scroll`, `scrollAxis`
(`'horizontal'`, `'vertical'`), `spread`, `pageSpacing`, `offsetFirstPage`, `visibleScrollbar`,
`backgroundColor` and `readingProgression`.

Support varies by platform: on iOS, PDFs always scroll vertically, one page wide. Check
`capabilities` to see what applies.

## Knowing which preferences apply

Reflowable EPUBs, fixed-layout EPUBs and PDFs support different preferences on each platform, and
some preferences only take effect alongside others (`scrollAxis` needs `scroll`, for example).
`onPublicationReady` and `onPreferencesChanged` report `capabilities`: a boolean for every
preference, saying whether it currently applies, plus `zoom`, `search`, `decorations` and
`selection` for features that aren't preferences. Show a control only when it does something:

```tsx
function Reader({ file, preferences }: ReaderProps) {
  const [capabilities, setCapabilities] = useState<Capabilities>();

  return (
    <>
      <ReadiumView
        file={file}
        preferences={preferences}
        onPublicationReady={(event) => setCapabilities(event.capabilities)}
        onPreferencesChanged={(event) => setCapabilities(event.capabilities)}
      />
      {capabilities?.fontSize ? <FontSizeSlider /> : null}
      {capabilities?.zoom ? <ZoomControls /> : null}
    </>
  );
}
```
