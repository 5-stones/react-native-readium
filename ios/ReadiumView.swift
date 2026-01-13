import Combine
import Foundation
import ReadiumShared
import ReadiumStreamer
import UIKit
import ReadiumNavigator


class ReadiumView : UIView, Loggable {
  var readerService: ReaderService = ReaderService()
  var readerViewController: ReaderViewController?
  var viewController: UIViewController? {
    let viewController = sequence(first: self, next: { $0.next }).first(where: { $0 is UIViewController })
    return viewController as? UIViewController
  }
  private var subscriptions = Set<AnyCancellable>()

  @objc var file: NSDictionary? = nil {
    didSet {
      let initialLocation = file?["initialLocation"] as? NSDictionary
      if let url = file?["url"] as? String {
        self.loadBook(url: url, location: initialLocation)
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
  @objc var hidePageNumbers: Bool = false {
    didSet {
      self.updatePageNumberVisibility(hidePageNumbers)
    }
  }
  @objc var onLocationChange: RCTDirectEventBlock?
  @objc var onTableOfContents: RCTDirectEventBlock?

  func loadBook(
    url: String,
    location: NSDictionary?
  ) {
    guard let rootViewController = UIApplication.shared.delegate?.window??.rootViewController else { return }

    self.readerService.buildViewController(
      url: url,
      bookId: url,
      location: location,
      sender: rootViewController,
      completion: { vc in
        self.addViewControllerAsSubview(vc)
        self.location = location
      }
    )
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

      if let color = preferences.textColor {
        readerViewController?.setPositionLabelColors(textColor: color.uiColor)
      } else if let theme = preferences.theme {
        readerViewController?.setPositionLabelColors(textColor: theme.contentColor.uiColor)
      } else {
        readerViewController?.setPositionLabelColors(textColor: .darkGray)
      }
    } catch {
      print(error)
      print("TODO: handle error. Skipping preferences due to thrown exception")
      return;
    }
  }

  func updatePageNumberVisibility(_ hide: Bool) {
    guard let vc = readerViewController else { return }

    vc.setPositionLabelHidden(hide)
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

    readerViewController?.loadViewIfNeeded()
    
    // if the controller was just instantiated then apply any existing preferences
    if (preferences != nil) {
      self.updatePreferences(preferences)
    }

    self.updatePageNumberVisibility(hidePageNumbers)

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

      let tocResult = await vc.publication.tableOfContents()
      switch tocResult {
      case .success(let links):
        self.onTableOfContents?([
          "toc": links.map { $0.json }
        ])
      case .failure(let error):
        self.log(.error, "Failed to fetch table of contents: \(error)")
      }
    }
  }
}
