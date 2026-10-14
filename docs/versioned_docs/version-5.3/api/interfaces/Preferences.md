# Preferences

How the reader lays out and styles a publication: theme, font size, margins
and the rest. Readium's defaults apply to anything left out, and
`PublicationReadyEvent.capabilities` says which of these the publication
you opened responds to.

Every value a preference accepts is a named type — [ReaderTheme](../type-aliases/ReaderTheme.md),
[ReaderSpread](../type-aliases/ReaderSpread.md) and so on — so your editor offers them. `fontFamily`
is the exception: it takes any family the platform can resolve, with
[ReaderFontFamily](../type-aliases/ReaderFontFamily.md) offered as suggestions.

## Extends

- `Omit`\<`SpecPreferences`, `"fontFamily"` \| `"columnCount"`\>

## Properties

### columnCount?

```ts
optional columnCount?: ReaderColumnCount;
```

How many columns a reflowable publication is laid out in.

Narrowed here rather than in the view's own definition, where it would be
generated as a native enum with a case called `1`. See
[ReaderColumnCount](../type-aliases/ReaderColumnCount.md).

***

### fontFamily?

```ts
optional fontFamily?: 
  | ReaderFontFamily
  | string & object;
```

Any font family the platform can resolve, by name.
[ReaderFontFamily](../type-aliases/ReaderFontFamily.md) lists the ones Readium knows.

***

### backgroundColor?

```ts
optional backgroundColor?: string;
```

#### Inherited from

```ts
Omit.backgroundColor
```

***

### fontSize?

```ts
optional fontSize?: number;
```

#### Inherited from

```ts
Omit.fontSize
```

***

### fontWeight?

```ts
optional fontWeight?: number;
```

#### Inherited from

```ts
Omit.fontWeight
```

***

### hyphens?

```ts
optional hyphens?: boolean;
```

#### Inherited from

```ts
Omit.hyphens
```

***

### imageFilter?

```ts
optional imageFilter?: ReaderImageFilter;
```

#### Inherited from

```ts
Omit.imageFilter
```

***

### language?

```ts
optional language?: string;
```

#### Inherited from

```ts
Omit.language
```

***

### letterSpacing?

```ts
optional letterSpacing?: number;
```

#### Inherited from

```ts
Omit.letterSpacing
```

***

### ligatures?

```ts
optional ligatures?: boolean;
```

#### Inherited from

```ts
Omit.ligatures
```

***

### lineHeight?

```ts
optional lineHeight?: number;
```

#### Inherited from

```ts
Omit.lineHeight
```

***

### pageMargins?

```ts
optional pageMargins?: number;
```

#### Inherited from

```ts
Omit.pageMargins
```

***

### paragraphIndent?

```ts
optional paragraphIndent?: number;
```

#### Inherited from

```ts
Omit.paragraphIndent
```

***

### paragraphSpacing?

```ts
optional paragraphSpacing?: number;
```

#### Inherited from

```ts
Omit.paragraphSpacing
```

***

### publisherStyles?

```ts
optional publisherStyles?: boolean;
```

#### Inherited from

```ts
Omit.publisherStyles
```

***

### readingProgression?

```ts
optional readingProgression?: ReaderReadingProgression;
```

#### Inherited from

```ts
Omit.readingProgression
```

***

### scroll?

```ts
optional scroll?: boolean;
```

#### Inherited from

```ts
Omit.scroll
```

***

### spread?

```ts
optional spread?: ReaderSpread;
```

#### Inherited from

```ts
Omit.spread
```

***

### textAlign?

```ts
optional textAlign?: ReaderTextAlign;
```

#### Inherited from

```ts
Omit.textAlign
```

***

### textColor?

```ts
optional textColor?: string;
```

#### Inherited from

```ts
Omit.textColor
```

***

### textNormalization?

```ts
optional textNormalization?: boolean;
```

#### Inherited from

```ts
Omit.textNormalization
```

***

### theme?

```ts
optional theme?: ReaderTheme;
```

#### Inherited from

```ts
Omit.theme
```

***

### typeScale?

```ts
optional typeScale?: number;
```

#### Inherited from

```ts
Omit.typeScale
```

***

### verticalText?

```ts
optional verticalText?: boolean;
```

#### Inherited from

```ts
Omit.verticalText
```

***

### wordSpacing?

```ts
optional wordSpacing?: number;
```

#### Inherited from

```ts
Omit.wordSpacing
```

***

### fit?

```ts
optional fit?: ReaderFit;
```

#### Inherited from

```ts
Omit.fit
```

***

### offsetFirstPage?

```ts
optional offsetFirstPage?: boolean;
```

#### Inherited from

```ts
Omit.offsetFirstPage
```

***

### pageSpacing?

```ts
optional pageSpacing?: number;
```

#### Inherited from

```ts
Omit.pageSpacing
```

***

### scrollAxis?

```ts
optional scrollAxis?: ReaderScrollAxis;
```

#### Inherited from

```ts
Omit.scrollAxis
```

***

### visibleScrollbar?

```ts
optional visibleScrollbar?: boolean;
```

#### Inherited from

```ts
Omit.visibleScrollbar
```
