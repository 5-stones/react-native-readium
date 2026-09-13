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

    let source = BookentInlineScript.make(publication: publication, initialScale: initialScale, knownVocabularyJSON: knownVocabularyJSON)

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
