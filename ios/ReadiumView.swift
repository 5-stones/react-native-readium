import Combine
import Foundation
import R2Shared
import R2Streamer
import UIKit
import R2Navigator


class ReadiumView : UIView, Loggable {
  var readerService: ReaderService = ReaderService()
  var readerViewController: ReaderViewController?
  private var subscriptions = Set<AnyCancellable>()

  @objc var file: NSDictionary? = nil {
    didSet {
      if let initialLocation = file?["initialLocation"] as? NSDictionary {
        location = initialLocation
      }

      if let url = file?["url"] as? String {
        self.loadBook(url: url)
      }
    }
  }
  @objc var location: NSDictionary? = nil {
    didSet {
      self.updateLocation()
    }
  }
  @objc var settings: NSDictionary? = nil {
    didSet {
      self.updateUserSettings(settings)
    }
  }
  @objc var onLocationChange: RCTDirectEventBlock?

  func loadBook(url: String) {
    guard let rootViewController = UIApplication.shared.delegate?.window??.rootViewController else { return }
    let bookId: String = "http://www.feedbooks.com/book/54/moby-dick"
    let locator: Locator? = self.getLocator()

    self.readerService.buildViewController(
      url: url,
      bookId: bookId,
      locator: locator,
      sender: rootViewController,
      completion: { vc in
        self.addViewControllerAsSubview(vc)
      }
    )
  }

  func getLocator() -> Locator? {
    if (location != nil) {
      return try? Locator(json: location)
    } else {
      return nil
    }
  }

  func updateLocation() {
    guard let navigator = readerViewController?.navigator else {
      return;
    }
    guard let locator = self.getLocator() else {
      return;
    }

    let cur = navigator.currentLocation
    if (cur != nil && locator.hashValue == cur?.hashValue) {
      return;
    }

    navigator.go(
      to: locator,
      animated: true
    )
  }

  func updateUserSettings(_ settings: NSDictionary?) {

    if (readerViewController == nil) {
      // defer setting update as view isn't initialized yet
      return;
    }

    if let navigator = readerViewController!.navigator as? EPUBNavigatorViewController {
      let userProperties = navigator.userSettings.userProperties

      for property in userProperties.properties {
        let key = property.reference
        let value = settings?[property.reference]

        if (value == nil) {
          continue
        }

        if let e = property as? Enumerable {
          e.index = value as! Int
        } else if let i = property as? Incrementable {
          i.value = value as! Float
        } else if let s = property as? Switchable {
          s.on = value as! Bool
        }
      }

      navigator.updateUserSettingStyle()
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

    readerViewController = nil
    super.removeFromSuperview()
  }

  private func addViewControllerAsSubview(_ vc: ReaderViewController) {
    vc.publisher.sink(
      receiveValue: { locator in
        if (self.onLocationChange != nil) {
          self.onLocationChange!(locator.json)
        }
      }
    )
    .store(in: &self.subscriptions)

    readerViewController = vc

    // if the controller was just instantiated then apply any existing settings
    if (settings != nil) {
      self.updateUserSettings(settings)
    }

    let rootViewController = UIApplication.shared.delegate?.window??.rootViewController
    rootViewController?.addChild(readerViewController!)
    readerViewController!.view.frame = self.superview!.frame
    self.addSubview(self.readerViewController!.view!)
    self.readerViewController!.didMove(toParent: rootViewController)
  }
}
