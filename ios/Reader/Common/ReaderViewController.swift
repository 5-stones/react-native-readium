import Combine
import SafariServices
import UIKit
import R2Navigator
import R2Shared
import SwiftSoup
import WebKit


/// This class is meant to be subclassed by each publication format view controller. It contains the shared behavior, eg. navigation bar toggling.
class ReaderViewController: UIViewController, Loggable {

  weak var moduleDelegate: ReaderFormatModuleDelegate?

  let navigator: UIViewController & Navigator
  let publication: Publication
  let bookId: String

  private(set) var stackView: UIStackView!
  private lazy var positionLabel = UILabel()
  private var subscriptions = Set<AnyCancellable>()
  private var subject = PassthroughSubject<Locator, Never>()
  lazy var publisher = subject.eraseToAnyPublisher()

  /// This regex matches any string with at least 2 consecutive letters (not limited to ASCII).
  /// It's used when evaluating whether to display the body of a noteref referrer as the note's title.
  /// I.e. a `*` or `1` would not be used as a title, but `on` or `好書` would.
  private static var noterefTitleRegex: NSRegularExpression = {
    return try! NSRegularExpression(pattern: "[\\p{Ll}\\p{Lu}\\p{Lt}\\p{Lo}]{2}")
  }()

  init(
    navigator: UIViewController & Navigator,
    publication: Publication,
    bookId: String
  ) {
    self.navigator = navigator
    self.publication = publication
    self.bookId = bookId

    super.init(nibName: nil, bundle: nil)

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(voiceOverStatusDidChange),
      name: UIAccessibility.voiceOverStatusDidChangeNotification,
      object: nil
    )
  }

  @available(*, unavailable)
  required init?(coder aDecoder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  override func viewDidLoad() {
    super.viewDidLoad()

    view.backgroundColor = .white

    updateNavigationBar(animated: false)

    stackView = UIStackView(frame: view.bounds)
    stackView.distribution = .fill
    stackView.axis = .vertical
    view.addSubview(stackView)
    stackView.translatesAutoresizingMaskIntoConstraints = false
    let topConstraint = stackView.topAnchor.constraint(equalTo: view.topAnchor)
    // `accessibilityTopMargin` takes precedence when VoiceOver is enabled.
    topConstraint.priority = .defaultHigh
    NSLayoutConstraint.activate([
      topConstraint,
      stackView.rightAnchor.constraint(equalTo: view.rightAnchor),
      stackView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
      stackView.leftAnchor.constraint(equalTo: view.leftAnchor)
    ])

    addChild(navigator)
    stackView.addArrangedSubview(navigator.view)
    navigator.didMove(toParent: self)

    stackView.addArrangedSubview(accessibilityToolbar)

    positionLabel.translatesAutoresizingMaskIntoConstraints = false
    positionLabel.font = .systemFont(ofSize: 12)
    positionLabel.textColor = .darkGray
    view.addSubview(positionLabel)
    NSLayoutConstraint.activate([
      positionLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      positionLabel.bottomAnchor.constraint(equalTo: navigator.view.bottomAnchor, constant: -20)
    ])
  }

  override func willMove(toParent parent: UIViewController?) {
    // Restore library's default UI colors
    navigationController?.navigationBar.tintColor = .black
    navigationController?.navigationBar.barTintColor = .white
  }


  // MARK: - Navigation bar

  private var navigationBarHidden: Bool = true {
    didSet {
      updateNavigationBar()
    }
  }

  func toggleNavigationBar() {
    navigationBarHidden = !navigationBarHidden
  }

  func updateNavigationBar(animated: Bool = true) {
    let hidden = navigationBarHidden && !UIAccessibility.isVoiceOverRunning
    navigationController?.setNavigationBarHidden(hidden, animated: animated)
    setNeedsStatusBarAppearanceUpdate()
  }

  override var preferredStatusBarUpdateAnimation: UIStatusBarAnimation {
    return .slide
  }

  override var prefersStatusBarHidden: Bool {
    return navigationBarHidden && !UIAccessibility.isVoiceOverRunning
  }


  // MARK: - Locations
  /// FIXME: This should be implemented in a shared Navigator interface, using Locators.

  var currentBookmark: Bookmark? {
    fatalError("Not implemented")
  }

  // MARK: - Bookmarks

  @objc func bookmarkCurrentPosition() {
    // guard let bookmark = currentBookmark else {
    //   return
    // }

    // TODO: this should call a react callback
    // bookmarks.add(bookmark)
    //   .sink { completion in
    //     switch completion {
    //     case .finished:
    //       toast(NSLocalizedString("reader_bookmark_success_message", comment: "Success message when adding a bookmark"), on: self.view, duration: 1)
    //     case .failure(let error):
    //       print(error)
    //       toast(NSLocalizedString("reader_bookmark_failure_message", comment: "Error message when adding a new bookmark failed"), on: self.view, duration: 2)
    //     }
    //   } receiveValue: { _ in }
    //   .store(in: &subscriptions)
  }

  // MARK: - Accessibility

  /// Constraint used to shift the content under the navigation bar, since it is always visible when VoiceOver is running.
  private lazy var accessibilityTopMargin: NSLayoutConstraint = {
    let topAnchor: NSLayoutYAxisAnchor = {
      if #available(iOS 11.0, *) {
        return self.view.safeAreaLayoutGuide.topAnchor
      } else {
        return self.topLayoutGuide.bottomAnchor
      }
    }()
    return self.stackView.topAnchor.constraint(equalTo: topAnchor)
  }()

  private lazy var accessibilityToolbar: UIToolbar = {
    func makeItem(_ item: UIBarButtonItem.SystemItem, label: String? = nil, action: UIKit.Selector? = nil) -> UIBarButtonItem {
      let button = UIBarButtonItem(barButtonSystemItem: item, target: (action != nil) ? self : nil, action: action)
      button.accessibilityLabel = label
      return button
    }

    let toolbar = UIToolbar(frame: .zero)
    toolbar.items = [
      makeItem(.flexibleSpace),
      makeItem(.rewind, label: NSLocalizedString("reader_backward_a11y_label", comment: "Accessibility label to go backward in the publication"), action: #selector(goBackward)),
      makeItem(.flexibleSpace),
      makeItem(.fastForward, label: NSLocalizedString("reader_forward_a11y_label", comment: "Accessibility label to go forward in the publication"), action: #selector(goForward)),
      makeItem(.flexibleSpace),
    ]
    toolbar.isHidden = !UIAccessibility.isVoiceOverRunning
    toolbar.tintColor = UIColor.black
    return toolbar
  }()

  private var isVoiceOverRunning = UIAccessibility.isVoiceOverRunning

  @objc private func voiceOverStatusDidChange() {
    let isRunning = UIAccessibility.isVoiceOverRunning
    // Avoids excessive settings refresh when the status didn't change.
    guard isVoiceOverRunning != isRunning else {
      return
    }
    isVoiceOverRunning = isRunning
    accessibilityTopMargin.isActive = isRunning
    accessibilityToolbar.isHidden = !isRunning
    updateNavigationBar()
  }

  @objc private func goBackward() {
    navigator.goBackward()
  }

  @objc private func goForward() {
    navigator.goForward()
  }

}

extension ReaderViewController: NavigatorDelegate {
  func navigator(_ navigator: Navigator, locationDidChange locator: Locator) {
    subject.send(locator)
    positionLabel.text = {
      if let position = locator.locations.position {
        return "\(position) / \(publication.positions.count)"
      } else if let progression = locator.locations.totalProgression {
        return "\(progression)%"
      } else {
        return nil
      }
    }()
  }

  func navigator(_ navigator: Navigator, presentExternalURL url: URL) {
    // SFSafariViewController crashes when given an URL without an HTTP scheme.
    guard ["http", "https"].contains(url.scheme?.lowercased() ?? "") else {
      return
    }
    present(SFSafariViewController(url: url), animated: true)
  }

  func navigator(_ navigator: Navigator, presentError error: NavigatorError) {
    moduleDelegate?.presentError(error, from: self)
  }

  func navigator(_ navigator: Navigator, shouldNavigateToNoteAt link: Link, content: String, referrer: String?) -> Bool {

    var title = referrer
    if let t = title {
      title = try? clean(t, .none())
    }
    if !suitableTitle(title) {
      title = nil
    }

    let content = (try? clean(content, .none())) ?? ""
    let page =
    """
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body>
        \(content)
      </body>
    </html>
    """

    let wk = WKWebView()
    wk.loadHTMLString(page, baseURL: nil)

    let vc = UIViewController()
    vc.view = wk
    vc.navigationItem.title = title

    let nav = UINavigationController(rootViewController: vc)
    nav.modalPresentationStyle = .formSheet
    self.present(nav, animated: true, completion: nil)

    return false
  }

  /// Checks to ensure the title is non-nil and contains at least 2 letters.
  func suitableTitle(_ title: String?) -> Bool {
    guard let title = title else { return false }
    let range = NSRange(location: 0, length: title.utf16.count)
    let match = ReaderViewController.noterefTitleRegex.firstMatch(in: title, range: range)
    return match != nil
  }

}

extension ReaderViewController: VisualNavigatorDelegate {

    func navigator(_ navigator: VisualNavigator, didTapAt point: CGPoint) {
        let moved = DirectionalNavigationAdapter(navigator: navigator).didTap(at: point)
        if !moved {
            toggleNavigationBar()
        }
    }
    
    func navigator(_ navigator: VisualNavigator, didPressKey event: KeyEvent) {
        DirectionalNavigationAdapter(navigator: navigator).didPressKey(event: event)
    }
}
