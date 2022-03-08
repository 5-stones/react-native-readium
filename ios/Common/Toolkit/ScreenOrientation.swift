import Foundation
import UIKit

enum ScreenOrientation: String {
  case landscape
  case portrait

  static var current: ScreenOrientation {
    let orientation = UIDevice.current.orientation
    return orientation.isLandscape ? .landscape : .portrait
  }

}
