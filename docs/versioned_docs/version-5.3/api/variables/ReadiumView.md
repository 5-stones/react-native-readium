# ReadiumView

```ts
const ReadiumView: ForwardRefExoticComponent<Omit<ReadiumViewProps, "file" | "preferences" | "onPublicationReady"> & object & RefAttributes<ReadiumViewRef>>;
```

Renders a publication: an EPUB or PDF on iOS and Android, or a web publication on web.

## Example

```tsx
<ReadiumView
  file={{ url: path, initialLocation: savedLocator }}
  preferences={{ theme: 'dark' }}
  onLocationChange={saveLocator}
/>
```
