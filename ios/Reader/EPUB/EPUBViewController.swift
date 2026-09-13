import UIKit
import ReadiumShared
import ReadiumNavigator
import WebKit

struct SelectionActionData: Codable {
    let id: String
    let label: String
}

// Runs in each reflowable document, before vocabulary wrappers are restored.
// Raw Swift string preserves JavaScript escapes. No reading text leaves WebKit.
private enum BookentTypographyScript {
  static let source = #"""
  (() => {
    if (window.__bookentPrepareTypography) return;
    const root = document.documentElement;
    const managed = new Map();
    const blockSelector = 'p, li, dd, dt, blockquote, figcaption, h1, h2, h3, h4, h5, h6, div, body';
    let timer;
    let measuring = false;
    let preparedSignature = null;

    function typographySignature() {
      const css = getComputedStyle(root);
      // Input/selection classes and our output CSS variables are not typography
      // preferences. Readium changes them while a page gesture is in flight.
      const preferences = Array.from(css).filter(name => name.startsWith('--USER__'))
        .sort().map(name => [name, css.getPropertyValue(name)]);
      return JSON.stringify([preferences, css.fontSize, css.fontFamily,
        css.writingMode, innerWidth, innerHeight,
        css.getPropertyValue('--bookent-translation-scale')]);
    }

    function restore() {
      for (const [element, original] of managed) {
        for (const [property, saved] of Object.entries(original)) {
          if (saved.value) element.style.setProperty(property, saved.value, saved.priority);
          else element.style.removeProperty(property);
        }
      }
      managed.clear();
    }

    function setManaged(element, property, value) {
      if (!managed.has(element)) managed.set(element, {});
      const saved = managed.get(element);
      if (!saved[property]) saved[property] = { value: element.style.getPropertyValue(property), priority: element.style.getPropertyPriority(property) };
      element.style.setProperty(property, value, 'important');
    }

    function collectBlocks() {
      const blocks = new Map();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const parent = node.parentElement;
        if (!node.data.trim() || !parent || parent.closest(
          '.bookent-translation-text, script, style, noscript, pre, code, svg, math, rt, button, input, textarea, select'
        )) continue;
        const element = parent.closest(blockSelector);
        if (!element) continue;
        const css = getComputedStyle(parent);
        if (css.visibility === 'hidden' || css.display === 'none') continue;
        const range = document.createRange();
        range.setStart(node, 0);
        range.setEnd(node, Math.min(node.length, 256));
        const rects = Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0);
        if (!rects.length) continue;
        let block = blocks.get(element);
        if (!block) {
          const style = getComputedStyle(element);
          block = { element, font: parseFloat(style.fontSize), height: 0, sizes: new Set() };
          blocks.set(element, block);
        }
        block.height = Math.max(block.height, ...rects.map(rect => rect.height));
        const textFont = Math.round(parseFloat(css.fontSize) * 10) / 10;
        block.sizes.add(textFont);
      }
      return Array.from(blocks.values());
    }

    function prepare() {
      if (measuring || !document.body) return;
      const signature = typographySignature();
      if (signature === preparedSignature) return;
      measuring = true;
      try {
        restore();
        const rootStyle = getComputedStyle(root);
        const standard = rootStyle.getPropertyValue('--USER__advancedSettings').trim() !== 'readium-advanced-off';
        if (!getComputedStyle(document.body).writingMode.startsWith('horizontal')) return;
        // Readium's root size is the user's reference, not a publisher's body
        // override. Normalize this before deciding which blocks are body copy.
        if (standard) setManaged(document.body, 'font-size', rootStyle.fontSize);
        const bodyStyle = getComputedStyle(document.body);
        if (!bodyStyle.writingMode.startsWith('horizontal')) return;
        let blocks = collectBlocks();
        const bodyFont = parseFloat(bodyStyle.fontSize);
        if (!Number.isFinite(bodyFont) || bodyFont <= 0) return;
        const scale = Math.min(0.92, Math.max(0.1, parseFloat(rootStyle.getPropertyValue('--bookent-translation-scale')) || 0.85));
        const requestedLeading = Math.min(2.8, Math.max(2.1, parseFloat(rootStyle.getPropertyValue('--USER__lineHeight')) || 2.1));
        const eligible = block => {
          if (block.element.matches('h1,h2,h3,h4,h5,h6')) return false;
          if (Math.abs(block.font - bodyFont) > 0.1) return false;
          if ([...block.sizes].some(font => Math.abs(font - bodyFont) > 0.1)) return false;
          // Never change an ancestor strut inherited by headings, captions or
          // differently sized paragraphs. Only leaf text blocks are managed.
          return !block.element.querySelector(blockSelector);
        };
        if (standard) {
          for (const block of blocks.filter(eligible)) {
            setManaged(block.element, 'font-family', 'Georgia, serif');
            for (const inline of block.element.querySelectorAll('*')) {
              if (!inline.closest('.bookent-translation-text, code, pre, svg, math') && Math.abs(parseFloat(getComputedStyle(inline).fontSize) - bodyFont) < .1) {
                setManaged(inline, 'font-family', 'Georgia, serif');
              }
            }
            // The slider is the FINAL baseline distance, not an extra reserve.
            setManaged(block.element, 'line-height', `${bodyFont * requestedLeading}px`);
          }
          blocks = collectBlocks();
        }
        const plans = blocks.filter(eligible);
        const capacity = plans.length ? Math.min(...plans.map(block => {
          const leading = parseFloat(getComputedStyle(block.element).lineHeight);
          // Include the underline and half a CSS pixel for WebKit rounding.
          return Number.isFinite(leading) ? Math.max(0, (leading - block.height - 1.5) / 1.28) : 0;
        })) : 0;
        const translationFont = Math.max(10, Math.min(bodyFont * scale, Math.floor(capacity)));
        const fontValue = `${translationFont.toFixed(2)}px`;
        if (root.style.getPropertyValue('--bookent-translation-font-size') !== fontValue) root.style.setProperty('--bookent-translation-font-size', fontValue);
        root.classList.toggle('bookent-no-translation-space', capacity < 10);
        // Diagnostic metrics only: no text, and no persistence of device pixels
        // into the user's per-book preferences.
        window.__bookentTypographyMetrics = {
          bodyFontSize: bodyFont, translationFontSize: translationFont,
          capacity, requestedLeading, standard, blockCount: plans.length,
        };
        preparedSignature = signature;
      } finally {
        measuring = false;
      }
    }

    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (window.__bookentRelayoutTranslations) window.__bookentRelayoutTranslations();
        else prepare();
      }, 80);
    }
    window.__bookentPrepareTypography = prepare;
    new MutationObserver(schedule).observe(root, { attributes: true, attributeFilter: ['style', 'class'] });
    window.addEventListener('resize', schedule);
    window.addEventListener('load', schedule, { once: true });
    const fontsChanged = () => { preparedSignature = null; schedule(); };
    document.fonts?.ready.then(fontsChanged);
    document.fonts?.addEventListener('loadingdone', fontsChanged);
  })();
  """#
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
    private var isDecorationPrototypeEnabled = false
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
        isDecorationPrototypeEnabled = actions.contains(where: { $0.id == "decoration-prototype" })
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

      var templates = HTMLDecorationTemplate.defaultTemplates()
      templates["bookent-translation-prototype"] = HTMLDecorationTemplate(
        layout: .boxes, width: .wrap,
        element: { decoration in
          // The label is data, never executable publisher/translation HTML.
          let label = (decoration.userInfo["translation"] as? String ?? "")
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
          return "<div class='bookent-decoration-prototype'><span>\(label)</span></div>"
        },
        stylesheet: """
        .bookent-decoration-prototype { width:100%; height:100%; border-bottom:1px dashed currentColor; color:var(--USER__textColor, currentColor); }
        .bookent-decoration-prototype span { position:absolute; top:100%; left:50%; transform:translateX(-50%); white-space:nowrap; font:12px/1.2 sans-serif; }
        """
      )
      let navigator = try EPUBNavigatorViewController(
        publication: publication,
        initialLocation: locator,
        config: EPUBNavigatorViewController.Configuration(
          editingActions: editingActions,
          decorationTemplates: templates
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
    if isDecorationPrototypeEnabled {
      // Keep the current typography baseline while isolating decoration/input.
      // Do not load the legacy wrapping, matching or gesture implementation.
      if publication.metadata.layout != .fixed {
        userContentController.addUserScript(WKUserScript(source: BookentTypographyScript.source, injectionTime: .atDocumentEnd, forMainFrameOnly: false))
      }
      return
    }
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
        let scale = min(0.92, max(0.1, requestedScale))
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
      ) { [weak self] notification in
        guard let self else { return }
        if let completion = notification.userInfo?["metricsCompletion"] as? ([String: Any]?) -> Void {
          guard self.viewIfLoaded?.window != nil else { return }
          Task { @MainActor in
            let result = await self.epubNavigator.evaluateJavaScript("window.__bookentPrepareTypography?.(); window.__bookentTypographyMetrics || null;")
            completion((try? result.get()) as? [String: Any])
          }
          return
        }
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
        if let word = notification.userInfo?["masteredWord"] as? String,
           let data = try? JSONSerialization.data(withJSONObject: [word]),
           let json = String(data: data, encoding: .utf8) {
          for webView in self?.inlineTranslationWebViews.allObjects ?? [] {
            webView.evaluateJavaScript("window.__bookentRemoveLearnedWord?.(...\(json));")
          }
          return
        }
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
    let initialScale = min(0.92, max(0.1, storedScale))
    let knownVocabularyData = UserDefaults.standard.data(
      forKey: "BookentKnownVocabularyTranslations"
    )
    let knownVocabulary = knownVocabularyData.flatMap {
      try? JSONSerialization.jsonObject(with: $0) as? [[String: String]]
    } ?? []
    let knownVocabularyJSON = (try? JSONSerialization.data(withJSONObject: knownVocabulary))
      .flatMap { String(data: $0, encoding: .utf8) } ?? "[]"

    let source = """
      \(publication.metadata.layout == .fixed ? "" : BookentTypographyScript.source)
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
        let annotationTap = null;
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
            max-width: calc(100vw - 6px) !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            text-indent: 0 !important;
            z-index: 1 !important;
            top: calc(100% + 0.08em) !important;
            left: 50% !important;
            transform: translateX(calc(-50% + var(--bookent-translation-shift, 0px))) !important;
            color: inherit !important;
            opacity: 0.62;
            font-family: -apple-system, sans-serif !important;
            font-size: var(--bookent-translation-font-size, max(10px, calc(1rem * var(--bookent-translation-scale)))) !important;
            font-weight: 400 !important;
            font-style: italic;
            letter-spacing: normal !important;
            word-spacing: normal !important;
            line-height: 1.2 !important;
            text-align: center !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            border-bottom: 0 !important;
            text-decoration: none !important;
            -webkit-user-select: none;
            user-select: none;
            pointer-events: none !important;
          }
        `;
        style.textContent += '.bookent-no-translation-space .bookent-translation-text { display: none !important; }';
        document.documentElement.appendChild(style);
        document.documentElement.style.setProperty(
          '--bookent-translation-scale',
          String(TRANSLATION_FONT_SCALE)
        );
        window.__bookentPrepareTypography?.();
        let collisionFrame = null;
        const TRANSLATION_GAP = 3;
        const PAGE_EDGE_INSET = 3;

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

        function translationLineGroups(entries, pageWidth) {
          const pages = new Map();
          for (const entry of entries) {
            const sourceCenter = entry.baseRect.left + entry.baseRect.width / 2;
            const pageIndex = Math.floor(sourceCenter / pageWidth);
            let lines = pages.get(pageIndex);
            if (!lines) {
              lines = [];
              pages.set(pageIndex, lines);
            }

            let line = lines.find(
              (candidate) => Math.abs(candidate.top - entry.baseRect.top) < 4
            );
            if (!line) {
              line = { pageIndex, top: entry.baseRect.top, entries: [] };
              lines.push(line);
            }
            line.entries.push(entry);
          }

          return Array.from(pages.values()).flat();
        }

        function setTranslationPosition(entry, left, visible = true) {
          const shift = left - entry.translationRect.left;
          entry.annotation.translation.dataset.bookentShift = String(shift);
          entry.annotation.translation.style.setProperty(
            '--bookent-translation-shift',
            `${shift}px`
          );
          entry.annotation.translation.style.visibility = visible
            ? 'visible'
            : 'hidden';
        }

        function layoutTranslationLine(line, pageWidth) {
          const pageLeft = line.pageIndex * pageWidth + PAGE_EDGE_INSET;
          const pageRight = (line.pageIndex + 1) * pageWidth - PAGE_EDGE_INSET;
          const availableWidth = pageRight - pageLeft;
          const entries = line.entries.sort(
            (left, right) => left.baseRect.left - right.baseRect.left
          );
          const widths = entries.map((entry) => entry.translationRect.width);
          const totalWidth =
            widths.reduce((sum, width) => sum + width, 0) +
            TRANSLATION_GAP * Math.max(0, entries.length - 1);

          // If every label can fit in this physical page column, keep each one
          // as close to its source word as possible while preserving order.
          if (totalWidth <= availableWidth) {
            const positions = entries.map((entry, index) =>
              Math.max(
                pageLeft,
                Math.min(
                  entry.translationRect.left,
                  pageRight - widths[index]
                )
              )
            );

            for (let index = 1; index < positions.length; index += 1) {
              positions[index] = Math.max(
                positions[index],
                positions[index - 1] + widths[index - 1] + TRANSLATION_GAP
              );
            }
            for (let index = positions.length - 2; index >= 0; index -= 1) {
              positions[index] = Math.min(
                positions[index],
                positions[index + 1] - TRANSLATION_GAP - widths[index]
              );
            }
            if (positions.length) {
              const rightOverflow =
                positions[positions.length - 1] +
                widths[widths.length - 1] -
                pageRight;
              if (rightOverflow > 0) {
                for (let index = 0; index < positions.length; index += 1) {
                  positions[index] -= rightOverflow;
                }
              }
              const leftOverflow = pageLeft - positions[0];
              if (leftOverflow > 0) {
                for (let index = 0; index < positions.length; index += 1) {
                  positions[index] += leftOverflow;
                }
              }
            }

            entries.forEach((entry, index) => {
              setTranslationPosition(entry, positions[index]);
            });
            return;
          }

          // It is geometrically impossible to show every full-size label on
          // one line. Preserve readable labels in source order and hide only
          // the ones that cannot fit; their source underline remains visible
          // and tappable for the detailed translation view.
          let occupiedRight = pageLeft - TRANSLATION_GAP;
          entries.forEach((entry, index) => {
            const desiredLeft = Math.max(
              pageLeft,
              Math.min(entry.translationRect.left, pageRight - widths[index])
            );
            const left = Math.max(
              desiredLeft,
              occupiedRight + TRANSLATION_GAP
            );
            const visible =
              widths[index] <= availableWidth && left + widths[index] <= pageRight;
            setTranslationPosition(entry, left, visible);
            if (visible) occupiedRight = left + widths[index];
          });
        }

        function resolveTranslationCollisions() {
          collisionFrame = null;
          const initial = translationEntries();
          for (const entry of initial) {
            const baseStyle = getComputedStyle(entry.annotation.base);
            const resolvedColor = baseStyle.color;
            const resolvedFillColor = baseStyle.webkitTextFillColor || resolvedColor;
            entry.annotation.translation.style.setProperty(
              'color',
              resolvedColor,
              'important'
            );
            entry.annotation.translation.style.setProperty(
              '-webkit-text-fill-color',
              resolvedFillColor,
              'important'
            );
            entry.annotation.translation.dataset.bookentShift = '0';
            entry.annotation.translation.style.setProperty(
              '--bookent-translation-shift',
              '0px'
            );
            entry.annotation.translation.style.visibility = 'visible';
          }

          // Readium lays out a chapter as horizontal page columns. Bounding
          // rectangles from adjacent columns can be negative or wider than the
          // current viewport, so collision work must never share one global
          // 0...viewportWidth boundary. Lay out each physical column and text
          // line independently.
          const pageWidth = Math.max(
            1,
            document.documentElement.clientWidth || window.innerWidth
          );
          const entries = translationEntries();
          for (const line of translationLineGroups(entries, pageWidth)) {
            layoutTranslationLine(line, pageWidth);
          }
        }

        function scheduleTranslationLayout() {
          if (collisionFrame !== null) cancelAnimationFrame(collisionFrame);
          collisionFrame = requestAnimationFrame(resolveTranslationCollisions);
        }

        window.__bookentRelayoutTranslations = () => {
          window.__bookentPrepareTypography?.();
          scheduleTranslationLayout();
        };

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

        window.__bookentRemoveLearnedWord = (word) => {
          const normalize = value => value.normalize('NFKC').replace(/[‘’]/g, "'").trim().toLocaleLowerCase('en-US');
          for (const wrapper of document.querySelectorAll('.bookent-inline-translation')) {
            const base = wrapper.querySelector('.bookent-word-base');
            if (base && normalize(base.textContent) === normalize(word)) {
              annotations.delete(wrapper.dataset.bookentRequest);
              wrapper.replaceWith(document.createTextNode(base.textContent));
            }
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
            annotationTap = null;
            if (event.touches.length !== 1) { clearHold(); return; }
            gestureConsumed = false;
            const touchedAnnotation = annotationFromEvent(event);
            if (touchedAnnotation) {
              clearHold();
              const touch = event.touches[0];
              annotationTap = { annotation: touchedAnnotation, identifier: touch.identifier, x: touch.clientX, y: touch.clientY };
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
            if (annotationTap) {
              const touch = Array.from(event.touches).find(t => t.identifier === annotationTap.identifier);
              if (event.touches.length !== 1 || !touch || Math.hypot(touch.clientX - annotationTap.x, touch.clientY - annotationTap.y) > MAX_MOVE) annotationTap = null;
            }
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
            const tap = annotationTap;
            annotationTap = null;
            if (tap) {
              const touch = Array.from(event.changedTouches).find(t => t.identifier === tap.identifier);
              if (touch && Math.hypot(touch.clientX - tap.x, touch.clientY - tap.y) <= MAX_MOVE) {
                clearHold();
                gestureConsumed = true;
                event.preventDefault();
                event.stopImmediatePropagation();
                suppressNavigatorTap();
                activateAnnotation(tap.annotation);
                // Ignore only the compatibility click; a new touch uses its
                // own lifecycle and is not blocked by this deadline.
                suppressClickUntil = Date.now() + 800;
                return;
              }
            }
            const shouldConsume = gestureConsumed;
            clearHold();
            if (shouldConsume) {
              event.preventDefault();
              event.stopImmediatePropagation();
            }
          },
          { passive: false, capture: true }
        );
        document.addEventListener('touchcancel', () => { annotationTap = null; clearHold(); }, {
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
        function activateAnnotation(annotation) {
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
        }
        document.addEventListener('click', event => {
          const annotation = annotationFromEvent(event);
          if (!annotation) return;
          event.preventDefault();
          event.stopImmediatePropagation();
          if (Date.now() < suppressClickUntil && event.detail !== 0) return;
          suppressNavigatorTap();
          activateAnnotation(annotation);
        }, true);
        window.webkit?.messageHandlers?.bookentTranslation?.postMessage({
          action: 'register',
        });
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

    if body["action"] as? String == "register" {
      inlineTranslationWebViews.add(message.webView)
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
