#if DEBUG
import CommonCrypto
import Foundation
import ReadiumLCP

/// Opens licenses using LCP's open *basic profile*, which EDRLab's test server issues and the
/// end-to-end fixtures use, without EDRLab's liblcp.
///
/// Test-only: it checks no signature and no revocation list, and refuses every other profile,
/// so it can never open a production license. Debug builds use it when liblcp isn't linked.
final class BasicProfileLCPClient: ReadiumLCP.LCPClient {
  private static let basicProfile = "http://readium.org/lcp/basic-profile"

  private struct Context {
    let contentKey: Data
  }

  /// The parts of a license the basic profile needs.
  private struct License {
    let id: String
    let keyCheck: Data
    let encryptedContentKey: Data

    init(json: String) throws {
      guard
        let object = try JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any],
        let id = object["id"] as? String,
        let encryption = object["encryption"] as? [String: Any],
        encryption["profile"] as? String == BasicProfileLCPClient.basicProfile,
        let userKey = encryption["user_key"] as? [String: Any],
        let keyCheck = (userKey["key_check"] as? String).flatMap({ Data(base64Encoded: $0) }),
        let contentKey = encryption["content_key"] as? [String: Any],
        let encryptedContentKey = (contentKey["encrypted_value"] as? String).flatMap({ Data(base64Encoded: $0) })
      else {
        throw LCPClientError.contextInvalid
      }
      self.id = id
      self.keyCheck = keyCheck
      self.encryptedContentKey = encryptedContentKey
    }

    /// The key check is the license ID, encrypted with the user key.
    func isUnlocked(by userKey: Data) -> Bool {
      BasicProfileLCPClient.decrypt(keyCheck, key: userKey).flatMap(unpad) == Data(id.utf8)
    }
  }

  func findOneValidPassphrase(jsonLicense: String, hashedPassphrases: [LCPPassphraseHash]) -> LCPPassphraseHash? {
    guard let license = try? License(json: jsonLicense) else { return nil }
    return hashedPassphrases.first { hash in
      Data(hex: hash).map(license.isUnlocked(by:)) ?? false
    }
  }

  func createContext(jsonLicense: String, hashedPassphrase: LCPPassphraseHash, pemCrl: String) throws -> LCPClientContext {
    let license = try License(json: jsonLicense)
    guard let userKey = Data(hex: hashedPassphrase), license.isUnlocked(by: userKey) else {
      throw LCPClientError.userKeyCheckInvalid
    }
    guard let contentKey = Self.decrypt(license.encryptedContentKey, key: userKey).flatMap(unpad) else {
      throw LCPClientError.contentKeyDecryptError
    }
    return Context(contentKey: contentKey)
  }

  /// Readium strips the padding itself, so it is left on.
  func decrypt(data: Data, using context: LCPClientContext) -> Data? {
    guard let context = context as? Context else { return nil }
    return BasicProfileLCPClient.decrypt(data, key: context.contentKey)
  }

  func getSupportedLCPProfileURIs() -> [String] {
    [Self.basicProfile]
  }

  /// AES-256-CBC with the IV prepended, padding kept.
  fileprivate static func decrypt(_ data: Data, key: Data) -> Data? {
    let blockSize = kCCBlockSizeAES128
    guard key.count == kCCKeySizeAES256, data.count > blockSize, data.count % blockSize == 0 else {
      return nil
    }
    let iv = data.prefix(blockSize)
    let ciphertext = data.dropFirst(blockSize)
    var output = Data(count: ciphertext.count)
    var written = 0
    let status = output.withUnsafeMutableBytes { outputBytes in
      ciphertext.withUnsafeBytes { inputBytes in
        iv.withUnsafeBytes { ivBytes in
          key.withUnsafeBytes { keyBytes in
            CCCrypt(
              CCOperation(kCCDecrypt), CCAlgorithm(kCCAlgorithmAES), CCOptions(0),
              keyBytes.baseAddress, key.count, ivBytes.baseAddress,
              inputBytes.baseAddress, ciphertext.count,
              outputBytes.baseAddress, ciphertext.count, &written
            )
          }
        }
      }
    }
    guard status == kCCSuccess else { return nil }
    return output.prefix(written)
  }
}

/// LCP pads with random bytes, so only the last byte (the pad length) is meaningful.
private func unpad(_ data: Data) -> Data? {
  guard let length = data.last.map(Int.init), length > 0, length <= data.count else { return nil }
  return data.prefix(data.count - length)
}

private extension Data {
  init?(hex: String) {
    guard hex.count % 2 == 0 else { return nil }
    var bytes = [UInt8]()
    bytes.reserveCapacity(hex.count / 2)
    var index = hex.startIndex
    while index < hex.endIndex {
      let next = hex.index(index, offsetBy: 2)
      guard let byte = UInt8(hex[index ..< next], radix: 16) else { return nil }
      bytes.append(byte)
      index = next
    }
    self.init(bytes)
  }
}
#endif
