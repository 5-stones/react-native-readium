import UIKit
import ReadiumNavigator

class AssociatedColors {

    /// Get associated colors for a specific theme setting
    /// - parameter theme: The selected theme
    /// - Returns: A tuple with a main color and a text color
    static func getColors(for theme: Theme) -> (mainColor: UIColor, textColor: UIColor) {
        var mainColor, textColor: UIColor

        switch theme {
        case .sepia:
            mainColor = UIColor.init(red: 244/255, green: 236/255, blue: 216/255, alpha: 1) // #f4ecd8
            textColor = UIColor.init(red: 95/255, green: 75/255, blue: 50/255, alpha: 1)   // #5f4b32
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
