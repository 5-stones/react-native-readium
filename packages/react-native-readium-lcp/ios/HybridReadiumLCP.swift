import Foundation
import NitroModules
import ReadiumLCP
import ReadiumShared

class HybridReadiumLCP: HybridReadiumLCPSpec {

  private let authentication = JSLCPAuthentication()

  private struct Services {
    let lcp: LCPService
    let passphrases: LCPKeychainPassphraseRepository
    let assetRetriever: AssetRetriever
  }

  private let lock = NSLock()
  private var storedServices: Services?

  private var services: Services? {
    get {
      lock.lock()
      defer { lock.unlock() }
      return storedServices
    }
    set {
      lock.lock()
      defer { lock.unlock() }
      storedServices = newValue
    }
  }

  let capabilities = LcpCapabilities(addPassphrase: true, forgetPassphrases: true)

  // MARK: - Setup

  func initialize(options: LcpInitOptions?) throws -> Promise<Bool> {
    Promise.async { [self] in
      if services != nil { return true }

      // Null when the app neither links liblcp nor registers a client.
      guard let client = LCPClientRegistry.client else { return false }

      let httpClient = DefaultHTTPClient()
      let assetRetriever = AssetRetriever(httpClient: httpClient)
      let passphrases = LCPKeychainPassphraseRepository()
      let lcp = LCPService(
        client: client,
        licenseRepository: LCPKeychainLicenseRepository(),
        passphraseRepository: passphrases,
        assetRetriever: assetRetriever,
        httpClient: httpClient,
        deviceName: options?.deviceName,
        deviceId: options?.deviceId
      )

      // Replaces the protection of an earlier JS runtime, whose handler is gone.
      guard CoreProtectionRegistry.register(lcp.contentProtection(with: authentication)) else {
        throw LCPBridgeError(
          code: .registryunavailable,
          message: "react-native-readium's content protection registry was not found."
        )
      }

      services = Services(lcp: lcp, passphrases: passphrases, assetRetriever: assetRetriever)
      return true
    }
  }

  func setAuthenticationHandler(
    handler: ((LcpAuthRequest) -> Promise<Promise<String?>>)?
  ) throws {
    authentication.handler = handler
  }

  func addPassphrase(passphrase: String, options: AddPassphraseOptions?) throws -> Promise<Void> {
    Promise.async { [self] in
      do {
        try await requireServices().lcp.addPassphrase(passphrase, isHashed: options?.isHashed ?? false)
      } catch let error as LCPBridgeError {
        throw error
      } catch {
        throw LCPBridgeError(code: .addpassphrasefailed, message: String(describing: error))
      }
    }
  }

  func forgetPassphrases() throws -> Promise<Void> {
    Promise.async { [self] in
      do {
        try await requireServices().passphrases.clear()
      } catch let error as LCPBridgeError {
        throw error
      } catch {
        throw LCPBridgeError(code: .forgetpassphrasesfailed, message: String(describing: error))
      }
    }
  }

  // MARK: - Acquisition

  /// `url` sources are downloaded by the JS layer and arrive here as `json`.
  func acquirePublication(
    source: LcplSource,
    options: AcquirePublicationOptions?
  ) throws -> Promise<LcpAcquiredPublication> {
    Promise.async { [self] in
      let checkStatus = options?.checkStatus ?? true
      if let path = source.path {
        let lcpl = try fileURL(path)
        if checkStatus {
          try await ensureLicenseIsUsable(lcpl)
        }
        return try await acquire(from: .file(lcpl), onProgress: options?.onProgress)
      }

      guard let json = source.json else {
        throw LCPBridgeError(code: .openfailed, message: "The license source needs a path or JSON.")
      }
      let data = Data(json.utf8)
      if checkStatus {
        // Validation reads a license from a file, so check a temporary copy.
        let url = FileManager.default.temporaryDirectory
          .appendingPathComponent("acquire-\(UUID().uuidString).lcpl")
        try data.write(to: url)
        defer { try? FileManager.default.removeItem(at: url) }
        try await ensureLicenseIsUsable(try fileURL(url.path))
      }
      return try await acquire(from: .data(data), onProgress: options?.onProgress)
    }
  }

  /// Readium's acquisition downloads without asking the license server, so a revoked license
  /// would only fail once the book is opened. Validating the LCPL first checks its status, which
  /// comes before the passphrase, so the user isn't asked anything.
  private func ensureLicenseIsUsable(_ lcpl: FileURL) async throws {
    let services = try requireServices()
    let asset: Asset
    switch await services.assetRetriever.retrieve(url: lcpl) {
    case .success(let retrieved):
      asset = retrieved
    case .failure(let error):
      throw LCPBridgeError(code: .notalicensedocument, message: String(describing: error))
    }

    let license = try await services.lcp
      .retrieveLicense(
        from: asset,
        authentication: authentication,
        allowUserInteraction: false,
        sender: nil
      )
      .get(orThrow: \.bridged)

    // A missing passphrase means the status checks passed: it's asked for when reading.
    if let error = license.error, case .licenseStatus = error {
      throw error.bridged
    }
  }

  func injectLicense(licenseJSON: String, publicationPath: String) throws -> Promise<Void> {
    Promise.async { [self] in
      let license: LicenseDocument
      do {
        license = try LicenseDocument(data: Data(licenseJSON.utf8))
      } catch {
        throw LCPBridgeError(code: .parsing, message: String(describing: error))
      }
      try await requireServices().lcp
        .injectLicenseDocument(license, in: fileURL(publicationPath))
        .get(orThrow: \.bridged)
    }
  }

  // MARK: - Licenses

  func getLicense(publicationPath: String, options: GetLicenseOptions?) throws -> Promise<LcpLicense> {
    Promise.async { [self] in
      try await retrieveLicense(
        publicationPath,
        allowUserInteraction: options?.allowUserInteraction ?? true
      ).info()
    }
  }

  func renewLoan(publicationPath: String, options: RenewLoanOptions?) throws -> Promise<LcpLicense> {
    Promise.async { [self] in
      let license = try await retrieveLicense(publicationPath, allowUserInteraction: true)
      let delegate = BridgeRenewDelegate(preferredEndDate: options?.preferredEndDate)
      try await license.renewLoan(with: delegate).get(orThrow: \.bridged)
      return await license.info()
    }
  }

  func returnPublication(publicationPath: String) throws -> Promise<Void> {
    Promise.async { [self] in
      try await retrieveLicense(publicationPath, allowUserInteraction: true)
        .returnPublication()
        .get(orThrow: \.bridged)
    }
  }

  // MARK: - Helpers

  private func requireServices() throws -> Services {
    guard let services = services else { throw LCPBridgeError.notInitialized }
    return services
  }

  private func fileURL(_ path: String) throws -> FileURL {
    let url = path.hasPrefix("file://") ? URL(string: path) : URL(fileURLWithPath: path)
    guard let fileURL = url.flatMap(FileURL.init(url:)) else {
      throw LCPBridgeError(code: .openfailed, message: "Not a file path: \(path)")
    }
    return fileURL
  }

  private func acquire(
    from source: LicenseDocumentSource,
    onProgress: ((Double) -> Void)?
  ) async throws -> LcpAcquiredPublication {
    var lastPercent = -1
    let acquired = try await requireServices().lcp
      .acquirePublication(from: source) { progress in
        // Whole percents only, so a fast download doesn't flood the JS thread.
        guard let onProgress = onProgress, case .percent(let fraction) = progress else { return }
        let percent = Int(fraction * 100)
        guard percent != lastPercent else { return }
        lastPercent = percent
        onProgress(Double(fraction))
      }
      .get(orThrow: \.bridged)

    return LcpAcquiredPublication(
      localPath: acquired.localURL.url.path,
      suggestedFilename: acquired.suggestedFilename,
      licenseId: acquired.licenseDocument.id
    )
  }

  private func retrieveLicense(_ path: String, allowUserInteraction: Bool) async throws -> LCPLicense {
    let services = try requireServices()
    let asset: Asset
    switch await services.assetRetriever.retrieve(url: try fileURL(path)) {
    case .success(let retrieved):
      asset = retrieved
    case .failure(let error):
      throw LCPBridgeError(code: .openfailed, message: String(describing: error))
    }
    return try await services.lcp
      .retrieveLicense(
        from: asset,
        authentication: authentication,
        allowUserInteraction: allowUserInteraction,
        sender: nil
      )
      .get(orThrow: \.bridged)
  }
}

/// Renews programmatically; a server that requires a web page fails the renewal instead.
private struct BridgeRenewDelegate: LCPRenewDelegate {
  let preferredEndDate: Date?

  func preferredEndDate(maximum: Date?) async throws -> Date? {
    preferredEndDate
  }

  func presentWebPage(url: HTTPURL) async throws {
    throw LCPBridgeError(
      code: .renewfailed,
      message: "This license can only be renewed through its web page: \(url.string)"
    )
  }
}

private extension LCPLicense {
  func info() async -> LcpLicense {
    let document = license
    return LcpLicense(
      id: document.id,
      provider: document.provider,
      issued: document.issued,
      updated: document.updated,
      start: document.rights.start,
      end: document.rights.end,
      status: status.flatMap { LcpLicenseStatus(fromString: $0.status.rawValue) },
      charactersToCopyLeft: await charactersToCopyLeft().map(Double.init),
      pagesToPrintLeft: await pagesToPrintLeft().map(Double.init),
      canRenewLoan: canRenewLoan,
      maxRenewDate: maxRenewDate,
      canReturnPublication: canReturnPublication,
      restriction: error?.code
    )
  }
}

private extension Result {
  func get<E: Error>(orThrow transform: (Failure) -> E) throws -> Success {
    switch self {
    case .success(let value): return value
    case .failure(let error): throw transform(error)
    }
  }
}
