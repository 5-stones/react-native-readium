import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: RCTAppDelegate {
  override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
    self.moduleName = "ReadiumExample"
    self.dependencyProvider = RCTAppDependencyProvider()

    // Initial props tell JS which LCP client is in use, to show it in the LCP tab.
    var lcpClient = "none"

#if canImport(R2LCPClient)
    // Linked by readium_lcp_pods; react-native-readium-lcp adapts and registers it itself.
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
