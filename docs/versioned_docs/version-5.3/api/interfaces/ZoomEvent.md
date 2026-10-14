# ZoomEvent

Reports the reader's magnification, including changes the reader makes with
a pinch or a double tap rather than through `setZoom`.

`scale` is relative to the fitted page — 1 means one page sized to the
viewport — rather than being a raw platform scale factor, which would depend
on the page's own dimensions and so mean something different in every
publication (and, in a scanned one, on every page).

## Properties

### scale

```ts
scale: number;
```

Current magnification, where 1 is the page fitted to the reader.

***

### min

```ts
min: number;
```

Smallest `scale` the current layout allows.

***

### max

```ts
max: number;
```

Largest `scale` the current layout allows.
