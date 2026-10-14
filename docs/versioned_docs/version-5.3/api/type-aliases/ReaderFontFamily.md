# ReaderFontFamily

```ts
type ReaderFontFamily = 
  | "serif"
  | "sans-serif"
  | "cursive"
  | "fantasy"
  | "monospace"
  | "AccessibleDfA"
  | "IA Writer Duospace"
  | "OpenDyslexic";
```

Font families Readium knows by name, including the ones it ships.

A suggestion list rather than a limit: `Preferences.fontFamily` takes any
family the platform can resolve, and these are the ones you get for free.
