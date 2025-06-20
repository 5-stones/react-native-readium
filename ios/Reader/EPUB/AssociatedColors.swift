import UIKit
import R2Navigator

class AssociatedColors {

    /// Get associated colors for a specific theme setting
    /// - parameter theme: The selected theme
    /// - Returns: A tuple with a main color and a text color
    static func getColors(for theme: Theme) -> (mainColor: UIColor, textColor: UIColor) {
        var mainColor, textColor: UIColor

        switch theme {
        case .sepia:
            mainColor = UIColor.init(red: 250/255, green: 244/255, blue: 232/255, alpha: 1)
            textColor = UIColor.init(red: 18/255, green: 18/255, blue: 18/255, alpha: 1)
        case .dark:
            mainColor = UIColor.black
            textColor = UIColor.init(red: 254/255, green: 254/255, blue: 254/255, alpha: 1)
        default:
            mainColor = UIColor.white
            textColor = UIColor.black
        }

        return (mainColor, textColor)
    }

}
