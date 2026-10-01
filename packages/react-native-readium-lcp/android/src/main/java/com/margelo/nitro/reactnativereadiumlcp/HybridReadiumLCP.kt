package com.margelo.nitro.reactnativereadiumlcp

import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import com.reactnativereadium.reader.ReaderContentProtectionRegistry
import java.io.File
import org.readium.r2.lcp.LcpError
import org.readium.r2.lcp.LcpLicense
import org.readium.r2.lcp.LcpService
import org.readium.r2.lcp.license.model.LicenseDocument
import kotlin.time.Instant
import org.readium.r2.shared.util.Url
import org.readium.r2.shared.util.asset.Asset
import org.readium.r2.shared.util.asset.AssetRetriever
import org.readium.r2.shared.util.asset.ContainerAsset
import org.readium.r2.shared.util.getOrElse
import org.readium.r2.shared.util.http.DefaultHttpClient

class HybridReadiumLCP : HybridReadiumLCPSpec() {

  private val authentication = JsLcpAuthentication()

  @Volatile
  private var service: LcpService? = null

  @Volatile
  private var assetRetriever: AssetRetriever? = null

  // readium-lcp 3.3 keeps its passphrase store internal.
  override val capabilities = LcpCapabilities(addPassphrase = false, forgetPassphrases = false)

  // MARK: - Setup

  override fun initialize(options: LcpInitOptions?): Promise<Boolean> = Promise.async {
    if (service != null) return@async true

    val context = NitroModules.applicationContext ?: return@async false
    val retriever = AssetRetriever(context.contentResolver, DefaultHttpClient())
    // Null when the liblcp AAR isn't on the classpath.
    val lcp = LcpService(
      context = context,
      assetRetriever = retriever,
      deviceName = options?.deviceName,
      deviceId = options?.deviceId,
    ) ?: return@async false

    assetRetriever = retriever
    service = lcp
    // Replaces the protection of an earlier JS runtime, whose handler is gone.
    ReaderContentProtectionRegistry.register(lcp.contentProtection(authentication))
    true
  }

  override fun setAuthenticationHandler(
    handler: (request: LcpAuthRequest) -> Promise<Promise<String?>>
  ) {
    authentication.handler = handler
  }

  override fun clearAuthenticationHandler() {
    authentication.handler = null
  }

  override fun addPassphrase(passphrase: String, isHashed: Boolean): Promise<Unit> =
    Promise.async {
      // readium-lcp 3.3 keeps its passphrase store internal; answer from the handler instead.
      throw LcpBridgeException(LcpErrorCode.UNSUPPORTED, "addPassphrase is not available on Android.")
    }

  override fun forgetPassphrases(): Promise<Unit> = Promise.async {
    // readium-lcp 3.3 has no way to delete stored passphrases.
    throw LcpBridgeException(LcpErrorCode.UNSUPPORTED, "forgetPassphrases is not available on Android.")
  }

  // MARK: - Acquisition

  override fun acquirePublicationFromFile(
    lcplPath: String,
    checkStatus: Boolean,
    onProgress: ((fraction: Double) -> Unit)?,
  ): Promise<LcpAcquiredPublication> = Promise.async {
    val lcpl = File(lcplPath)
    if (checkStatus) ensureLicenseIsUsable(lcpl)
    requireService()
      .acquirePublication(lcpl, progressReporter(onProgress))
      .getOrElse { throw it.toException() }
      .toNitro()
  }

  override fun acquirePublicationFromJSON(
    lcplJSON: String,
    checkStatus: Boolean,
    onProgress: ((fraction: Double) -> Unit)?,
  ): Promise<LcpAcquiredPublication> = Promise.async {
    if (checkStatus) {
      // Validation reads a license from a file, so check a temporary copy.
      val lcpl = File.createTempFile("acquire-", ".lcpl")
      try {
        lcpl.writeText(lcplJSON)
        ensureLicenseIsUsable(lcpl)
      } finally {
        lcpl.delete()
      }
    }
    requireService()
      .acquirePublication(lcplJSON.toByteArray(), progressReporter(onProgress))
      .getOrElse { throw it.toException() }
      .toNitro()
  }

  /**
   * Readium's acquisition downloads without asking the license server, so a revoked license
   * would only fail once the book is opened. Validating the LCPL first checks its status, which
   * comes before the passphrase, so the user isn't asked anything.
   */
  private suspend fun ensureLicenseIsUsable(lcpl: File) {
    val lcp = requireService()
    val retriever = assetRetriever ?: throw LcpBridgeException(LcpErrorCode.NOTINITIALIZED, "LCP is not initialized.")
    val asset = retriever.retrieve(lcpl)
      .getOrElse { throw LcpBridgeException(LcpErrorCode.NOTALICENSEDOCUMENT, it.message) }
    lcp.retrieveLicense(asset, authentication, allowUserInteraction = false)
      .onFailure { error ->
        // A missing passphrase means the status checks passed: it's asked for when reading.
        if (error !is LcpError.MissingPassphrase) throw error.toException()
      }
  }

  override fun injectLicense(licenseJSON: String, publicationPath: String): Promise<Unit> =
    Promise.async {
      val license = LicenseDocument.fromBytes(licenseJSON.toByteArray())
        .getOrElse { throw it.toException() }
      requireService()
        .injectLicenseDocument(license, File(publicationPath))
        .getOrElse { throw it.toException() }
    }

  // MARK: - Licenses

  override fun getLicense(
    publicationPath: String,
    allowUserInteraction: Boolean,
  ): Promise<LcpLicenseInfo> = Promise.async {
    val lcp = requireService()
    val asset = retrieveAsset(publicationPath)
    val result = lcp.retrieveLicense(asset, authentication, allowUserInteraction)
    result.getOrNull()?.let { return@async it.toNitro() }

    // Unlike Swift, readium-lcp fails outright when the license can't be used, instead of
    // returning it with an error. Describe it from its document, with the reason it can't.
    val error = result.failureOrNull()!!
    val document = (asset as? ContainerAsset)
      ?.takeIf { error is LcpError.LicenseStatus || error is LcpError.MissingPassphrase }
      ?.let { lcp.retrieveLicenseDocument(it).getOrNull() }
      ?: throw error.toException()
    document.toNitro(restriction = error)
  }

  override fun renewLoan(
    publicationPath: String,
    preferredEndDate: Double?,
  ): Promise<LcpLicenseInfo> = Promise.async {
    val license = retrieveLicense(publicationPath, allowUserInteraction = true)
    val listener = object : LcpLicense.RenewListener {
      override suspend fun preferredEndDate(maximumDate: Instant?): Instant? =
        preferredEndDate?.let { Instant.fromEpochMilliseconds(it.toLong()) }

      override suspend fun openWebPage(url: Url) {
        throw LcpBridgeException(
          LcpErrorCode.RENEWFAILED,
          "This license can only be renewed through its web page: $url"
        )
      }
    }
    license.renewLoan(listener).getOrElse { throw it.toException() }
    license.toNitro()
  }

  override fun returnPublication(publicationPath: String): Promise<Unit> = Promise.async {
    retrieveLicense(publicationPath, allowUserInteraction = true)
      .returnPublication()
      .getOrElse { throw it.toException() }
  }

  // MARK: - Helpers

  private fun requireService(): LcpService =
    service ?: throw LcpBridgeException(
      LcpErrorCode.NOTINITIALIZED,
      "Call LCP.initialize() before using the LCP service."
    )

  private suspend fun retrieveAsset(path: String): Asset {
    val retriever = assetRetriever ?: throw LcpBridgeException(LcpErrorCode.NOTINITIALIZED, "LCP is not initialized.")
    return retriever.retrieve(File(path))
      .getOrElse { throw LcpBridgeException(LcpErrorCode.OPENFAILED, it.message) }
  }

  private suspend fun retrieveLicense(path: String, allowUserInteraction: Boolean): LcpLicense =
    requireService()
      .retrieveLicense(retrieveAsset(path), authentication, allowUserInteraction)
      .getOrElse { throw it.toException() }

  /** Throttles progress to whole percents, so a fast download doesn't flood the JS thread. */
  private fun progressReporter(onProgress: ((Double) -> Unit)?): (Double) -> Unit {
    if (onProgress == null) return {}
    var lastPercent = -1
    return { fraction ->
      val percent = (fraction * 100).toInt()
      if (percent != lastPercent) {
        lastPercent = percent
        onProgress(fraction)
      }
    }
  }
}

private fun LcpService.AcquiredPublication.toNitro(): LcpAcquiredPublication =
  LcpAcquiredPublication(
    localPath = localFile.absolutePath,
    suggestedFilename = suggestedFilename,
    licenseId = licenseDocument.id,
  )

private fun LcpLicense.toNitro(): LcpLicenseInfo {
  val document = license
  return LcpLicenseInfo(
    id = document.id,
    provider = document.provider,
    issued = document.issued.toEpochMilliseconds().toDouble(),
    updated = document.updated.toEpochMilliseconds().toDouble(),
    start = document.rights.start?.toEpochMilliseconds()?.toDouble(),
    end = document.rights.end?.toEpochMilliseconds()?.toDouble(),
    status = status?.status?.let { LcpLicenseStatus.valueOf(it.name.uppercase()) },
    charactersToCopyLeft = charactersToCopyLeft.value?.toDouble(),
    pagesToPrintLeft = pagesToPrintLeft.value?.toDouble(),
    canRenewLoan = canRenewLoan,
    maxRenewDate = maxRenewDate?.toEpochMilliseconds()?.toDouble(),
    canReturnPublication = canReturnPublication,
    restriction = null,
  )
}

/** A license readium-lcp refused, described from its document: nothing can be done with it. */
private fun LicenseDocument.toNitro(restriction: LcpError): LcpLicenseInfo =
  LcpLicenseInfo(
    id = id,
    provider = provider,
    issued = issued.toEpochMilliseconds().toDouble(),
    updated = updated.toEpochMilliseconds().toDouble(),
    start = rights.start?.toEpochMilliseconds()?.toDouble(),
    end = rights.end?.toEpochMilliseconds()?.toDouble(),
    status = when (restriction) {
      is LcpError.LicenseStatus.Revoked -> LcpLicenseStatus.REVOKED
      is LcpError.LicenseStatus.Returned -> LcpLicenseStatus.RETURNED
      is LcpError.LicenseStatus.Cancelled -> LcpLicenseStatus.CANCELLED
      is LcpError.LicenseStatus.Expired -> LcpLicenseStatus.EXPIRED
      else -> null
    },
    // As on iOS, a license that can't be used has no rights left.
    charactersToCopyLeft = 0.0,
    pagesToPrintLeft = 0.0,
    canRenewLoan = false,
    maxRenewDate = null,
    canReturnPublication = false,
    restriction = restriction.code,
  )
