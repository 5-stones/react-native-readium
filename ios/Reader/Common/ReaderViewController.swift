import Combine
import SafariServices
import UIKit
import ReadiumNavigator
import ReadiumShared
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
  private var subject = PassthroughSubject<ReadiumShared.Locator, Never>()
  lazy var publisher = subject.eraseToAnyPublisher()
  private var positionsCount: Int?
  private var positionsLoadingTask: Task<Void, Never>?
  private var lastKnownLocator: ReadiumShared.Locator?
  private var navigatorInputObserverTokens = Set<InputObservableToken>()
  private var directionalNavigationAdapter: DirectionalNavigationAdapter?
  private var suppressNavigatorTapUntil = Date.distantPast
  private var navigationBoundaryToast: UILabel?
  private var navigationBoundaryToastHideWorkItem: DispatchWorkItem?
  private var navigationBoundaryCheckWorkItem: DispatchWorkItem?
  private var navigationLocationRevision = 0
  private var boundarySwipeStart: (location: CGPoint, revision: Int)?

  private enum NavigationBoundary {
    case beginning
    case end
  }

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
    positionsLoadingTask?.cancel()
    navigationBoundaryToastHideWorkItem?.cancel()
    navigationBoundaryCheckWorkItem?.cancel()
    removeNavigatorInputObservers()
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

    configureNavigatorInteractions()
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
    NotificationCenter.default.post(
      name: Notification.Name("BookentReaderControlsVisibilityChanged"),
      object: nil,
      userInfo: ["visible": !hidden]
    )
  }

  override var preferredStatusBarUpdateAnimation: UIStatusBarAnimation {
    return .slide
  }

  override var prefersStatusBarHidden: Bool {
    return navigationBarHidden && !UIAccessibility.isVoiceOverRunning
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

  private func configureNavigatorInteractions() {
    guard let visualNavigator = navigator as? VisualNavigator else {
      return
    }

    guard navigatorInputObserverTokens.isEmpty else {
      return
    }

    let inlineTranslationToken = visualNavigator.addObserver(.tap { [weak self] event in
      guard let self, event.phase != .cancel else {
        return false
      }
      return Date() < self.suppressNavigatorTapUntil
    })
    inlineTranslationToken.store(in: &navigatorInputObserverTokens)

    let navigationAdapter = DirectionalNavigationAdapter(
      pointerPolicy: .init(
        edges: .horizontal,
        minimumHorizontalEdgeSize: 60,
        horizontalEdgeThresholdPercent: 0.25
      ),
      animatedTransition: true
    )
    directionalNavigationAdapter = navigationAdapter
    navigationAdapter.bind(to: visualNavigator)

    // The directional adapter returns false when it cannot move beyond the
    // first or last page. Consume that edge tap before the center handler can
    // toggle the navigation chrome, and give the reader explicit feedback.
    let boundaryToken = visualNavigator.addObserver(.tap { [weak self, weak visualNavigator] event in
      guard
        let self,
        let visualNavigator,
        event.phase != .cancel,
        let boundary = self.horizontalNavigationBoundary(
          at: event.location,
          in: visualNavigator
        ),
        self.isAtNavigationBoundary(boundary)
      else {
        return false
      }

      self.showNavigationBoundary(boundary)
      return true
    })
    boundaryToken.store(in: &navigatorInputObserverTokens)

    // Readium owns the actual swipe gesture. Observe it without consuming it,
    // then show the same boundary feedback only when a deliberate horizontal
    // swipe completed without changing the publication location.
    let boundarySwipeToken = visualNavigator.addObserver(.drag(
      onStart: { [weak self] event in
        guard let self else { return false }
        self.navigationBoundaryCheckWorkItem?.cancel()
        self.boundarySwipeStart = (
          location: event.location,
          revision: self.navigationLocationRevision
        )
        return false
      },
      onEnd: { [weak self, weak visualNavigator] event in
        guard
          let self,
          let visualNavigator,
          let start = self.boundarySwipeStart
        else {
          return false
        }
        self.boundarySwipeStart = nil

        let deltaX = event.location.x - start.location.x
        let deltaY = event.location.y - start.location.y
        guard
          abs(deltaX) >= 44,
          abs(deltaX) > abs(deltaY) * 1.25,
          let boundary = self.horizontalNavigationBoundary(
            forSwipeDeltaX: deltaX,
            in: visualNavigator
          )
        else {
          return false
        }

        let checkWorkItem = DispatchWorkItem { [weak self] in
          guard
            let self,
            self.navigationLocationRevision == start.revision,
            self.isAtNavigationBoundary(boundary)
          else {
            return
          }
          self.showNavigationBoundary(boundary)
        }
        self.navigationBoundaryCheckWorkItem = checkWorkItem
        DispatchQueue.main.asyncAfter(
          deadline: .now() + 0.45,
          execute: checkWorkItem
        )
        return false
      },
      onCancel: { [weak self] _ in
        self?.boundarySwipeStart = nil
        return false
      }
    ))
    boundarySwipeToken.store(in: &navigatorInputObserverTokens)

    let toggleToken = visualNavigator.addObserver(.tap { [weak self] event in
      guard
        let self,
        event.phase != .cancel
      else {
        return false
      }

      self.toggleNavigationBar()
      return true
    })
    toggleToken.store(in: &navigatorInputObserverTokens)
  }

  func suppressNextNavigatorTap() {
    suppressNavigatorTapUntil = Date().addingTimeInterval(1.5)
  }

  private func removeNavigatorInputObservers() {
    directionalNavigationAdapter?.unbind()
    directionalNavigationAdapter = nil
    navigationBoundaryCheckWorkItem?.cancel()
    navigationBoundaryCheckWorkItem = nil
    boundarySwipeStart = nil

    guard
      let visualNavigator = navigator as? VisualNavigator
    else {
      navigatorInputObserverTokens.removeAll()
      return
    }

    navigatorInputObserverTokens.forEach { visualNavigator.removeObserver($0) }
    navigatorInputObserverTokens.removeAll()
  }

  private func horizontalNavigationBoundary(
    at point: CGPoint,
    in navigator: VisualNavigator
  ) -> NavigationBoundary? {
    guard !navigator.presentation.scroll else {
      return nil
    }

    let bounds = navigator.view.bounds
    let edgeSize = max(60, bounds.width * 0.25)
    let isLeftEdge = point.x <= edgeSize
    let isRightEdge = point.x >= bounds.width - edgeSize
    guard isLeftEdge || isRightEdge else {
      return nil
    }

    switch navigator.presentation.readingProgression {
    case .ltr:
      return isLeftEdge ? .beginning : .end
    case .rtl:
      return isLeftEdge ? .end : .beginning
    }
  }

  private func horizontalNavigationBoundary(
    forSwipeDeltaX deltaX: CGFloat,
    in navigator: VisualNavigator
  ) -> NavigationBoundary? {
    guard !navigator.presentation.scroll, deltaX != 0 else {
      return nil
    }

    switch navigator.presentation.readingProgression {
    case .ltr:
      return deltaX > 0 ? .beginning : .end
    case .rtl:
      return deltaX > 0 ? .end : .beginning
    }
  }

  private func isAtNavigationBoundary(_ boundary: NavigationBoundary) -> Bool {
    guard let locator = lastKnownLocator else {
      return false
    }

    switch boundary {
    case .beginning:
      if let position = locator.locations.position, position <= 1 {
        return true
      }
      return (locator.locations.totalProgression ?? 1) <= 0.001
    case .end:
      if
        let position = locator.locations.position,
        let positionsCount,
        position >= positionsCount
      {
        return true
      }
      return (locator.locations.totalProgression ?? 0) >= 0.999
    }
  }

  private func showNavigationBoundary(_ boundary: NavigationBoundary) {
    let message: String
    switch boundary {
    case .beginning:
      message = NSLocalizedString(
        "reader_at_beginning_message",
        value: "已经是第一页",
        comment: "Shown when the reader tries to navigate before the first page"
      )
    case .end:
      message = NSLocalizedString(
        "reader_at_end_message",
        value: "已经是最后一页",
        comment: "Shown when the reader tries to navigate past the final page"
      )
    }

    navigationBoundaryToastHideWorkItem?.cancel()

    let toast: UILabel
    if let existingToast = navigationBoundaryToast {
      toast = existingToast
    } else {
      toast = UILabel()
      toast.translatesAutoresizingMaskIntoConstraints = false
      toast.backgroundColor = UIColor.black.withAlphaComponent(0.76)
      toast.textColor = .white
      toast.font = .systemFont(ofSize: 14, weight: .medium)
      toast.textAlignment = .center
      toast.numberOfLines = 1
      toast.layer.cornerRadius = 18
      toast.layer.masksToBounds = true
      toast.isUserInteractionEnabled = false
      toast.setContentHuggingPriority(.required, for: .horizontal)
      view.addSubview(toast)
      NSLayoutConstraint.activate([
        toast.centerXAnchor.constraint(equalTo: view.centerXAnchor),
        toast.bottomAnchor.constraint(equalTo: positionLabel.topAnchor, constant: -14),
        toast.heightAnchor.constraint(greaterThanOrEqualToConstant: 36),
        toast.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 24),
        toast.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -24),
      ])
      navigationBoundaryToast = toast
    }

    toast.text = "  \(message)  "
    toast.alpha = 0
    UIView.animate(withDuration: 0.16) {
      toast.alpha = 1
    }
    UIAccessibility.post(notification: .announcement, argument: message)

    let hideWorkItem = DispatchWorkItem { [weak self, weak toast] in
      guard let self, let toast else { return }
      UIView.animate(
        withDuration: 0.2,
        animations: {
          toast.alpha = 0
        },
        completion: { _ in
          toast.removeFromSuperview()
          if self.navigationBoundaryToast === toast {
            self.navigationBoundaryToast = nil
          }
        }
      )
    }
    navigationBoundaryToastHideWorkItem = hideWorkItem
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.2, execute: hideWorkItem)
  }

  @objc private func goBackward() {
    Task { [weak self] in
      await self?.navigateBackwardAnimated()
    }
  }

  @objc private func goForward() {
    Task { [weak self] in
      await self?.navigateForwardAnimated()
    }
  }

  @MainActor
  private func navigateBackwardAnimated() async {
    _ = await navigator.goBackward(options: .animated)
  }

  @MainActor
  private func navigateForwardAnimated() async {
    _ = await navigator.goForward(options: .animated)
  }

}

extension ReaderViewController: NavigatorDelegate {
  func navigator(_ navigator: Navigator, locationDidChange locator: ReadiumShared.Locator) {
    navigationLocationRevision += 1
    navigationBoundaryCheckWorkItem?.cancel()
    subject.send(locator)
    updatePositionLabel(with: locator)
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

  func navigator(_ navigator: Navigator, shouldNavigateToNoteAt link: ReadiumShared.Link, content: String, referrer: String?) -> Bool {

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

extension ReaderViewController {
  private func updatePositionLabel(with locator: ReadiumShared.Locator) {
    lastKnownLocator = locator
    positionLabel.text = positionLabelText(for: locator)
  }

  private func positionLabelText(for locator: ReadiumShared.Locator) -> String? {
    if let position = locator.locations.position {
      if let total = positionsCount {
        return "\(position) / \(total)"
      } else {
        loadPositionsCountIfNeeded()
        return "\(position)"
      }
    } else if let progression = locator.locations.totalProgression {
      return "\(progression)%"
    } else {
      return nil
    }
  }

  private func loadPositionsCountIfNeeded() {
    guard positionsCount == nil else {
      return
    }
    guard positionsLoadingTask == nil else {
      return
    }

    positionsLoadingTask = Task { [weak self] in
      guard let self else { return }
      defer { self.positionsLoadingTask = nil }

      let result = await self.publication.positions()
      guard !Task.isCancelled else { return }

      switch result {
      case let .success(positions):
        await MainActor.run {
          self.positionsCount = positions.count
          self.refreshPositionLabel()
        }
      case let .failure(error):
        self.log(.error, "Failed to load publication positions: \(error)")
      }
    }
  }

  @MainActor
  private func refreshPositionLabel() {
    guard let locator = lastKnownLocator else {
      return
    }
    positionLabel.text = positionLabelText(for: locator)
  }
}
