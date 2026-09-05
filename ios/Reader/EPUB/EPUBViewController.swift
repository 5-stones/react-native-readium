import UIKit
import ReadiumShared
import ReadiumNavigator
import WebKit

struct SelectionActionData: Codable {
    let id: String
    let label: String
}

private final class WeakScriptMessageHandler: NSObject, WKScriptMessageHandler {
    weak var delegate: WKScriptMessageHandler?

    init(delegate: WKScriptMessageHandler) {
        self.delegate = delegate
    }

    func userContentController(
      _ userContentController: WKUserContentController,
      didReceive message: WKScriptMessage
    ) {
        delegate?.userContentController(userContentController, didReceive: message)
    }
}

protocol SelectionActionDelegate: AnyObject {
    func onSelectionAction(actionId: String, locator: ReadiumShared.Locator, selectedText: String)
}

class EPUBViewController: ReaderViewController, SelectionActionHandlerDelegate {
    private var selectionActionHandler: SelectionActionHandler?
    private var isInlineRubyEnabled = false
    private var translationResultObserver: NSObjectProtocol?
    private var translationAppearanceObserver: NSObjectProtocol?
    private var translationLayoutObserver: NSObjectProtocol?
    private var knownVocabularyObserver: NSObjectProtocol?
    private var translationMessageHandler: WeakScriptMessageHandler?
    private var translationWebViews: [String: WKWebView] = [:]
    private let inlineTranslationWebViews = NSHashTable<WKWebView>.weakObjects()
    weak var selectionActionDelegate: SelectionActionDelegate?

    init(
      publication: Publication,
      locator: ReadiumShared.Locator?,
      bookId: String,
      selectionActions: [SelectionActionData]? = nil
    ) throws {
      // Convert typed selection actions directly to EditingActions (no JSON)
      var editingActions: [EditingAction] = []
      var actionIds: [String] = []

      if let actions = selectionActions {
        isInlineRubyEnabled = actions.contains(where: { $0.id == "get-word" })
        for action in actions {
          actionIds.append(action.id)

          let selectorName = "handleSelectionAction_\(action.id):"
          let selector = NSSelectorFromString(selectorName)

          editingActions.append(EditingAction(
            title: action.label,
            action: selector
          ))
        }
      }

      // Only use custom actions - don't add default iOS actions
      // If no custom actions are provided, use defaults as fallback
      if editingActions.isEmpty {
        editingActions.append(contentsOf: EditingAction.defaultActions)
      }

      let navigator = try EPUBNavigatorViewController(
        publication: publication,
        initialLocation: locator,
        config: EPUBNavigatorViewController.Configuration(
          editingActions: editingActions
        )
      )

      super.init(
        navigator: navigator,
        publication: publication,
        bookId: bookId
      )

      // Set up the Objective-C handler for dynamic methods
      if !actionIds.isEmpty {
        let handler = SelectionActionHandler(actionIds: actionIds)
        handler.delegate = self
        selectionActionHandler = handler
      }

      navigator.delegate = self
    }

    var epubNavigator: EPUBNavigatorViewController {
      return navigator as! EPUBNavigatorViewController
    }

    func updateSelectionActions(_ selectionActions: [SelectionActionData]?) {
      // On iOS, selection actions must be set during navigator initialization
      // Dynamic updates would require recreating the navigator, which we don't support yet
      print("Warning: Updating selection actions after initialization is not supported on iOS")
    }

    override func viewDidLoad() {
      super.viewDidLoad()

      /// Set initial UI appearance.
      setUIColor(for: epubNavigator.settings.theme)
    }

    // Insert handler into the responder chain
    override var next: UIResponder? {
      if let handler = selectionActionHandler {
        // Set the handler's next responder to continue the chain
        handler.originalNextResponder = super.next
        return handler
      }
      return super.next
    }

    // SelectionActionHandlerDelegate implementation
    func handleSelectionAction(withId actionId: String) {
      guard let navigator = navigator as? EPUBNavigatorViewController else {
        return
      }

      guard let selection = navigator.currentSelection else {
        return
      }

      selectionActionDelegate?.onSelectionAction(
        actionId: actionId,
        locator: selection.locator,
        selectedText: selection.locator.text.highlight ?? ""
      )

      // Clear the selection
      navigator.clearSelection()
    }

    internal func setUIColor(for theme: Theme) {
      let colors = AssociatedColors.getColors(for: theme)

      navigator.view.backgroundColor = colors.mainColor
      view.backgroundColor = colors.mainColor
      //
      navigationController?.navigationBar.barTintColor = colors.mainColor
      navigationController?.navigationBar.tintColor = colors.textColor

      navigationController?.navigationBar.titleTextAttributes = [NSAttributedString.Key.foregroundColor: colors.textColor]
    }

    deinit {
      if let translationResultObserver {
        NotificationCenter.default.removeObserver(translationResultObserver)
      }
      if let translationAppearanceObserver {
        NotificationCenter.default.removeObserver(translationAppearanceObserver)
      }
      if let translationLayoutObserver {
        NotificationCenter.default.removeObserver(translationLayoutObserver)
      }
      if let knownVocabularyObserver {
        NotificationCenter.default.removeObserver(knownVocabularyObserver)
      }
    }

}

extension EPUBViewController: EPUBNavigatorDelegate {
  func navigator(
    _ navigator: SelectableNavigator,
    shouldShowMenuForSelection selection: Selection
  ) -> Bool {
    guard isInlineRubyEnabled else {
      return true
    }

    navigator.clearSelection()
    return false
  }

  func navigator(
    _ navigator: EPUBNavigatorViewController,
    setupUserScripts userContentController: WKUserContentController
  ) {
    guard isInlineRubyEnabled else {
      return
    }

    let messageHandler = WeakScriptMessageHandler(delegate: self)
    translationMessageHandler = messageHandler
    userContentController.add(messageHandler, name: "bookentTranslation")
    if translationResultObserver == nil {
      translationResultObserver = NotificationCenter.default.addObserver(
        forName: Notification.Name("BookentTranslationResult"),
        object: nil,
        queue: .main
      ) { [weak self] notification in
        guard
          let self,
          let id = notification.userInfo?["id"] as? String,
          let translation = notification.userInfo?["translation"] as? String,
          let sentenceTranslation =
            notification.userInfo?["sentenceTranslation"] as? String,
          let webView = self.translationWebViews.removeValue(forKey: id)
        else {
          return
        }

        let error = notification.userInfo?["error"] as? String ?? ""
        let values = [id, translation, sentenceTranslation, error]
        guard
          let data = try? JSONSerialization.data(withJSONObject: values),
          let arguments = String(data: data, encoding: .utf8)
        else {
          return
        }
        webView.evaluateJavaScript(
          "window.__bookentApplyTranslation?.(...\(arguments));"
        )
      }
    }

    if translationAppearanceObserver == nil {
      translationAppearanceObserver = NotificationCenter.default.addObserver(
        forName: Notification.Name("BookentTranslationAppearanceChanged"),
        object: nil,
        queue: .main
      ) { [weak self] notification in
        guard
          let self,
          let requestedScale = notification.userInfo?["fontScale"] as? Double
        else {
          return
        }
        let scale = min(0.92, max(0.6, requestedScale))
        let value = String(format: "%.3f", locale: Locale(identifier: "en_US_POSIX"), scale)
        for webView in self.inlineTranslationWebViews.allObjects {
          webView.evaluateJavaScript(
            "document.documentElement.style.setProperty('--bookent-translation-scale', '\(value)'); window.__bookentRelayoutTranslations?.();"
          )
        }
      }
    }

    if translationLayoutObserver == nil {
      translationLayoutObserver = NotificationCenter.default.addObserver(
        forName: Notification.Name("BookentTranslationLayoutChanged"),
        object: nil,
        queue: .main
      ) { [weak self] _ in
        guard let self else { return }
        for webView in self.inlineTranslationWebViews.allObjects {
          webView.evaluateJavaScript(
            "window.__bookentRelayoutTranslations?.();"
          )
        }
      }
    }

    if knownVocabularyObserver == nil {
      knownVocabularyObserver = NotificationCenter.default.addObserver(
        forName: Notification.Name("BookentKnownVocabularyTranslationsChanged"),
        object: nil,
        queue: .main
      ) { [weak self] notification in
        guard let self,
              let translations = notification.userInfo?["translations"] as? [[String: String]],
              let data = try? JSONSerialization.data(withJSONObject: translations),
              let json = String(data: data, encoding: .utf8) else {
          return
        }
        for webView in self.inlineTranslationWebViews.allObjects {
          webView.evaluateJavaScript(
            "window.__bookentApplyKnownTranslations?.(\(json));"
          )
        }
      }
    }

    let storedScale = UserDefaults.standard.object(
      forKey: "BookentInlineTranslationFontScale"
    ) as? Double ?? 0.85
    let initialScale = min(0.92, max(0.6, storedScale))
    let knownVocabularyData = UserDefaults.standard.data(
      forKey: "BookentKnownVocabularyTranslations"
    )
    let knownVocabulary = knownVocabularyData.flatMap {
      try? JSONSerialization.jsonObject(with: $0) as? [[String: String]]
    } ?? []
    let knownVocabularyJSON = (try? JSONSerialization.data(withJSONObject: knownVocabulary))
      .flatMap { String(data: $0, encoding: .utf8) } ?? "[]"

    let source = """
      (() => {
        if (window.__bookentRubyInstalled) return;
        window.__bookentRubyInstalled = true;

        const HOLD_MS = 500;
        const MAX_MOVE = 10;
        const TRANSLATION_FONT_SCALE = \(initialScale);
        const STYLE_ID = 'bookent-ruby-style';
        const PRESSING_CLASS = 'bookent-translation-pressing';
        const annotations = new Map();
        let holdTimer = null;
        let startPoint = null;
        let gestureConsumed = false;
        let activePointer = null;
        let suppressClickUntil = 0;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
          html.${PRESSING_CLASS}, html.${PRESSING_CLASS} * {
            -webkit-user-select: none !important;
            user-select: none !important;
          }
          span.bookent-inline-translation {
            display: inline-block !important;
            position: relative !important;
            box-sizing: content-box !important;
            width: auto !important;
            min-width: 0 !important;
            max-width: none !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            text-indent: 0 !important;
            vertical-align: baseline !important;
            line-height: 1.05 !important;
            text-decoration: none !important;
          }
          span.bookent-inline-translation > .bookent-word-base {
            display: inline-block !important;
            box-sizing: content-box !important;
            width: auto !important;
            min-width: 0 !important;
            max-width: none !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            text-indent: 0 !important;
            color: inherit !important;
            font: inherit !important;
            letter-spacing: inherit !important;
            word-spacing: inherit !important;
            line-height: 1.05 !important;
            border-bottom: 1px dashed currentColor !important;
          }
          span.bookent-inline-translation > .bookent-translation-text {
            position: absolute !important;
            box-sizing: content-box !important;
            width: max-content !important;
            min-width: 0 !important;
            max-width: none !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            text-indent: 0 !important;
            z-index: 1 !important;
            top: calc(100% + 0.08em) !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            color: inherit !important;
            opacity: 0.62;
            font-family: inherit !important;
            font-size: max(10px, calc(1rem * var(--bookent-translation-scale))) !important;
            font-weight: 400 !important;
            font-style: italic;
            letter-spacing: normal !important;
            word-spacing: normal !important;
            line-height: 1 !important;
            text-align: center !important;
            white-space: nowrap !important;
            border-bottom: 0 !important;
            text-decoration: none !important;
            -webkit-user-select: none;
            user-select: none;
            pointer-events: none !important;
          }
          span.bookent-inline-translation > .bookent-translation-text.bookent-translation-lane-2 {
            top: calc(100% + 1.08em) !important;
          }
        `;
        document.documentElement.appendChild(style);
        document.documentElement.style.setProperty(
          '--bookent-translation-scale',
          String(TRANSLATION_FONT_SCALE)
        );
        let collisionFrame = null;
        function translationsOverlap(left, right) {
          const sameLine = Math.abs(left.baseRect.top - right.baseRect.top) < 4;
          return sameLine && left.translationRect.right + 3 > right.translationRect.left;
        }

        function translationEntries() {
          return Array.from(annotations.values())
            .filter((annotation) => annotation.wrapper.isConnected)
            .map((annotation) => ({
              annotation,
              baseRect: annotation.base.getBoundingClientRect(),
              translationRect: annotation.translation.getBoundingClientRect(),
            }))
            .sort((left, right) =>
              left.baseRect.top - right.baseRect.top ||
              left.baseRect.left - right.baseRect.left
            );
        }

        function resolveTranslationCollisions() {
          collisionFrame = null;
          const initial = translationEntries();
          for (const entry of initial) {
            entry.annotation.translation.classList.remove(
              'bookent-translation-lane-2'
            );
          }

          // Keep a consistent body-relative font size. When adjacent labels
          // collide, move the later one onto a second local lane instead of
          // shrinking it. Rectangles are used only for this one-time
          // classification; no viewport coordinates are persisted.
          const entries = translationEntries();
          for (let index = 1; index < entries.length; index += 1) {
            if (translationsOverlap(entries[index - 1], entries[index])) {
              entries[index].annotation.translation.classList.add(
                'bookent-translation-lane-2'
              );
            }
          }
        }

        function scheduleTranslationLayout() {
          if (collisionFrame !== null) cancelAnimationFrame(collisionFrame);
          collisionFrame = requestAnimationFrame(resolveTranslationCollisions);
        }

        window.__bookentRelayoutTranslations = scheduleTranslationLayout;

        function clearHold() {
          if (holdTimer !== null) {
            clearTimeout(holdTimer);
            holdTimer = null;
          }
          startPoint = null;
          document.documentElement.classList.remove(PRESSING_CLASS);
        }

        function textRangeAtPoint(x, y) {
          let range = document.caretRangeFromPoint?.(x, y) ?? null;
          if (!range && document.caretPositionFromPoint) {
            const position = document.caretPositionFromPoint(x, y);
            if (position) {
              range = document.createRange();
              range.setStart(position.offsetNode, position.offset);
              range.collapse(true);
            }
          }
          return range;
        }

        function wordSegmentAt(text, rawOffset) {
          const offsets = [rawOffset, rawOffset - 1].filter(
            (offset) => offset >= 0 && offset < text.length
          );

          // Intl.Segmenter treats the parts of a hyphenated word as separate
          // segments, so detect compounds before falling back to locale rules.
          const compoundPattern =
            /[\\p{L}\\p{N}'’]+(?:[-\\u2010\\u2011][\\p{L}\\p{N}'’]+)+/gu;
          for (const match of text.matchAll(compoundPattern)) {
            const start = match.index;
            const end = start + match[0].length;
            if (offsets.some((offset) => offset >= start && offset < end)) {
              return { start, end, word: match[0] };
            }
          }

          if (typeof Intl.Segmenter === 'function') {
            const language =
              document.documentElement.lang || navigator.language || 'en';
            const segments = new Intl.Segmenter(language, {
              granularity: 'word',
            }).segment(text);

            for (const segment of segments) {
              const start = segment.index;
              const end = start + segment.segment.length;
              if (
                segment.isWordLike &&
                offsets.some((offset) => offset >= start && offset < end)
              ) {
                return { start, end, word: segment.segment };
              }
            }
          }

          const pattern = /[\\p{L}\\p{N}'’-]+/gu;
          for (const match of text.matchAll(pattern)) {
            const start = match.index;
            const end = start + match[0].length;
            if (offsets.some((offset) => offset >= start && offset < end)) {
              return { start, end, word: match[0] };
            }
          }
          return null;
        }

        window.__bookentApplyTranslation = (
          id,
          translatedText,
          translatedSentence,
          error
        ) => {
          const annotation = annotations.get(id);
          if (!annotation) return;
          const translation = annotation.translation;

          if (translatedText) {
            translation.textContent = translatedText;
            annotation.translatedText = translatedText;
            annotation.translatedSentence = translatedSentence || '';
            annotation.state = 'translated';
            annotation.error = '';
            applyTranslationToMatchingWords(annotation);
            scheduleTranslationLayout();
            return;
          }

          translation.textContent = '重试';
          annotation.state = 'failed';
          annotation.error = error || 'Translation unavailable';
          scheduleTranslationLayout();
        };

        function escapedPattern(value) {
          return value.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
        }

        function matchingTextNodes(word) {
          const matches = [];
          const pattern = new RegExp(
            `(?<![\\\\p{L}\\\\p{N}'’])${escapedPattern(word)}(?![\\\\p{L}\\\\p{N}'’])`,
            'giu'
          );
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode(candidate) {
                const parent = candidate.parentElement;
                if (
                  !candidate.data ||
                  !parent ||
                  parent.closest(
                    '.bookent-inline-translation, ruby, rt, script, style, noscript, a, button, input, textarea, select'
                  )
                ) {
                  return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
              },
            }
          );
          let node;
          while ((node = walker.nextNode())) {
            pattern.lastIndex = 0;
            const offsets = Array.from(node.data.matchAll(pattern)).map(
              (match) => ({
                start: match.index,
                length: match[0].length,
                context: sentenceContextForNode(
                  node,
                  match.index,
                  match.index + match[0].length
                ),
              })
            );
            if (offsets.length) matches.push({ node, offsets });
          }
          return matches;
        }

        function applyTranslationToMatchingWords(source) {
          for (const entry of matchingTextNodes(source.word)) {
            // Work backwards so earlier offsets remain valid as the text node is
            // split into inline wrappers.
            for (const match of [...entry.offsets].reverse()) {
              const selected = entry.node.splitText(match.start);
              selected.splitText(match.length);
              const id =
                globalThis.crypto?.randomUUID?.() ??
                `bookent-known-${Date.now()}-${Math.random().toString(16).slice(2)}`;
              const wrapper = document.createElement('span');
              wrapper.className = 'bookent-inline-translation';
              wrapper.dataset.bookentRequest = id;
              const base = document.createElement('span');
              base.className = 'bookent-word-base';
              base.textContent = selected.data;
              const translation = document.createElement('span');
              translation.className = 'bookent-translation-text';
              translation.textContent = source.translatedText;
              wrapper.append(base, translation);
              selected.replaceWith(wrapper);
              annotations.set(id, {
                ...source,
                id,
                wrapper,
                base,
                translation,
                word: base.textContent,
                sentence: match.context.sentence,
                wordStart: match.context.wordStart,
                wordLength: match.length,
                state: 'translated',
              });
            }
          }
        }

        window.__bookentApplyKnownTranslations = (translations) => {
          if (!Array.isArray(translations)) return;
          for (const item of translations) {
            if (!item?.word || !item?.translation) continue;
            applyTranslationToMatchingWords({
              word: item.word,
              translatedText: item.translation,
              translatedSentence: item.sentenceTranslation || '',
              sourceLanguage: item.sourceLanguage || 'en',
              targetLanguage: item.targetLanguage || 'zh-Hans',
              state: 'translated',
              error: '',
            });
          }
          scheduleTranslationLayout();
        };

        window.__bookentApplyKnownTranslations(\(knownVocabularyJSON));

        function sentenceContext(text, wordStart, wordEnd) {
          const isBoundary = (character) => /[.!?。！？\\n]/u.test(character);
          let start = wordStart;
          let end = wordEnd;
          while (start > 0 && !isBoundary(text[start - 1])) start -= 1;
          while (end < text.length && !isBoundary(text[end])) end += 1;
          if (end < text.length) end += 1;

          const rawSentence = text.slice(start, end);
          const leadingWhitespace = rawSentence.length - rawSentence.trimStart().length;
          return {
            sentence: rawSentence.trim(),
            wordStart: wordStart - start - leadingWhitespace,
          };
        }

        function sentenceContextForNode(node, wordStart, wordEnd) {
          const block = node.parentElement?.closest(
            'p, li, blockquote, dd, dt, figcaption, h1, h2, h3, h4, h5, h6, div'
          );
          if (!block) {
            return sentenceContext(node.data, wordStart, wordEnd);
          }

          const walker = document.createTreeWalker(
            block,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode(candidate) {
                const parent = candidate.parentElement;
                if (
                  !candidate.data ||
                  !parent ||
                  parent.closest(
                    '.bookent-translation-text, script, style, noscript, textarea'
                  )
                ) {
                  return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
              },
            }
          );
          const nodes = [];
          let current;
          while ((current = walker.nextNode())) nodes.push(current);

          let text = '';
          let selectedStart = -1;
          for (const candidate of nodes) {
            if (candidate === node) {
              selectedStart = text.length + wordStart;
            }
            text += candidate.data;
          }
          if (selectedStart < 0) {
            return sentenceContext(node.data, wordStart, wordEnd);
          }
          return sentenceContext(
            text,
            selectedStart,
            selectedStart + (wordEnd - wordStart)
          );
        }

        function sourceLanguageForNode(node) {
          const language =
            node.parentElement?.closest('[lang]')?.getAttribute('lang') ||
            document.documentElement.lang ||
            'en';
          return language.trim() || 'en';
        }

        function createInlineTranslation(x, y) {
          const caret = textRangeAtPoint(x, y);
          const node = caret?.startContainer;
          if (!(node instanceof Text) || !node.parentElement) return false;

          const blocked = node.parentElement.closest(
            '.bookent-inline-translation, ruby, rt, a, button, input, textarea, select'
          );
          if (blocked) return false;

          const segment = wordSegmentAt(node.data, caret.startOffset);
          if (!segment || !segment.word.trim()) return false;

          const requestId =
            globalThis.crypto?.randomUUID?.() ??
            `bookent-${Date.now()}-${Math.random().toString(16).slice(2)}`;

          const context = sentenceContextForNode(
            node,
            segment.start,
            segment.end
          );
          const selectedText = node.splitText(segment.start);
          selectedText.splitText(segment.word.length);

          const wrapper = document.createElement('span');
          wrapper.className = 'bookent-inline-translation';
          wrapper.dataset.bookentRequest = requestId;

          const base = document.createElement('span');
          base.className = 'bookent-word-base';
          base.textContent = segment.word;
          const translation = document.createElement('span');
          translation.className = 'bookent-translation-text';
          translation.textContent = '…';
          wrapper.append(base, translation);
          selectedText.replaceWith(wrapper);

          const annotation = {
            id: requestId,
            wrapper,
            base,
            translation,
            word: segment.word,
            sentence: context.sentence,
            wordStart: context.wordStart,
            wordLength: segment.word.length,
            sourceLanguage: sourceLanguageForNode(node),
            targetLanguage: 'zh-Hans',
            translatedText: '',
            translatedSentence: '',
            state: 'loading',
            error: '',
          };
          annotations.set(requestId, annotation);
          scheduleTranslationLayout();

          window.webkit?.messageHandlers?.bookentTranslation?.postMessage({
            id: requestId,
            word: segment.word,
            sentence: context.sentence,
            wordStart: context.wordStart,
            wordLength: segment.word.length,
            sourceLanguage: annotation.sourceLanguage,
            targetLanguage: annotation.targetLanguage,
          });
          return true;
        }

        function cancelReadiumPointer() {
          if (!activePointer) return;
          activePointer.target.dispatchEvent(
            new PointerEvent('pointercancel', {
              bubbles: true,
              cancelable: true,
              pointerId: activePointer.pointerId,
              pointerType: activePointer.pointerType,
              clientX: activePointer.clientX,
              clientY: activePointer.clientY,
            })
          );
        }

        function annotationFromEvent(event) {
          const element = event.target?.closest?.('[data-bookent-request]');
          return element
            ? annotations.get(element.dataset.bookentRequest) ?? null
            : null;
        }

        function suppressNavigatorTap() {
          window.webkit?.messageHandlers?.bookentTranslation?.postMessage({
            action: 'consumeTap',
          });
        }

        document.addEventListener(
          'pointerdown',
          (event) => {
            if (!event.isPrimary) return;
            if (annotationFromEvent(event)) {
              suppressNavigatorTap();
            }
            activePointer = {
              target: event.target,
              pointerId: event.pointerId,
              pointerType: event.pointerType,
              clientX: event.clientX,
              clientY: event.clientY,
            };
          },
          { passive: true, capture: true }
        );

        document.addEventListener(
          'touchstart',
          (event) => {
            if (event.touches.length !== 1) return;
            gestureConsumed = false;
            if (annotationFromEvent(event)) {
              clearHold();
              suppressNavigatorTap();
              return;
            }
            const touch = event.touches[0];
            startPoint = { x: touch.clientX, y: touch.clientY };
            document.documentElement.classList.add(PRESSING_CLASS);
            holdTimer = setTimeout(() => {
              holdTimer = null;
              if (
                startPoint &&
                createInlineTranslation(startPoint.x, startPoint.y)
              ) {
                gestureConsumed = true;
                suppressClickUntil = Date.now() + 800;
                cancelReadiumPointer();
              }
            }, HOLD_MS);
          },
          { passive: true, capture: true }
        );

        document.addEventListener(
          'touchmove',
          (event) => {
            if (gestureConsumed) {
              event.preventDefault();
              event.stopImmediatePropagation();
              return;
            }
            if (!startPoint || event.touches.length !== 1) return;
            const touch = event.touches[0];
            if (
              Math.hypot(
                touch.clientX - startPoint.x,
                touch.clientY - startPoint.y
              ) > MAX_MOVE
            ) {
              clearHold();
            }
          },
          { passive: false, capture: true }
        );

        document.addEventListener(
          'touchend',
          (event) => {
            const shouldConsume = gestureConsumed;
            clearHold();
            if (shouldConsume) {
              event.preventDefault();
              event.stopImmediatePropagation();
            }
          },
          { passive: false, capture: true }
        );
        document.addEventListener('touchcancel', clearHold, {
          passive: true,
          capture: true,
        });
        document.addEventListener(
          'pointerup',
          (event) => {
            activePointer = null;
            if (gestureConsumed) {
              event.preventDefault();
              event.stopImmediatePropagation();
            }
          },
          { passive: false, capture: true }
        );
        document.addEventListener(
          'pointercancel',
          () => {
            activePointer = null;
          },
          { passive: true, capture: true }
        );
        document.addEventListener(
          'click',
          (event) => {
            if (Date.now() < suppressClickUntil) {
              event.preventDefault();
              event.stopImmediatePropagation();
              return;
            }

            const annotation = annotationFromEvent(event);
            if (!annotation) return;

            event.preventDefault();
            event.stopImmediatePropagation();
            suppressNavigatorTap();

            const text = annotation.word.trim();
            if (!text) return;

            if (
              annotation.state === 'failed' ||
              !annotation.translatedText
            ) {
              annotation.state = 'loading';
              annotation.translation.textContent = '…';
              window.webkit?.messageHandlers?.bookentTranslation?.postMessage({
                id: annotation.id,
                word: text,
                sentence: annotation.sentence || text,
                wordStart: annotation.wordStart,
                wordLength: annotation.wordLength,
                sourceLanguage: annotation.sourceLanguage,
                targetLanguage: annotation.targetLanguage,
              });
              return;
            }

            window.webkit?.messageHandlers?.bookentTranslation?.postMessage({
              action: 'present',
              text,
              translation: annotation.translatedText,
              sentence: annotation.sentence,
              sentenceTranslation: annotation.translatedSentence,
              sourceLanguage: annotation.sourceLanguage,
              targetLanguage: annotation.targetLanguage,
            });
          },
          true
        );
      })();
      """

    userContentController.addUserScript(
      WKUserScript(
        source: source,
        injectionTime: .atDocumentEnd,
        forMainFrameOnly: false
      )
    )
  }
}

extension EPUBViewController: WKScriptMessageHandler {
  func userContentController(
    _ userContentController: WKUserContentController,
    didReceive message: WKScriptMessage
  ) {
    guard message.name == "bookentTranslation",
          let body = message.body as? [String: Any] else {
      return
    }

    if body["action"] as? String == "consumeTap" {
      suppressNextNavigatorTap()
      return
    }

    if body["action"] as? String == "present" {
      suppressNextNavigatorTap()
      NotificationCenter.default.post(
        name: Notification.Name("BookentTranslationPresentationRequest"),
        object: nil,
        userInfo: body
      )
      return
    }

    guard let id = body["id"] as? String else {
      return
    }
    suppressNextNavigatorTap()
    inlineTranslationWebViews.add(message.webView)
    translationWebViews[id] = message.webView
    NotificationCenter.default.post(
      name: Notification.Name("BookentTranslationRequest"),
      object: nil,
      userInfo: body
    )
  }
}

extension EPUBViewController: UIGestureRecognizerDelegate {

  func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer) -> Bool {
    return true
  }

}

extension EPUBViewController: UIPopoverPresentationControllerDelegate {
  // Prevent the popOver to be presented fullscreen on iPhones.
  func adaptivePresentationStyle(for controller: UIPresentationController, traitCollection: UITraitCollection) -> UIModalPresentationStyle
  {
    return .none
  }
}
