import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import type { Link, Locator, PublicationReadyEvent } from '../../src/interfaces';

interface UsePdfNavigatorProps {
  url: string;
  container: HTMLElement | null;
  onLocationChange?: (locator: Locator) => void;
  onPublicationReady?: (event: PublicationReadyEvent) => void;
  initialPage?: number;
  onError?: (error: any) => void;
}

interface OutlineNode {
  title: string;
  dest: string | any[] | null;
  items?: OutlineNode[];
}

export const usePdfNavigator = ({
  url,
  container,
  onLocationChange,
  onPublicationReady,
  initialPage = 1,
  onError = () => {},
}: UsePdfNavigatorProps) => {
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [pageCount, setPageCount] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const renderTaskRef = useRef<ReturnType<PDFPageProxy['render']> | null>(null);
  const isNavigatingRef = useRef<boolean>(false);

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

  const renderPage = useCallback(async (num: number) => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas) return;

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }

    const page = await pdf.getPage(num);
    const viewport = page.getViewport({ scale: 1.5 });
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const task = page.render({ canvasContext: context, viewport, canvas });
    renderTaskRef.current = task;
    try {
      await task.promise;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') throw err;
    }
  }, []);

  useEffect(() => {
    if (!container || typeof window === 'undefined') return;
    let cancelled = false;

    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const pdf = await pdfjsLib.getDocument({ url: url }).promise;
        if (cancelled) return;

        pdfRef.current = pdf;
        setPageCount(pdf.numPages);

        const outline = await pdf.getOutline().catch(() => null);
        const tableOfContents = outline ? await flattenOutline(outline) : [];
        
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
        
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          if (cancelled) return;

          const pageContainer = document.createElement('div');
          pageContainer.setAttribute('data-page-number', pageNumber.toString());
          pageContainer.style.width = '100%';
          pageContainer.style.display = 'flex';
          pageContainer.style.justifyContent = 'center';

          const pageCanvas = document.createElement('canvas');
          pageCanvas.style.maxWidth = '100%';
          pageCanvas.style.height = 'auto';
          pageCanvas.style.boxShadow = '0 4px 8px rgba(0,0,0,0)';

          pageContainer.appendChild(pageCanvas);
          scrollWrapper.appendChild(pageContainer);

          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.5 });
          const context = pageCanvas.getContext('2d');
          
          if (context) {
            pageCanvas.width = viewport.width;
            pageCanvas.height = viewport.height;
            
            await page.render({ 
              canvasContext: context, 
              viewport: viewport,
              canvas: pageCanvas
            }).promise;
          }
        }

        const observerOptions = {
          root: scrollWrapper,
          rootMargin: '0px',
          threshold: 0.5,
        };

        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (isNavigatingRef.current) return;
            // Only update the active page state if the target element crosses our focus point
            if (entry.isIntersecting) {
              const visiblePageStr = entry.target.getAttribute('data-page-number');
              if (visiblePageStr) {
                const visiblePageNum = parseInt(visiblePageStr, 10);
                setPageNumber(visiblePageNum);
              }
            }
          });
        }, observerOptions);

        const pageCards = scrollWrapper.querySelectorAll('[data-page-number]');
        pageCards.forEach((card) => observer?.observe(card));

        setIsReady(true);
      } catch (error) {
        setIsReady(false);
        onError(error);
      }
    })();

    return () => {
      cancelled = true;
      pdfRef.current?.cleanup();
      pdfRef.current = null;
      setIsReady(false);
    };
  }, [url, container]);

  useEffect(() => {
    if (!isReady) return;
    renderPage(pageNumber);
    onLocationChange?.({
      href: `#page=${pageNumber}`,
      type: 'application/pdf',
      title: '',
      locations: { position: pageNumber, totalProgression: pageCount ? (pageNumber - 1) / pageCount : 0 },
    } as Locator);
  }, [pageNumber, isReady]);

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

  return { pageNumber, pageCount, goForward, goBackward, goToLocator, isReady };
};
