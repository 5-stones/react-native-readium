import UIKit

/// SO 33545910/1585121 - Heberti Almeida (inspired).
extension UIImage {
  class func imageWithTextView(textView: UITextView) -> UIImage {
    UIGraphicsBeginImageContextWithOptions(textView.bounds.size, false, 0.0)
    textView.layer.render(in: UIGraphicsGetCurrentContext()!)
    let image = UIGraphicsGetImageFromCurrentImageContext()
    UIGraphicsEndImageContext()
    return image!
  }
}
