import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
} from 'pdfjs-dist';
import type { Link, Locator, PublicationReadyEvent, ReadiumFile } from '../../src/interfaces';

interface UsePdfNavigatorProps {
  file: ReadiumFile;
  container: HTMLElement | null;
  onLocationChange?: (locator: Locator) => void;
  onPublicationReady?: (event: PublicationReadyEvent) => void;
  initialPage?: number;
  onError?: (error: any) => void;
}

/** Rasterisation scale for page canvases. */
const RENDER_SCALE = 1.5;
/** Pages painted either side of the visible one. */
const RENDER_AHEAD = 1;
/** Viewport margin at which a page starts rendering, in px. */
const RENDER_MARGIN_PX = 600;

interface OutlineNode {
  title: string;
  dest: string | any[] | null;
  items?: OutlineNode[];
}

export const usePdfNavigator = ({
  file,
  container,
  onLocationChange,
  onPublicationReady,
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
  const isNavigatingRef = useRef<boolean>(false);

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
        const href = pageNum != null ? `#page=${pageNum}` : '';

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

  useEffect(() => {
    if (!isPdf || !container || !url || typeof window === 'undefined') return;

    let cancelled = false;
    let observer: IntersectionObserver | null = null;
    /** Render tasks keyed by page number, so each can be cancelled independently. */
    const renderTasks = new Map<number, ReturnType<PDFPageProxy['render']>>();
    /** Pages already painted, so scrolling back does not repaint them. */
    const painted = new Set<number>();

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
        scrollWrapper.style.width = '100%';
        scrollWrapper.style.height = '100%';
        scrollWrapper.style.overflowY = 'auto';
        scrollWrapper.style.display = 'flex';
        scrollWrapper.style.flexDirection = 'column';
        scrollWrapper.style.gap = '20px';
        scrollWrapper.style.padding = '20px 0';
        container.innerHTML = '';
        container.appendChild(scrollWrapper);

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
          if (!canvas || !context) return;

          // Claim the page before the first await so concurrent intersection
          // callbacks cannot start a second render for it.
          painted.add(pageNumber);

          try {
            const page = await pdf.getPage(pageNumber);
            if (cancelled) return;

            const viewport = page.getViewport({ scale: RENDER_SCALE });
            canvas.width = viewport.width;
            canvas.height = viewport.height;

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

        // Placeholders are sized from each page's own viewport so the scroll
        // height is correct from the start - without that, laying pages out as
        // they render would make the scrollbar jump under the user.
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          if (cancelled) return;

          const page = await pdf.getPage(pageNumber);
          if (cancelled) return;
          const viewport = page.getViewport({ scale: RENDER_SCALE });

          const pageContainer = document.createElement('div');
          pageContainer.setAttribute('data-page-number', pageNumber.toString());
          pageContainer.style.width = '100%';
          pageContainer.style.display = 'flex';
          pageContainer.style.justifyContent = 'center';

          const pageCanvas = document.createElement('canvas');
          pageCanvas.setAttribute('data-page-canvas', pageNumber.toString());
          pageCanvas.width = viewport.width;
          pageCanvas.height = viewport.height;
          pageCanvas.style.maxWidth = '100%';
          pageCanvas.style.height = 'auto';

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

              if (!entry.isIntersecting) return;

              // Paint the page and its neighbours so scrolling does not reveal
              // blank canvases at the edges.
              for (let p = page - RENDER_AHEAD; p <= page + RENDER_AHEAD; p++) {
                if (p >= 1 && p <= pdf.numPages) void renderPage(p);
              }

              // Position reporting is suppressed while goToLocator is scrolling,
              // otherwise the pages passed on the way would each be reported.
              if (!isNavigatingRef.current && entry.intersectionRatio >= 0.5) {
                setPageNumber(page);
              }
            });
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
      loadingTaskRef.current?.destroy().catch(() => {});
      loadingTaskRef.current = null;
      pdfRef.current = null;
      setIsReady(false);
    };
  }, [isPdf, container, url]);

  useEffect(() => {
    if (!isPdf || !isReady) return;
    onLocationChange?.({
      href: `#page=${pageNumber}`,
      type: 'application/pdf',
      title: '',
      locations: { position: pageNumber, totalProgression: pageCount ? (pageNumber - 1) / pageCount : 0 },
    } as Locator);
  }, [isPdf, pageNumber, isReady]);

  const goToPage = useCallback((num: number) => {
      setPageNumber((curr) => {
        const clamped = Math.min(Math.max(num, 1), pageCount || num);
        return clamped === curr ? curr : clamped;
      });
    }, [pageCount]);

  const goForward = useCallback(() => goToPage(pageNumber + 1), [goToPage, pageNumber]);

  const goBackward = useCallback(() => goToPage(pageNumber - 1), [goToPage, pageNumber]);

  const goToLocator = useCallback((locator: Locator) => {
      const positionFromHref = locator.href?.match(/page=(\d+)/)?.[1];
      const target =
        (locator.locations as any)?.position ??
        (positionFromHref ? parseInt(positionFromHref, 10) : null);

      if (target != null) {
        isNavigatingRef.current = true;
        goToPage(target);

        if (typeof window !== 'undefined' && container) {
          const targetPageElement = container.querySelector(`[data-page-number="${target}"]`) as HTMLElement;

          const scrollWrapper = container.firstElementChild as HTMLElement;

          if (targetPageElement && scrollWrapper) {
            scrollWrapper.scrollTop = targetPageElement.offsetTop - scrollWrapper.offsetTop;
            setTimeout(() => {
              isNavigatingRef.current = false;
            }, 100);
          } else {
            isNavigatingRef.current = false;
          }
        } else {
          isNavigatingRef.current = false;
        }
      }
    }, [goToPage, container]);

  if (!isPdf) return undefined;

  return { pageNumber, pageCount, goForward, goBackward, goToLocator, isReady };
};
