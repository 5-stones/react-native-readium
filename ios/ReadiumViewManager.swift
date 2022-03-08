import Foundation

@objc(ReadiumViewManager)
class ReadiumViewManager: RCTViewManager {
  override func view() -> (ReadiumView) {
    return ReadiumView()
  }
}
