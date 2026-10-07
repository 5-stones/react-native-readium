#if canImport(R2LCPClient)
import Foundation
import R2LCPClient
import ReadiumLCP
import Security

/// Adapts EDRLab's proprietary R2LCPClient (liblcp) to Readium, as the Readium LCP guide
/// describes. Compiled only when the app links liblcp with `readium_lcp_pods`, which makes this
/// pod depend on it; `LCPClientRegistry` then uses it unless the app registers its own client.
final class LiblcpClient: LCPClient {
  func createContext(jsonLicense: String, hashedPassphrase: LCPPassphraseHash, pemCrl: String) throws -> LCPClientContext {
    // liblcp aborts the app on a provider certificate it can't parse (an uncaught C++ exception
    // Swift can't catch), so reject those as the integrity failure liblcp would report.
    guard Self.hasParsableCertificate(jsonLicense) else {
      throw LCPError.licenseIntegrity(.certificateSignatureInvalid)
    }
    return try R2LCPClient.createContext(jsonLicense: jsonLicense, hashedPassphrase: hashedPassphrase, pemCrl: pemCrl)
  }

  func decrypt(data: Data, using context: LCPClientContext) -> Data? {
    R2LCPClient.decrypt(data: data, using: context as! DRMContext)
  }

  func findOneValidPassphrase(jsonLicense: String, hashedPassphrases: [LCPPassphraseHash]) -> LCPPassphraseHash? {
    R2LCPClient.findOneValidPassphrase(jsonLicense: jsonLicense, hashedPassphrases: hashedPassphrases)
  }

  /// Whether the license's `signature.certificate` is a base64 DER certificate.
  private static func hasParsableCertificate(_ jsonLicense: String) -> Bool {
    guard
      let json = try? JSONSerialization.jsonObject(with: Data(jsonLicense.utf8)) as? [String: Any],
      let signature = json["signature"] as? [String: Any],
      let certificate = (signature["certificate"] as? String).flatMap({ Data(base64Encoded: $0) })
    else { return false }
    return SecCertificateCreateWithData(nil, certificate as CFData) != nil
  }
}
#endif
