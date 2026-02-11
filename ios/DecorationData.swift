import Foundation
import ReadiumShared
import ReadiumNavigator
import UIKit

/// Helper struct for deserializing decoration data from JSON
struct DecorationJSON: Codable {
  let id: String
  let locator: LocatorData
  let style: StyleData
  let extras: [String: AnyCodable]?

  enum CodingKeys: String, CodingKey {
    case id, locator, style, extras
  }

  func toDecoration() -> ReadiumNavigator.Decoration? {
    guard let readiumLocator = locator.toLocator() else {
      return nil
    }

    guard let decorationStyle = style.toDecorationStyle() else {
      return nil
    }

    var userInfo: [AnyHashable: AnyHashable] = [:]
    if let extras = extras {
      for (key, value) in extras {
        userInfo[key] = value.value as? AnyHashable
      }
    }

    return ReadiumNavigator.Decoration(
      id: id,
      locator: readiumLocator,
      style: decorationStyle,
      userInfo: userInfo
    )
  }
}

/// Helper struct for deserializing locator data
struct LocatorData: Codable {
  let href: String
  let type: String
  let title: String?
  let locations: LocationsData?
  let text: TextData?

  func toLocator() -> ReadiumShared.Locator? {
    // Convert href string to AnyURL
    guard let anyURL = AnyURL(legacyHREF: href) else {
      return nil
    }

    var locationsDict: [String: Any] = [:]
    if let locations = locations {
      if let progression = locations.progression {
        locationsDict["progression"] = progression
      }
      if let position = locations.position {
        locationsDict["position"] = position
      }
      if let totalProgression = locations.totalProgression {
        locationsDict["totalProgression"] = totalProgression
      }
    }

    // Try to create Locator.Locations from JSON, fall back to empty if it fails
    let locatorLocations: ReadiumShared.Locator.Locations
    do {
      locatorLocations = try ReadiumShared.Locator.Locations(json: locationsDict.isEmpty ? nil : locationsDict)
    } catch {
      locatorLocations = ReadiumShared.Locator.Locations()
    }

    // Convert text data to Locator.Text if present
    let locatorText: ReadiumShared.Locator.Text
    if let text = text {
      locatorText = ReadiumShared.Locator.Text(
        after: text.after,
        before: text.before,
        highlight: text.highlight
      )
    } else {
      locatorText = ReadiumShared.Locator.Text()
    }

    return ReadiumShared.Locator(
      href: anyURL,
      mediaType: MediaType(type) ?? .html,
      title: title,
      locations: locatorLocations,
      text: locatorText
    )
  }
}

/// Helper struct for deserializing locations
struct LocationsData: Codable {
  let progression: Double?
  let position: Int?
  let totalProgression: Double?
}

/// Helper struct for deserializing text locator data
struct TextData: Codable {
  let before: String?
  let highlight: String?
  let after: String?
}

/// Helper struct for deserializing decoration style
struct StyleData: Codable {
  let type: String
  let tint: String?
  let isActive: Bool?

  func toDecorationStyle() -> ReadiumNavigator.Decoration.Style? {
    switch type {
    case "highlight":
      let color = tint.flatMap { parseColor($0) }
      return .highlight(tint: color, isActive: isActive ?? false)

    case "underline":
      let color = tint.flatMap { parseColor($0) }
      return .underline(tint: color, isActive: isActive ?? false)

    // TODO: Add support for custom styles
    default:
      return nil
    }
  }

  /// Parse a CSS color string to UIColor
  /// Supports: hex (#RRGGBB, #AARRGGBB), rgb(r,g,b), rgba(r,g,b,a), named colors
  private func parseColor(_ colorString: String) -> UIColor? {
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
}

/// Helper for decoding arbitrary JSON values
struct AnyCodable: Codable {
  let value: Any

  init(_ value: Any) {
    self.value = value
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.singleValueContainer()

    if let bool = try? container.decode(Bool.self) {
      value = bool
    } else if let int = try? container.decode(Int.self) {
      value = int
    } else if let double = try? container.decode(Double.self) {
      value = double
    } else if let string = try? container.decode(String.self) {
      value = string
    } else if let array = try? container.decode([AnyCodable].self) {
      value = array.map { $0.value }
    } else if let dictionary = try? container.decode([String: AnyCodable].self) {
      value = dictionary.mapValues { $0.value }
    } else {
      value = NSNull()
    }
  }

  func encode(to encoder: Encoder) throws {
    var container = encoder.singleValueContainer()

    switch value {
    case let bool as Bool:
      try container.encode(bool)
    case let int as Int:
      try container.encode(int)
    case let double as Double:
      try container.encode(double)
    case let string as String:
      try container.encode(string)
    case let array as [Any]:
      try container.encode(array.map { AnyCodable($0) })
    case let dictionary as [String: Any]:
      try container.encode(dictionary.mapValues { AnyCodable($0) })
    default:
      try container.encodeNil()
    }
  }
}

/// Extension to convert Decoration to JSON for React Native
extension ReadiumNavigator.Decoration {
  var json: [String: Any] {
    var dict: [String: Any] = [
      "id": id,
      "locator": locator.json,
      "style": styleJson
    ]

    if !userInfo.isEmpty {
      // Convert userInfo to a serializable dictionary
      var extrasDict: [String: Any] = [:]
      for (key, value) in userInfo {
        if let stringKey = key as? String {
          extrasDict[stringKey] = value
        }
      }
      dict["extras"] = extrasDict
    }

    return dict
  }

  private var styleJson: [String: Any] {
    var result: [String: Any] = ["type": style.id.rawValue]

    // Extract config if it's a HighlightConfig
    if let highlightConfig = style.config as? ReadiumNavigator.Decoration.Style.HighlightConfig {
      if let tint = highlightConfig.tint {
        result["tint"] = colorToHex(tint)
      }
      result["isActive"] = highlightConfig.isActive
    }

    return result
  }

  private func colorToHex(_ color: UIColor) -> String {
    var r: CGFloat = 0
    var g: CGFloat = 0
    var b: CGFloat = 0
    var a: CGFloat = 0

    color.getRed(&r, green: &g, blue: &b, alpha: &a)

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
