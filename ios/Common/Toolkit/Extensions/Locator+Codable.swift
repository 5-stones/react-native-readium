import Foundation
import ReadiumShared

extension ReadiumShared.Locator: Codable {
  public init(from decoder: Decoder) throws {
    let json = try decoder.singleValueContainer().decode(String.self)
    try self.init(jsonString: json)!
  }

  public func encode(to encoder: Encoder) throws {
    var container = encoder.singleValueContainer()
    try container.encode(jsonString)
  }
}
