import Foundation
import ReadiumShared
import ReadiumNavigator
import UIKit

/// Helper struct for deserializing locator data
struct LocatorData: Codable {
  let href: String
  let type: String
  let title: String?
  let locations: LocationsData?
  let text: TextData?

  func toLocator() -> ReadiumShared.Locator? {
    let normalized = normalizeHref(href)

    guard let anyURL = AnyURL(string: normalized.resourcePath) else {
      return nil
    }

    var locationsDict: [String: Any] = [:]
    if let fragment = normalized.fragment {
      locationsDict["fragments"] = [fragment]
    }
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
      let color = tint.flatMap { UIColor.fromCSS($0) }
      return .highlight(tint: color, isActive: isActive ?? false)

    case "underline":
      let color = tint.flatMap { UIColor.fromCSS($0) }
      return .underline(tint: color, isActive: isActive ?? false)

    // TODO: Add support for custom styles
    default:
      return nil
    }
  }
}
