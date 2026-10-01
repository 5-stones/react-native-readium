import type {
  Locator,
  Preferences,
} from '../../src/interfaces';

export class PdfNavigator {
  readonly type = 'pdf' as const;
  pageNumber: number;
  pageCount: number;
  isReady: boolean;
  zoom: number;

  goForward: () => void;
  goBackward: () => void;
  goToLocator: (locator: Locator) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setZoom: (scale: number) => void;
  resetZoom: () => void;
  submitPreferences: (preferences: Preferences) => void;

  constructor(init: Omit<PdfNavigator, 'type'>) {
    this.pageNumber = init.pageNumber;
    this.pageCount = init.pageCount;
    this.isReady = init.isReady;
    this.zoom = init.zoom;
    this.goForward = init.goForward;
    this.goBackward = init.goBackward;
    this.goToLocator = init.goToLocator;
    this.zoomIn = init.zoomIn;
    this.zoomOut = init.zoomOut;
    this.setZoom = init.setZoom;
    this.resetZoom = init.resetZoom;
    this.submitPreferences = init.submitPreferences;
  }
}
