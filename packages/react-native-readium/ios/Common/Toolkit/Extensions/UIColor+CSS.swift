import UIKit

extension UIColor {
  /// Parse a CSS color string to UIColor.
  /// Supports: hex (#RRGGBB, #AARRGGBB), rgb(r,g,b), rgba(r,g,b,a), named colors
  static func fromCSS(_ colorString: String) -> UIColor? {
    let trimmed = colorString.trimmingCharacters(in: .whitespaces)

    // Handle hex colors
    if trimmed.hasPrefix("#") {
      let hex = String(trimmed.dropFirst())
      var int: UInt64 = 0

      Scanner(string: hex).scanHexInt64(&int)

      let a, r, g, b: UInt64
      switch hex.count {
      case 6: // RGB
        (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
      case 8: // ARGB
        (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
      default:
        return UIColor.yellow // Default fallback
      }

      return UIColor(
        red: CGFloat(r) / 255,
        green: CGFloat(g) / 255,
        blue: CGFloat(b) / 255,
        alpha: CGFloat(a) / 255
      )
    }

    // Handle rgb(r,g,b) and rgba(r,g,b,a)
    if trimmed.hasPrefix("rgb") {
      let components = trimmed
        .replacingOccurrences(of: "rgba(", with: "")
        .replacingOccurrences(of: "rgb(", with: "")
        .replacingOccurrences(of: ")", with: "")
        .split(separator: ",")
        .map { $0.trimmingCharacters(in: .whitespaces) }

      if components.count >= 3 {
        guard let r = Double(components[0]),
              let g = Double(components[1]),
              let b = Double(components[2]) else {
          return UIColor.yellow // Default fallback
        }

        let a = components.count == 4 ? (Double(components[3]) ?? 1.0) : 1.0

        return UIColor(
          red: CGFloat(r) / 255,
          green: CGFloat(g) / 255,
          blue: CGFloat(b) / 255,
          alpha: CGFloat(a)
        )
      }
    }

    // Try named colors
    switch trimmed.lowercased() {
    case "yellow": return UIColor.yellow
    case "red": return UIColor.red
    case "green": return UIColor.green
    case "blue": return UIColor.blue
    case "orange": return UIColor.orange
    case "purple": return UIColor.purple
    case "black": return UIColor.black
    case "white": return UIColor.white
    case "gray", "grey": return UIColor.gray
    default: return UIColor.yellow // Default fallback
    }
  }

  /// Convert a UIColor to a CSS hex string (#RRGGBB or #AARRGGBB if alpha < 1)
  var cssHex: String {
    var r: CGFloat = 0
    var g: CGFloat = 0
    var b: CGFloat = 0
    var a: CGFloat = 0

    getRed(&r, green: &g, blue: &b, alpha: &a)

    if a < 1.0 {
      return String(format: "#%02X%02X%02X%02X",
                    Int(a * 255),
                    Int(r * 255),
                    Int(g * 255),
                    Int(b * 255))
    } else {
      return String(format: "#%02X%02X%02X",
                    Int(r * 255),
                    Int(g * 255),
                    Int(b * 255))
    }
  }
}
