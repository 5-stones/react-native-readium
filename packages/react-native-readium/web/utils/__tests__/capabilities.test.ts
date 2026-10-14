// Not resolvable from this package, and nothing here reaches it: the abilities
// below are stated, not computed from a navigator.
jest.mock('@readium/navigator', () => ({ EpubPreferencesEditor: class {} }), {
  virtual: true,
});

import { pdfCapabilities, WEB_ABILITIES } from '../capabilities';

/**
 * What the web reader claims it can do.
 *
 * Consumers are told to branch on `capabilities` rather than on the platform,
 * so each of these is a promise: claiming one the web view does not implement
 * has them build UI that nothing ever drives.
 */
describe('web capabilities', () => {
  it('claims no search, and no text selection, for EPUB', () => {
    // `onSelectionChange`, `onSelectionAction` and `selectionActions` are not
    // wired on web; `navigatorListeners.textSelected` is a no-op.
    expect(WEB_ABILITIES.epub).toMatchObject({
      search: false,
      selection: false,
    });
  });

  it('claims decorations for EPUB, which useDecorationsObserver implements', () => {
    expect(WEB_ABILITIES.epub.decorations).toBe(true);
  });

  it('claims zoom for PDF only', () => {
    expect(WEB_ABILITIES.epub.zoom).toBe(false);
    expect(WEB_ABILITIES.pdf.zoom).toBe(true);
  });

  it('reports the PDF abilities through pdfCapabilities', () => {
    expect(pdfCapabilities()).toMatchObject(WEB_ABILITIES.pdf);
  });
});
