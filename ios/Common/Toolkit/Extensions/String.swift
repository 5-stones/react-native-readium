import Foundation

extension String {

  /// Returns this string after removing any character forbidden in a single path component.
  var sanitizedPathComponent: String {
    // See https://superuser.com/a/358861
    let invalidCharacters = CharacterSet(charactersIn: "\\/:*?\"<>|")
      .union(.newlines)
      .union(.illegalCharacters)
      .union(.controlCharacters)

    return components(separatedBy: invalidCharacters)
      .joined(separator: " ")
  }
}
