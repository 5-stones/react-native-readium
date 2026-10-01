import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
#if canImport(R2LCPClient)
import R2LCPClient
#endif
#if canImport(R2LCPClient) || DEBUG
import ReadiumLCP
#endif

@main
class AppDelegate: RCTAppDelegate {
  override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
    self.moduleName = "ReadiumExample"
    self.dependencyProvider = RCTAppDependencyProvider()

    // Initial props tell JS which LCP client is in use, to show it in the LCP tab.
    var lcpClient = "none"

#if canImport(R2LCPClient)
    // Hands react-native-readium-lcp the liblcp it can't link itself.
    RNRLCPClientRegistry.registerClient(LiblcpClient())
    lcpClient = "liblcp"
#elseif DEBUG
    // Without liblcp, debug builds open LCP's basic-profile test books (passphrase "test").
    // Launch with `-ReadiumLCPTestClient NO` to see the app without LCP.
    let defaults = UserDefaults.standard
    if defaults.object(forKey: "ReadiumLCPTestClient") == nil || defaults.bool(forKey: "ReadiumLCPTestClient") {
      RNRLCPClientRegistry.registerClient(BasicProfileLCPClient())
      lcpClient = "basic-profile"
    }
#endif
    self.initialProps = ["lcpClient": lcpClient]

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

#if canImport(R2LCPClient)
/// Facade to EDRLab's proprietary R2LCPClient, as the Readium LCP guide describes.
final class LiblcpClient: ReadiumLCP.LCPClient {
  func createContext(jsonLicense: String, hashedPassphrase: LCPPassphraseHash, pemCrl: String) throws -> LCPClientContext {
    try R2LCPClient.createContext(jsonLicense: jsonLicense, hashedPassphrase: hashedPassphrase, pemCrl: pemCrl)
  }

  func decrypt(data: Data, using context: LCPClientContext) -> Data? {
    R2LCPClient.decrypt(data: data, using: context as! DRMContext)
  }

  func findOneValidPassphrase(jsonLicense: String, hashedPassphrases: [LCPPassphraseHash]) -> LCPPassphraseHash? {
    R2LCPClient.findOneValidPassphrase(jsonLicense: jsonLicense, hashedPassphrases: hashedPassphrases)
  }
}
#endif
