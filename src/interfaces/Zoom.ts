/**
 * Reports the reader's magnification, including changes the reader makes with
 * a pinch or a double tap rather than through `setZoom`.
 *
 * `scale` is relative to the fitted page - 1 means one page sized to the
 * viewport - rather than being a raw platform scale factor, which would depend
 * on the page's own dimensions and so mean something different in every
 * publication (and, in a scanned one, on every page).
 *
 * Web only. iOS and Android hand a PDF to PDFKit and AndroidPdfViewer
 * respectively, both of which zoom on a pinch by themselves and report nothing
 * back, so there is nothing to relay there.
 */
export interface ZoomEvent {
  /** Current magnification, where 1 is the page fitted to the reader. */
  scale: number;
  /** Smallest `scale` the current layout allows. */
  min: number;
  /** Largest `scale` the current layout allows. */
  max: number;
}
