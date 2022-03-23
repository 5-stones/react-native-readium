import Foundation

@objc(ReadiumViewManager)
class ReadiumViewManager: RCTViewManager {
  override func view() -> (ReadiumView) {
    let view = ReadiumView()
    return view
  }
}
