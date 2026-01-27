import Combine
import Foundation
import ReadiumShared
import ReadiumStreamer
import UIKit
import ReadiumNavigator


class ReadiumView : UIView, Loggable, SelectionActionDelegate {
  var readerService: ReaderService = ReaderService()
  var readerViewController: ReaderViewController?
  var viewController: UIViewController? {
    let viewController = sequence(first: self, next: { $0.next }).first(where: { $0 is UIViewController })
    return viewController as? UIViewController
  }
  private var subscriptions = Set<AnyCancellable>()
  private var pendingFileUrl: String?
  private var pendingInitialLocation: NSDictionary?
  private var hasLoadedBook = false
  private var selectionActionsReceived = false
  private var activeDecorationGroups = Set<String>()

  @objc var file: NSDictionary? = nil {
    didSet {
      let initialLocation = file?["initialLocation"] as? NSDictionary
      if let url = file?["url"] as? String {
        // Store the file info but defer loading until selectionActions is set
        pendingFileUrl = url
        pendingInitialLocation = initialLocation
        self.tryLoadBook()
      }
    }
  }
  @objc var location: NSDictionary? = nil {
    didSet {
      self.updateLocation()
    }
  }
  @objc var preferences: NSString? = nil {
    didSet {
      self.updatePreferences(preferences)
    }
  }
  @objc var decorations: NSString? = nil {
    didSet {
      self.updateDecorations(decorations)
    }
  }
  @objc var selectionActions: NSString? = nil {
    didSet {
      selectionActionsReceived = true
      // Try to load the book now that selectionActions is set
      self.tryLoadBook()
    }
  }
  @objc var onLocationChange: RCTDirectEventBlock?
  @objc var onPublicationReady: RCTDirectEventBlock?
  @objc var onDecorationActivated: RCTDirectEventBlock?
  @objc var onSelectionAction: RCTDirectEventBlock?

  func tryLoadBook() {
    // Only load if:
    // 1. We have a file URL
    // 2. selectionActions has been received (or is intentionally nil)
    // 3. We haven't already loaded the book
    guard let url = pendingFileUrl,
          selectionActionsReceived,
          !hasLoadedBook else {
      return
    }

    // Mark as loaded and clear pending state
    hasLoadedBook = true
    let location = pendingInitialLocation
    pendingFileUrl = nil
    pendingInitialLocation = nil

    loadBook(url: url, location: location)
  }

  func loadBook(
    url: String,
    location: NSDictionary?
  ) {
    guard let rootViewController = UIApplication.shared.delegate?.window??.rootViewController else { return }

    self.readerService.buildViewController(
      url: url,
      bookId: url,
      location: location,
      selectionActions: selectionActions as? String,
      sender: rootViewController,
      completion: { vc in
        // Set the selection action delegate if this is an EPUBViewController
        if let epubVC = vc as? EPUBViewController {
          epubVC.selectionActionDelegate = self
        }

        self.addViewControllerAsSubview(vc)
      }
    )
  }

  // SelectionActionDelegate implementation
  func onSelectionAction(_ payload: [String: Any]) {
    self.onSelectionAction?(payload)
  }

  func getLocator() async -> Locator? {
    return await ReaderService.locatorFromLocation(location, readerViewController?.publication)
  }

  func updateLocation() {
    Task { @MainActor [weak self] in
      guard let self = self else { return }
      guard let navigator = self.readerViewController?.navigator else {
        return
      }
      guard let locator = await self.getLocator() else {
        return
      }

      let currentLocation = navigator.currentLocation
      if let currentLocation, locator.hashValue == currentLocation.hashValue {
        return
      }

      _ = await navigator.go(
        to: locator,
        options: .animated
      )
    }
  }

  func updatePreferences(_ preferences: NSString?) {

    if (readerViewController == nil) {
      // defer setting update as view isn't initialized yet
      return;
    }

    guard let navigator = readerViewController!.navigator as? EPUBNavigatorViewController else {
      return;
    }

    guard let preferencesJson = preferences as? String else {
      print("TODO: handle error. Bad string conversion for preferences")
      return;
    }

    do {
      let preferences = try JSONDecoder().decode(EPUBPreferences.self, from: Data(preferencesJson.utf8))
      navigator.submitPreferences(preferences)
    } catch {
      print(error)
      print("TODO: handle error. Skipping preferences due to thrown exception")
      return;
    }
  }

  func updateDecorations(_ decorations: NSString?) {
    if (readerViewController == nil) {
      // defer setting update as view isn't initialized yet
      return;
    }

    guard let navigator = readerViewController!.navigator as? DecorableNavigator else {
      print("Navigator does not support decorations")
      return;
    }

    guard let decorationsJson = decorations as? String else {
      return;
    }

    do {
      let data = Data(decorationsJson.utf8)
      let decorationGroups: [String: [DecorationJSON]] = try JSONDecoder().decode([String: [DecorationJSON]].self, from: data)

      for (group, decorationDataList) in decorationGroups {
        let decorations = decorationDataList.compactMap { decorationData -> Decoration? in
          return decorationData.toDecoration()
        }

        navigator.apply(decorations: decorations, in: group)

        // Set up listener for this group if not already active
        if !activeDecorationGroups.contains(group) {
          activeDecorationGroups.insert(group)

          navigator.observeDecorationInteractions(inGroup: group) { [weak self] event in
            guard let self = self else { return }

            var payload: [String: Any] = [
              "decoration": event.decoration.json,
              "group": event.group
            ]

            if let rect = event.rect {
              payload["rect"] = [
                "x": rect.origin.x,
                "y": rect.origin.y,
                "width": rect.size.width,
                "height": rect.size.height
              ]
            }

            if let point = event.point {
              payload["point"] = [
                "x": point.x,
                "y": point.y
              ]
            }

            self.onDecorationActivated?(payload)
          }
        }
      }
    } catch {
      print("Failed to decode decorations: \(error)")
      return;
    }
  }

  func updateSelectionActions(_ selectionActions: NSString?) {
    // Selection actions must be set when creating the navigator
    // This is currently a no-op as the actions need to be passed during initialization
    // We store them so they can be used when the reader is recreated
    if let epubVC = readerViewController as? EPUBViewController {
      epubVC.updateSelectionActions(selectionActions as? String)
    }
  }

  override func removeFromSuperview() {
    readerViewController?.willMove(toParent: nil)
    readerViewController?.view.removeFromSuperview()
    readerViewController?.removeFromParent()

    // cancel all current subscriptions
    for subscription in subscriptions {
      subscription.cancel()
    }
    subscriptions = Set<AnyCancellable>()

    // clear active decoration groups
    activeDecorationGroups.removeAll()

    readerViewController = nil
    super.removeFromSuperview()
  }

  private func addViewControllerAsSubview(_ vc: ReaderViewController) {
    vc.publisher.sink(
      receiveValue: { locator in
        self.onLocationChange?(locator.json)
      }
    )
    .store(in: &self.subscriptions)

    readerViewController = vc

    // if the controller was just instantiated then apply any existing preferences
    if (preferences != nil) {
      self.updatePreferences(preferences)
    }

    // if the controller was just instantiated then apply any existing decorations
    if (decorations != nil) {
      self.updateDecorations(decorations)
    }

    // if the controller was just instantiated then apply any existing selection actions
    if (selectionActions != nil) {
      self.updateSelectionActions(selectionActions)
    }

    guard
      readerViewController != nil,
      superview?.frame != nil,
      self.viewController != nil,
      self.readerViewController != nil
    else {
      return
    }

    readerViewController!.view.frame = superview!.frame
    self.viewController!.addChild(readerViewController!)
    let rootView = self.readerViewController!.view!
    self.addSubview(rootView)
    self.viewController!.addChild(readerViewController!)
    self.readerViewController!.didMove(toParent: self.viewController!)

    // bind the reader's view to be constrained to its parent
    rootView.translatesAutoresizingMaskIntoConstraints = false
    rootView.topAnchor.constraint(equalTo: self.topAnchor).isActive = true
    rootView.bottomAnchor.constraint(equalTo: self.bottomAnchor).isActive = true
    rootView.leftAnchor.constraint(equalTo: self.leftAnchor).isActive = true
    rootView.rightAnchor.constraint(equalTo: self.rightAnchor).isActive = true

    Task { @MainActor [weak self] in
      guard let self = self else { return }

      // Always fetch table of contents and positions, regardless of callback existence
      // This matches Android behavior and ensures data is loaded consistently
      let tocResult = await vc.publication.tableOfContents()
      let positionsResult = await vc.publication.positions()

      var payload: [String: Any] = [:]

      // Add table of contents
      switch tocResult {
      case .success(let links):
        payload["tableOfContents"] = links.map { $0.json }
      case .failure(let error):
        self.log(.error, "Failed to fetch table of contents: \(error)")
        payload["tableOfContents"] = []
      }

      // Add positions
      switch positionsResult {
      case .success(let positions):
        payload["positions"] = positions.map { $0.json }
      case .failure(let error):
        self.log(.error, "Failed to fetch positions: \(error)")
        payload["positions"] = []
      }

      // Add metadata
      // Note: Swift Readium library's .json property already normalizes LocalizedStrings
      // to plain strings, so no additional normalization is needed here.
      // This matches the RWPM spec's shorthand format and is consistent with our
      // normalization on Android and Web platforms.
      payload["metadata"] = vc.publication.metadata.json

      // Always emit onPublicationReady event
      // React Native bridge handles null callbacks gracefully
      self.onPublicationReady?(payload)
    }
  }
}
