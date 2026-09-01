import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
} from 'pdfjs-dist';
import type {
  Link,
  Locator,
  PublicationReadyEvent,
  ReadiumFile,
  ZoomEvent,
} from '../../src/interfaces';

interface UsePdfNavigatorProps {
  file: ReadiumFile;
  container: HTMLElement | null;
  onLocationChange?: (locator: Locator) => void;
  onPublicationReady?: (event: PublicationReadyEvent) => void;
  onZoomChange?: (event: ZoomEvent) => void;
  initialPage?: number;
  onError?: (error: any) => void;
}

/** Pages painted either side of the visible one. */
const RENDER_AHEAD = 1;
/** Viewport margin at which a page starts rendering, in px. */
const RENDER_MARGIN_PX = 600;
/** Distance past which a page's canvas is released again. */
const EVICT_AFTER_PAGES = 4;
/** Page viewports fetched at once while the strip is being built. */
const VIEWPORT_CONCURRENCY = 8;
/** Vertical gap between pages, and the strip's own top/bottom padding. */
const PAGE_GAP_PX = 20;

/**
 * Ceilings on a page's backing store.
 *
 * iOS Safari refuses a canvas over 4096px on a side and over roughly 16M pixels
 * in total, and it fails by handing back a blank bitmap rather than by throwing,
 * so a page that trips either limit renders as an empty rectangle and reports
 * success. Both caps are therefore applied unconditionally - there is no
 * resolution floor that could push a canvas back over them.
 */
const MAX_CANVAS_SIDE = 4096;
const MAX_CANVAS_PIXELS = 16_000_000;
/** Beyond 2x the extra pixels are not worth the memory. */
const MAX_DEVICE_PIXEL_RATIO = 2;

/**
 * Magnification bounds, where 1 is a page fitted to the reader's width.
 *
 * The floor is far below anything a reader would step down to by hand, because
 * `fitHeight` has to be able to reach it: fitting a page ten times taller than
 * it is wide into the viewport needs a scale in the low hundredths, and a
 * floor that clamped it would make the control silently not do its job.
 */
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 4;
/** One press of a zoom control - the 25% step desktop PDF readers use. */
const ZOOM_STEP = 1.25;
/** Where a double click lands when the page is fitted. */
const DOUBLE_TAP_ZOOM = 2;

/** Idle time after the last wheel event that ends a trackpad pinch. */
const WHEEL_SETTLE_MS = 140;
/** Longest gap between two taps that still reads as a double tap. */
const DOUBLE_TAP_MS = 300;
/** How far a second tap may land from the first and still pair with it. */
const DOUBLE_TAP_SLOP_PX = 24;
/** Below this much finger travel a two-finger touch is a pan, not a pinch. */
const PINCH_THRESHOLD_PX = 8;
/** Settling time for a programmatic scroll, before positions are reported again. */
const NAVIGATION_SETTLE_MS = 100;

/**
 * HREF of the single reading-order resource for a standalone PDF.
 *
 * The Readium toolkits deliberately name a standalone file `publication.<ext>`
 * rather than using its filename, so that a locator stays valid across devices
 * where the file may be stored under a different name (see `SingleResourceContainer`
 * in ReadiumStreamer). Emitting the same href here keeps locators produced on web
 * resolvable by the iOS and Android navigators, and vice versa.
 */
const PDF_PUBLICATION_HREF = 'publication.pdf';

interface OutlineNode {
  title: string;
  dest: string | any[] | null;
  items?: OutlineNode[];
}

interface PageSize {
  width: number;
  height: number;
}

const clampZoom = (scale: number): number => {
  if (!Number.isFinite(scale)) return 1;
  return Math.min(Math.max(scale, MIN_ZOOM), MAX_ZOOM);
};

/**
 * Scale to rasterise a page at so it is sharp when drawn `cssWidth` px wide.
 *
 * The displayed width is what matters, not the page's own dimensions: a page is
 * always stretched to the strip, so a 360pt page and a 1440pt page shown side by
 * side need very different scales to look the same. Both caps are hard, which is
 * what keeps a page ten times taller than it is wide inside the canvas limits -
 * it comes out soft rather than blank.
 */
const rasterScaleFor = (natural: PageSize, cssWidth: number): number => {
  if (natural.width <= 0 || natural.height <= 0 || cssWidth <= 0) return 1;

  const dpr = Math.min(
    typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1,
    MAX_DEVICE_PIXEL_RATIO
  );

  const target = (cssWidth / natural.width) * dpr;
  const bySide = Math.min(
    MAX_CANVAS_SIDE / natural.width,
    MAX_CANVAS_SIDE / natural.height
  );
  const byArea = Math.sqrt(
    MAX_CANVAS_PIXELS / (natural.width * natural.height)
  );

  return Math.min(target, bySide, byArea);
};

export const usePdfNavigator = ({
  file,
  container,
  onLocationChange,
  onPublicationReady,
  onZoomChange,
  initialPage = 1,
  // There is no public error channel on ReadiumView yet, so failures are at
  // least reported rather than leaving a blank reader with no explanation.
  onError = (error: any) => {
    // eslint-disable-next-line no-console
    console.error('[react-native-readium] failed to open PDF', error);
  },
}: UsePdfNavigatorProps) => {
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  // Held so the worker can be torn down on cleanup: `destroy()` lives on the
  // loading task, not on the document proxy.
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [pageCount, setPageCount] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [zoom, setZoomState] = useState(1);
  const isNavigatingRef = useRef<boolean>(false);

  /** The strip element, so navigation and zoom can reach it after it is built. */
  const wrapperRef = useRef<HTMLElement | null>(null);
  /** Natural size per page, measured once when the strip is built. */
  const sizesRef = useRef<Map<number, PageSize>>(new Map());
  /** Repaints the pages around the visible one at the current zoom. */
  const repaintRef = useRef<(() => void) | null>(null);
  // Read by the gesture handlers and the step helpers, so neither has to be
  // rebuilt - and the imperative handle with them - as the magnification moves.
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  // Read by `repaint`, which is built once with the strip and would otherwise
  // close over the page the reader happened to open on.
  const pageNumberRef = useRef(pageNumber);
  pageNumberRef.current = pageNumber;

  const isPdfUrl = (url: string) => url.toLowerCase().split('?')[0].endsWith('.pdf');
  const isPdf = !!file?.url && isPdfUrl(file.url);
  const url = file?.url;

  const resolveDestToPageNumber = useCallback(
    async (dest: string | any[] | null): Promise<number | null> => {
      const pdf = pdfRef.current;
      if (!pdf || dest == null) return null;

      const explicitDest =
        typeof dest === 'string' ? await pdf.getDestination(dest) : dest;
      if (!explicitDest) return null;

      const pageIndex = await pdf.getPageIndex(explicitDest[0]);
      return pageIndex + 1;
    }, []);

  const flattenOutline = useCallback(
    async (nodes: OutlineNode[] | null, depth = 0): Promise<Link[]> => {
      if (!nodes) return [];

      const result: Link[] = [];
      for (const node of nodes) {
        const pageNum = await resolveDestToPageNumber(node.dest);
        const href = pageNum != null ? `${PDF_PUBLICATION_HREF}#page=${pageNum}` : '';

        const children = node.items?.length
          ? await flattenOutline(node.items, depth + 1)
          : undefined;

        result.push({
          href,
          title: node.title,
          children,
        });
      }
      return result;
    }, [resolveDestToPageNumber]);

  /**
   * Puts page `n` at the top of the strip.
   *
   * Shared by the flip controls and by locator navigation - previously only the
   * latter scrolled, so the controls moved the reported position and left the
   * reader looking at the same page.
   */
  const scrollToPage = useCallback((n: number) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const target = wrapper.querySelector<HTMLElement>(`[data-page-number="${n}"]`);
    if (!target) return;

    isNavigatingRef.current = true;
    wrapper.scrollTop = target.offsetTop - wrapper.offsetTop;
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, NAVIGATION_SETTLE_MS);
  }, []);

  const restyleInPlace = useCallback((restyle: () => void) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const page = wrapper.querySelector<HTMLElement>(
      `[data-page-number="${pageNumberRef.current}"]`
    );
    if (!page) {
      restyle();
      return;
    }

    const topOf = () => page.offsetTop - wrapper.offsetTop;
    const height = page.offsetHeight;
    const fraction = height > 0 ? (wrapper.scrollTop - topOf()) / height : 0;

    restyle();

    // Reading the geometry back forces the reflow the writes above queued, so
    // the new offsets are already settled here.
    wrapper.scrollTop = topOf() + fraction * page.offsetHeight;
  }, []);

  const goToPage = useCallback(
    (num: number) => {
      const clamped = Math.min(Math.max(num, 1), pageCount || num);
      setPageNumber(clamped);
      scrollToPage(clamped);
    },
    [pageCount, scrollToPage]
  );

  const goForward = useCallback(() => goToPage(pageNumber + 1), [goToPage, pageNumber]);
  const goBackward = useCallback(() => goToPage(pageNumber - 1), [goToPage, pageNumber]);

  const goToLocator = useCallback(
    (locator: Locator) => {
      const positionFromHref = locator.href?.match(/page=(\d+)/)?.[1];
      const target =
        (locator.locations as any)?.position ??
        (positionFromHref ? parseInt(positionFromHref, 10) : null);

      if (target != null) goToPage(target);
    },
    [goToPage]
  );

  // ── Build the strip ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isPdf || !container || !url || typeof window === 'undefined') return;

    let cancelled = false;
    let observer: IntersectionObserver | null = null;
    /** Render tasks keyed by page number, so each can be cancelled independently. */
    const renderTasks = new Map<number, ReturnType<PDFPageProxy['render']>>();
    /** Pages already painted, so scrolling back does not repaint them. */
    const painted = new Set<number>();
    const sizes = sizesRef.current;
    sizes.clear();

    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const loadingTask = pdfjsLib.getDocument({ url: url });
        loadingTaskRef.current = loadingTask;

        const pdf = await loadingTask.promise;
        if (cancelled) return;

        pdfRef.current = pdf;
        setPageCount(pdf.numPages);

        const outline = await pdf.getOutline().catch(() => null);
        if (cancelled) return;

        const tableOfContents = outline ? await flattenOutline(outline) : [];
        if (cancelled) return;

        onPublicationReady?.({
          tableOfContents,
          positions: [],
          metadata: { title: '' },
        });

        const scrollWrapper = document.createElement('div');
        scrollWrapper.setAttribute('data-pdf-viewport', 'scroll');
        scrollWrapper.style.width = '100%';
        scrollWrapper.style.height = '100%';
        scrollWrapper.style.overflowY = 'auto';
        scrollWrapper.style.display = 'flex';
        scrollWrapper.style.flexDirection = 'column';
        scrollWrapper.style.alignItems = 'center';
        scrollWrapper.style.gap = `${PAGE_GAP_PX}px`;
        scrollWrapper.style.padding = `${PAGE_GAP_PX}px 0`;
        // Keyboard scrolling comes free once the strip can hold focus.
        scrollWrapper.tabIndex = 0;
        scrollWrapper.style.outline = 'none';
        container.innerHTML = '';
        container.appendChild(scrollWrapper);
        wrapperRef.current = scrollWrapper;

        /** CSS width a page is drawn at, i.e. the strip stretched by the zoom. */
        const cssWidthFor = () => scrollWrapper.clientWidth * zoomRef.current;

        /**
         * Paints a single page into its placeholder canvas.
         *
         * Pages are rendered on demand rather than up front: rasterising a whole
         * document blocks the reader for as long as it takes, and holds a canvas
         * per page in memory at full scale.
         */
        const renderPage = async (pageNumber: number) => {
          if (cancelled || painted.has(pageNumber)) return;

          const canvas = scrollWrapper.querySelector<HTMLCanvasElement>(
            `canvas[data-page-canvas="${pageNumber}"]`
          );
          const context = canvas?.getContext('2d');
          const natural = sizes.get(pageNumber);
          if (!canvas || !context || !natural) return;

          // Claim the page before the first await so concurrent intersection
          // callbacks cannot start a second render for it.
          painted.add(pageNumber);

          try {
            const page = await pdf.getPage(pageNumber);
            if (cancelled) return;

            const scale = rasterScaleFor(natural, cssWidthFor());
            const viewport = page.getViewport({ scale });
            canvas.width = Math.max(1, Math.floor(viewport.width));
            canvas.height = Math.max(1, Math.floor(viewport.height));

            const task = page.render({ canvasContext: context, viewport, canvas });
            renderTasks.set(pageNumber, task);
            await task.promise;
          } catch (err: any) {
            // A cancelled render is expected when the page scrolls out or the
            // hook tears down; anything else means this page has no content, so
            // let it be retried.
            if (err?.name !== 'RenderingCancelledException') {
              painted.delete(pageNumber);
            }
          } finally {
            renderTasks.delete(pageNumber);
          }
        };

        /**
         * Hands a page's backing store back.
         *
         * The container keeps its `aspect-ratio`, so the strip's height and the
         * reader's scroll position are unaffected and the page repaints when it
         * comes back into view. Without this every page ever scrolled past stays
         * rasterised for as long as the document is open.
         */
        const evictPage = (pageNumber: number) => {
          if (!painted.has(pageNumber)) return;

          renderTasks.get(pageNumber)?.cancel();
          const canvas = scrollWrapper.querySelector<HTMLCanvasElement>(
            `canvas[data-page-canvas="${pageNumber}"]`
          );
          if (!canvas) return;

          canvas.width = 0;
          canvas.height = 0;
          painted.delete(pageNumber);
        };

        const visible = new Set<number>();

        const span = (margin: number): [number, number] => {
          if (!visible.size) {
            const centre = pageNumberRef.current;
            return [centre - margin, centre + margin];
          }

          let lowest = Infinity;
          let highest = -Infinity;
          visible.forEach((p) => {
            if (p < lowest) lowest = p;
            if (p > highest) highest = p;
          });
          return [lowest - margin, highest + margin];
        };

        const renderVisible = () => {
          const [lowest, highest] = span(RENDER_AHEAD);
          for (let p = lowest; p <= highest; p++) {
            if (p >= 1 && p <= pdf.numPages) void renderPage(p);
          }
        };

        const evictOffscreen = () => {
          const [lowest, highest] = span(EVICT_AFTER_PAGES);
          painted.forEach((p) => {
            if (p < lowest || p > highest) evictPage(p);
          });
        };

        // Measured in parallel: `getPage` is a round trip to the worker, and
        // doing them one after another delays the strip by the whole document.
        for (let start = 1; start <= pdf.numPages; start += VIEWPORT_CONCURRENCY) {
          if (cancelled) return;

          const batch: Promise<void>[] = [];
          for (
            let n = start;
            n < start + VIEWPORT_CONCURRENCY && n <= pdf.numPages;
            n++
          ) {
            const pageNumber = n;
            batch.push(
              pdf.getPage(pageNumber).then((page) => {
                const { width, height } = page.getViewport({ scale: 1 });
                sizes.set(pageNumber, { width, height });
              })
            );
          }
          await Promise.all(batch);
        }
        if (cancelled) return;

        // Placeholders carry each page's own aspect ratio, so the strip is the
        // right height before anything is painted - otherwise laying pages out
        // as they render makes the scrollbar jump under the reader - and a
        // document whose pages differ in size needs no special handling.
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          const natural = sizes.get(pageNumber);
          if (!natural) continue;

          const pageContainer = document.createElement('div');
          pageContainer.setAttribute('data-page-number', pageNumber.toString());
          pageContainer.style.width = `${zoomRef.current * 100}%`;
          pageContainer.style.flexShrink = '0';
          pageContainer.style.aspectRatio = `${natural.width} / ${natural.height}`;

          const pageCanvas = document.createElement('canvas');
          pageCanvas.setAttribute('data-page-canvas', pageNumber.toString());
          // The canvas fills its container rather than being clamped by it, so
          // a page narrower than the reader is stretched up to the full width
          // instead of sitting in the middle of it.
          pageCanvas.style.width = '100%';
          pageCanvas.style.height = '100%';
          pageCanvas.style.display = 'block';
          // A canvas defaults to a 300x150 buffer whether or not anything has
          // been drawn into it. Starting at zero means an unpainted page costs
          // nothing, and makes "has a backing store" the same test as "has been
          // painted" - which is what eviction restores it to.
          pageCanvas.width = 0;
          pageCanvas.height = 0;

          pageContainer.appendChild(pageCanvas);
          scrollWrapper.appendChild(pageContainer);

          // The reader is usable as soon as the first page is on screen; the
          // rest stream in as they are scrolled to.
          if (pageNumber === 1) {
            await renderPage(1);
            if (cancelled) return;
            setIsReady(true);
          }
        }

        if (cancelled) return;

        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              const pageStr = entry.target.getAttribute('data-page-number');
              if (!pageStr) return;
              const page = parseInt(pageStr, 10);

              if (entry.isIntersecting) visible.add(page);
              else visible.delete(page);

              // Position reporting is suppressed while goToLocator is scrolling,
              // otherwise the pages passed on the way would each be reported.
              if (
                entry.isIntersecting &&
                !isNavigatingRef.current &&
                entry.intersectionRatio >= 0.5
              ) {
                setPageNumber(page);
              }
            });

            renderVisible();
            evictOffscreen();
          },
          {
            root: scrollWrapper,
            // Start work before a page is actually visible.
            rootMargin: `${RENDER_MARGIN_PX}px 0px`,
            threshold: [0, 0.5],
          }
        );

        scrollWrapper
          .querySelectorAll('[data-page-number]')
          .forEach((card) => observer?.observe(card));

        // Committing a zoom does not rebuild the strip - it only restyles the
        // containers - so the pages around the reader are re-rasterised here at
        // whatever scale they are now being shown at.
        repaintRef.current = () => {
          painted.forEach((p) => evictPage(p));
          renderVisible();
        };

        setIsReady(true);
      } catch (error) {
        if (!cancelled) {
          setIsReady(false);
          onError(error);
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTasks.forEach((task) => task.cancel());
      renderTasks.clear();
      observer?.disconnect();
      observer = null;
      repaintRef.current = null;
      wrapperRef.current = null;
      sizes.clear();
      loadingTaskRef.current?.destroy().catch(() => {});
      loadingTaskRef.current = null;
      pdfRef.current = null;
      setIsReady(false);
    };
  }, [isPdf, container, url]);

  // ── Initial location ───────────────────────────────────────────────────────

  const appliedInitialLocationFor = useRef<string | null>(null);
  const initialLocation = file?.initialLocation;

  // Applied once the strip exists to be scrolled. Without this a PDF always
  // reopened at page 1, however far through it the reader had been.
  useEffect(() => {
    if (!isPdf || !isReady || !url) return;
    if (appliedInitialLocationFor.current === url) return;

    appliedInitialLocationFor.current = url;
    if (initialLocation) goToLocator(initialLocation);
    else if (initialPage > 1) goToPage(initialPage);
  }, [isPdf, isReady, url, initialLocation, initialPage, goToLocator, goToPage]);

  useEffect(() => {
    appliedInitialLocationFor.current = null;
  }, [url]);

  // ── Location reporting ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!isPdf || !isReady) return;
    onLocationChange?.({
      href: PDF_PUBLICATION_HREF,
      type: 'application/pdf',
      title: '',
      locations: { position: pageNumber, totalProgression: pageCount ? (pageNumber - 1) / pageCount : 0 },
    });
  }, [isPdf, pageNumber, pageCount, isReady]);

  // ── Zoom ───────────────────────────────────────────────────────────────────

  const setZoom = useCallback((scale: number) => {
    setZoomState((current) => {
      const next = clampZoom(scale);
      return Math.abs(next - current) < 0.001 ? current : next;
    });
  }, []);

  const zoomIn = useCallback(() => setZoom(zoomRef.current * ZOOM_STEP), [setZoom]);
  const zoomOut = useCallback(() => setZoom(zoomRef.current / ZOOM_STEP), [setZoom]);
  const resetZoom = useCallback(() => setZoom(1), [setZoom]);

  /**
   * Sizes the current page to the reader's width, which is what a scale of 1
   * means, and puts it back at the top of the view.
   */
  const fitWidth = useCallback(() => {
    setZoom(1);
    scrollToPage(pageNumberRef.current);
  }, [setZoom, scrollToPage]);

  /**
   * Sizes the current page so the whole of it is on screen at once.
   *
   * Only this hook can work this out: the scale depends on the page's own
   * proportions and on how much room the strip has, neither of which a caller
   * can see. A page is `stripWidth * zoom` across and, keeping its aspect,
   * `stripWidth * zoom * height / width` down, so fitting the viewport height
   * is that solved for `zoom`.
   *
   * Pages in one document can differ in size, so this fits the page the reader
   * is on rather than assuming the first one speaks for the rest.
   */
  const fitHeight = useCallback(() => {
    const wrapper = wrapperRef.current;
    const natural = sizesRef.current.get(pageNumberRef.current);
    if (!wrapper || !natural || !natural.height) return;

    const available = wrapper.clientHeight - PAGE_GAP_PX * 2;
    const stripWidth = wrapper.clientWidth;
    if (available <= 0 || stripWidth <= 0) return;

    setZoom((available * natural.width) / (stripWidth * natural.height));
    scrollToPage(pageNumberRef.current);
  }, [setZoom, scrollToPage]);

  // Applying a zoom is a restyle, not a rebuild: the containers carry the
  // geometry and the canvases fill them, so the pages resize immediately and
  // only their resolution has to catch up.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!isPdf || !isReady || !wrapper) return;

    restyleInPlace(() => {
      wrapper.style.overflowX = zoom > 1 ? 'auto' : 'hidden';
      wrapper
        .querySelectorAll<HTMLElement>('[data-page-number]')
        .forEach((page) => {
          page.style.width = `${zoom * 100}%`;
        });
    });

    repaintRef.current?.();
  }, [isPdf, isReady, zoom, restyleInPlace]);

  useEffect(() => {
    if (!isPdf || !isReady) return;
    onZoomChange?.({ scale: zoom, min: MIN_ZOOM, max: MAX_ZOOM });
  }, [isPdf, isReady, zoom]);

  // A new publication opens fitted; a previous book's magnification would mean
  // nothing here, since it is relative to the page.
  useEffect(() => {
    setZoomState(1);
  }, [url]);

  // ── Zoom gestures ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isPdf || !isReady || !container || typeof window === 'undefined') return;

    /**
     * Shows a zoom before the pages have been re-rasterised for it.
     *
     * Only the container widths move, which is cheap; the pixels are the ones
     * drawn for the committed zoom, so they soften while the gesture stretches
     * them and sharpen again when it commits.
     */
    let preview: number | null = null;
    let wheelTimer: ReturnType<typeof setTimeout> | null = null;

    const showPreview = (scale: number) => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      preview = clampZoom(scale);
      // Anchored the same way as a committed zoom, so the page does not slide
      // out from under the fingers over the course of a pinch.
      restyleInPlace(() => {
        wrapper
          .querySelectorAll<HTMLElement>('[data-page-number]')
          .forEach((page) => {
            page.style.width = `${preview! * 100}%`;
          });
      });
    };

    const commit = () => {
      const pending = preview;
      preview = null;
      if (pending == null) return;

      // A gesture that lands back where it started should not pay for a repaint.
      if (Math.abs(pending - zoomRef.current) < 0.01) return;
      setZoom(pending);
    };

    // ctrl/cmd + wheel is how a trackpad pinch arrives on the desktop.
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;

      // Without this the browser zooms the whole document instead.
      event.preventDefault();

      // Exponential, so a given amount of finger travel changes the zoom by the
      // same proportion wherever it starts from, and zooming out retraces
      // zooming in exactly.
      showPreview((preview ?? zoomRef.current) * Math.exp(-event.deltaY * 0.01));

      // Wheel events have no end, so the gesture is over once they stop.
      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(commit, WHEEL_SETTLE_MS);
    };

    const distance = (a: Touch, b: Touch) =>
      Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

    let pinchStartDistance: number | null = null;
    let pinchStartZoom = 1;
    let pinching = false;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      pinchStartDistance = distance(event.touches[0]!, event.touches[1]!);
      pinchStartZoom = preview ?? zoomRef.current;
      pinching = false;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || pinchStartDistance == null) return;

      const current = distance(event.touches[0]!, event.touches[1]!);
      if (!pinching) {
        if (Math.abs(current - pinchStartDistance) < PINCH_THRESHOLD_PX) return;
        pinching = true;
      }

      // Non-passive listener: this is what stops the browser scrolling the strip
      // or zooming the page out from under the gesture.
      event.preventDefault();
      showPreview(pinchStartZoom * (current / pinchStartDistance));
    };

    const endPinch = () => {
      if (pinchStartDistance == null) return;
      pinchStartDistance = null;
      if (!pinching) return;
      pinching = false;
      commit();
    };

    /** Fitted pages magnify; magnified pages go back to fitted. */
    const toggle = () => {
      preview = zoomRef.current > 1 ? 1 : DOUBLE_TAP_ZOOM;
      commit();
    };

    const onDoubleClick = (event: MouseEvent) => {
      event.preventDefault();
      toggle();
    };

    let lastTap: { x: number; y: number; at: number } | null = null;

    const onTouchEnd = (event: TouchEvent) => {
      const wasPinching = pinching;
      endPinch();

      // Only a clean single-finger tap can pair into a double tap; a finger
      // coming off a pinch is not one.
      if (wasPinching) return;
      if (event.changedTouches.length !== 1 || event.touches.length > 0) return;

      const touch = event.changedTouches[0]!;
      const now = Date.now();
      const previous = lastTap;
      lastTap = { x: touch.clientX, y: touch.clientY, at: now };

      if (
        previous &&
        now - previous.at < DOUBLE_TAP_MS &&
        Math.hypot(touch.clientX - previous.x, touch.clientY - previous.y) <
          DOUBLE_TAP_SLOP_PX
      ) {
        lastTap = null;
        toggle();
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);
    container.addEventListener('touchcancel', endPinch);
    container.addEventListener('dblclick', onDoubleClick);

    return () => {
      if (wheelTimer) clearTimeout(wheelTimer);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', endPinch);
      container.removeEventListener('dblclick', onDoubleClick);
    };
  }, [isPdf, isReady, container, setZoom, restyleInPlace]);

  if (!isPdf) return undefined;

  return {
    pageNumber,
    pageCount,
    goForward,
    goBackward,
    goToLocator,
    isReady,
    zoom,
    zoomIn,
    zoomOut,
    setZoom,
    resetZoom,
    fitWidth,
    fitHeight,
  };
};
