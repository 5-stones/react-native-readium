import Foundation
import NitroModules
import ReadiumLCP

/// Asks the JS authentication handler for a license's passphrase. Native dialogs are never
/// shown: every prompt is the app's own UI.
final class JSLCPAuthentication: LCPAuthenticating {
  typealias Handler = (LcpAuthRequest) -> Promise<Promise<String?>>

  private let lock = NSLock()
  private var storedHandler: Handler?

  /// Replaced from JS at any time, so it is read once per request.
  var handler: Handler? {
    get {
      lock.lock()
      defer { lock.unlock() }
      return storedHandler
    }
    set {
      lock.lock()
      defer { lock.unlock() }
      storedHandler = newValue
    }
  }

  @MainActor
  func retrievePassphrase(
    for license: LCPAuthenticatedLicense,
    reason: LCPAuthenticationReason,
    allowUserInteraction: Bool,
    sender: Any?
  ) async -> String? {
    // The handler is the user interaction, so it only runs when interaction is allowed.
    guard allowUserInteraction, let handler = handler else { return nil }

    let request = LcpAuthRequest(
      reason: reason == .passphraseNotFound ? .passphrasenotfound : .invalidpassphrase,
      licenseId: license.document.id,
      provider: license.provider,
      hint: license.hint,
      hintLink: license.hintLink.map(LcpLink.init(link:)),
      supportLinks: license.supportLinks.map(LcpLink.init(link:)),
      userId: license.user?.id,
      userName: license.user?.name,
      userEmail: license.user?.email
    )

    // The outer promise resolves with the JS function's return value, itself a promise.
    do {
      return try await handler(request).await().await()
    } catch {
      return nil
    }
  }
}

extension LcpLink {
  init(link: ReadiumLCP.Link) {
    self.init(href: link.href, type: link.type, title: link.title)
  }
}
