package com.margelo.nitro.reactnativereadiumlcp

import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import com.reactnativereadium.reader.ReaderContentProtectionRegistry
import com.reactnativereadium.utils.fileFromPath
import java.io.File
import org.readium.r2.lcp.LcpError
import org.readium.r2.lcp.LcpLicense as ReadiumLcpLicense
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
    handler: ((request: LcpAuthRequest) -> Promise<Promise<String?>>)?
  ) {
    authentication.handler = handler
  }

  override fun addPassphrase(passphrase: String, options: AddPassphraseOptions?): Promise<Unit> =
    Promise.async {
      // readium-lcp 3.3 keeps its passphrase store internal; answer from the handler instead.
      throw LcpBridgeException(LcpErrorCode.UNSUPPORTED, "addPassphrase is not available on Android.")
    }

  override fun forgetPassphrases(): Promise<Unit> = Promise.async {
    // readium-lcp 3.3 has no way to delete stored passphrases.
    throw LcpBridgeException(LcpErrorCode.UNSUPPORTED, "forgetPassphrases is not available on Android.")
  }

  // MARK: - Acquisition

  /** `url` sources are downloaded by the JS layer and arrive here as `json`. */
  override fun acquirePublication(
    source: LcplSource,
    options: AcquirePublicationOptions?,
  ): Promise<LcpAcquiredPublication> = Promise.async {
    val checkStatus = options?.checkStatus ?: true
    val progress = progressReporter(options?.onProgress)
    source.path?.let { path ->
      val lcpl = file(path)
      if (checkStatus) ensureLicenseIsUsable(lcpl)
      return@async requireService()
        .acquirePublication(lcpl, progress)
        .getOrElse { throw it.toException() }
        .toNitro()
    }

    val json = source.json
      ?: throw LcpBridgeException(LcpErrorCode.OPENFAILED, "The license source needs a path or JSON.")
    if (checkStatus) {
      // Validation reads a license from a file, so check a temporary copy.
      val lcpl = File.createTempFile("acquire-", ".lcpl")
      try {
        lcpl.writeText(json)
        ensureLicenseIsUsable(lcpl)
      } finally {
        lcpl.delete()
      }
    }
    requireService()
      .acquirePublication(json.toByteArray(), progress)
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
        .injectLicenseDocument(license, file(publicationPath))
        .getOrElse { throw it.toException() }
    }

  // MARK: - Licenses

  override fun getLicense(
    publicationPath: String,
    options: GetLicenseOptions?,
  ): Promise<LcpLicense> = Promise.async {
    val lcp = requireService()
    val asset = retrieveAsset(publicationPath)
    val allowUserInteraction = options?.allowUserInteraction ?: true
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
    options: RenewLoanOptions?,
  ): Promise<LcpLicense> = Promise.async {
    val license = retrieveLicense(publicationPath, allowUserInteraction = true)
    val listener = object : ReadiumLcpLicense.RenewListener {
      override suspend fun preferredEndDate(maximumDate: Instant?): Instant? =
        options?.preferredEndDate?.toKotlin()

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

  /** An absolute path or a `file://` URL, as on iOS. */
  private fun file(path: String): File =
    fileFromPath(path) ?: throw LcpBridgeException(LcpErrorCode.OPENFAILED, "Not a file path: $path")

  private fun requireService(): LcpService =
    service ?: throw LcpBridgeException(
      LcpErrorCode.NOTINITIALIZED,
      "Call LCP.initialize() before using the LCP service."
    )

  private suspend fun retrieveAsset(path: String): Asset {
    val retriever = assetRetriever ?: throw LcpBridgeException(LcpErrorCode.NOTINITIALIZED, "LCP is not initialized.")
    return retriever.retrieve(file(path))
      .getOrElse { throw LcpBridgeException(LcpErrorCode.OPENFAILED, it.message) }
  }

  private suspend fun retrieveLicense(path: String, allowUserInteraction: Boolean): ReadiumLcpLicense =
    requireService()
      .retrieveLicense(retrieveAsset(path), authentication, allowUserInteraction)
      .getOrElse { throw it.toException() }

  /** Throttles progress to whole percents, so a fast download doesn't flood the JS thread. */
  private fun progressReporter(onProgress: Func_void_double?): (Double) -> Unit {
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

/** Nitro's dates are java.time; Readium's are kotlin.time. */
private fun Instant.toJava(): java.time.Instant = java.time.Instant.ofEpochMilli(toEpochMilliseconds())

private fun java.time.Instant.toKotlin(): Instant = Instant.fromEpochMilliseconds(toEpochMilli())

private fun ReadiumLcpLicense.toNitro(): LcpLicense {
  val document = license
  return LcpLicense(
    id = document.id,
    provider = document.provider,
    issued = document.issued.toJava(),
    updated = document.updated.toJava(),
    start = document.rights.start?.toJava(),
    end = document.rights.end?.toJava(),
    status = status?.status?.let { LcpLicenseStatus.valueOf(it.name.uppercase()) },
    charactersToCopyLeft = charactersToCopyLeft.value?.toDouble(),
    pagesToPrintLeft = pagesToPrintLeft.value?.toDouble(),
    canRenewLoan = canRenewLoan,
    maxRenewDate = maxRenewDate?.toJava(),
    canReturnPublication = canReturnPublication,
    restriction = null,
  )
}

/** A license readium-lcp refused, described from its document: nothing can be done with it. */
private fun LicenseDocument.toNitro(restriction: LcpError): LcpLicense =
  LcpLicense(
    id = id,
    provider = provider,
    issued = issued.toJava(),
    updated = updated.toJava(),
    start = rights.start?.toJava(),
    end = rights.end?.toJava(),
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
