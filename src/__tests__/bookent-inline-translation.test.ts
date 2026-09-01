import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.join(__dirname, '../../ios/Reader/EPUB/EPUBViewController.swift'),
  'utf8'
);

const commonReaderSource = fs.readFileSync(
  path.join(__dirname, '../../ios/Reader/Common/ReaderViewController.swift'),
  'utf8'
);

describe('Bookent inline translation integration', () => {
  it('uses a cancellable 500ms long press without creating a WebKit selection', () => {
    expect(source).toContain('const HOLD_MS = 500');
    expect(source).toContain('const MAX_MOVE = 10');
    expect(source).toContain('caretRangeFromPoint');
    expect(source).toContain('Intl.Segmenter');
    expect(source).toContain('navigator.clearSelection()');
    expect(source).not.toContain('getSelection().addRange');
  });

  it('recognizes hyphenated compounds and blocks links and controls', () => {
    expect(source).toContain('const compoundPattern');
    expect(source).toContain('\\\\u2010\\\\u2011');
    expect(source).toContain(
      'ruby, rt, a, button, input, textarea, select'
    );
  });

  it('anchors translations to an exact-width local wrapper without increasing line height', () => {
    expect(source).toContain("document.createElement('span')");
    expect(source).toContain("base.className = 'bookent-word-base'");
    expect(source).toContain("translation.className = 'bookent-translation-text'");
    expect(source).toContain('selectedText.replaceWith(wrapper)');
    expect(source).toContain('display: inline-block !important');
    expect(source).toContain('vertical-align: baseline !important');
    expect(source).toContain('line-height: 1.05 !important');
    expect(source).toContain('position: relative !important');
    expect(source).toContain('position: absolute !important');
    expect(source).toContain('top: calc(100% + 0.08em) !important');
    expect(source).toContain('left: 50% !important');
    expect(source).toContain('transform: translateX(-50%) !important');
    expect(source).toContain(
      'font-size: max(10px, calc(1rem * var(--bookent-translation-scale))) !important'
    );
    expect(source).not.toContain("const LAYER_ID = 'bookent-translation-layer'");
    expect(source).not.toContain('position: fixed !important');
    expect(source).not.toContain('getClientRects()');
  });

  it('uses the Bookent native translation and presentation channels', () => {
    expect(source).toContain('BookentTranslationRequest');
    expect(source).toContain('BookentTranslationResult');
    expect(source).toContain('BookentTranslationPresentationRequest');
    expect(source).toContain('BookentTranslationAppearanceChanged');
    expect(source).not.toMatch(/Wordin|wordin/);
  });

  it('isolates inline translation geometry from publisher span styles', () => {
    expect(source).toContain('box-sizing: content-box !important');
    expect(source).toContain('width: auto !important');
    expect(source).toContain('margin: 0 !important');
    expect(source).toContain('padding: 0 !important');
    expect(source).toContain('font: inherit !important');
  });

  it('resolves adjacent translation collisions without a full-page layer', () => {
    expect(source).toContain(
      'window.__bookentRelayoutTranslations = scheduleTranslationLayout'
    );
    expect(source).toContain('function resolveTranslationCollisions()');
    expect(source).toContain('bookent-translation-lane-2');
    expect(source).not.toContain('bookent-translation-compact');
    expect(source).toContain('getBoundingClientRect()');
    expect(source).not.toContain('new ResizeObserver');
    expect(source).not.toContain('new MutationObserver');
    expect(source).not.toContain('scheduleAnnotationPositions');
  });

  it('consumes translated-word taps before page navigation', () => {
    expect(source).toContain("action: 'consumeTap'");
    expect(source).toContain('suppressNextNavigatorTap()');
    expect(commonReaderSource).toContain('suppressNavigatorTapUntil');
    expect(commonReaderSource).toContain(
      'Date() < self.suppressNavigatorTapUntil'
    );
  });
});
