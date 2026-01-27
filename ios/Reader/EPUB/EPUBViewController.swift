import UIKit
import ReadiumShared
import ReadiumNavigator

struct SelectionActionData: Codable {
    let id: String
    let label: String
}

protocol SelectionActionDelegate: AnyObject {
    func onSelectionAction(_ payload: [String: Any])
}

class EPUBViewController: ReaderViewController, SelectionActionHandlerDelegate {
    private var selectionActionHandler: SelectionActionHandler?
    weak var selectionActionDelegate: SelectionActionDelegate?

    init(
      publication: Publication,
      locator: Locator?,
      bookId: String,
      selectionActions: String? = nil
    ) throws {
      // Parse selection actions
      var editingActions: [EditingAction] = []
      var actionIds: [String] = []

      if let actionsJson = selectionActions {
        let data = Data(actionsJson.utf8)
        if let actions = try? JSONDecoder().decode([SelectionActionData].self, from: data) {
          for action in actions {
            actionIds.append(action.id)

            // Create a selector for each action dynamically
            let selectorName = "handleSelectionAction_\(action.id):"
            let selector = NSSelectorFromString(selectorName)

            editingActions.append(EditingAction(
              title: action.label,
              action: selector
            ))
          }
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
        ),
        httpServer: EPUBHTTPServer.shared
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

    func updateSelectionActions(_ selectionActions: String?) {
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

      let payload: [String: Any] = [
        "actionId": actionId,
        "locator": selection.locator.json,
        "selectedText": selection.locator.text.highlight ?? ""
      ]

      selectionActionDelegate?.onSelectionAction(payload)

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

    override var currentBookmark: Bookmark? {
      guard let locator = navigator.currentLocation else {
        return nil
      }

      return Bookmark(bookId: bookId, locator: locator)
    }

}

extension EPUBViewController: EPUBNavigatorDelegate {}

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
