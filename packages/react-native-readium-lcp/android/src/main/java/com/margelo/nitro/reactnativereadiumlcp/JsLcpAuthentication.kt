package com.margelo.nitro.reactnativereadiumlcp

import com.margelo.nitro.core.Promise
import org.readium.r2.lcp.LcpAuthenticating

/**
 * Asks the JS authentication handler for a license's passphrase. Native dialogs are never
 * shown: every prompt is the app's own UI.
 */
internal class JsLcpAuthentication : LcpAuthenticating {

  /** Replaced from JS at any time, so it is read once per request. */
  @Volatile
  var handler: ((request: LcpAuthRequest) -> Promise<Promise<String?>>)? = null

  override suspend fun retrievePassphrase(
    license: LcpAuthenticating.AuthenticatedLicense,
    reason: LcpAuthenticating.AuthenticationReason,
    allowUserInteraction: Boolean,
  ): String? {
    // The handler is the user interaction, so it only runs when interaction is allowed.
    if (!allowUserInteraction) return null
    val handler = handler ?: return null

    val document = license.document
    val request = LcpAuthRequest(
      reason = when (reason) {
        LcpAuthenticating.AuthenticationReason.PassphraseNotFound -> LcpAuthReason.PASSPHRASENOTFOUND
        LcpAuthenticating.AuthenticationReason.InvalidPassphrase -> LcpAuthReason.INVALIDPASSPHRASE
      },
      licenseId = document.id,
      provider = license.provider,
      hint = license.hint,
      hintLink = license.hintLink?.toNitro(),
      supportLinks = license.supportLinks.map { it.toNitro() }.toTypedArray(),
      userId = document.user.id,
      userName = document.user.name,
      userEmail = document.user.email,
    )

    // The outer promise resolves with the JS function's return value, itself a promise.
    return try {
      handler(request).await().await()
    } catch (e: Throwable) {
      null
    }
  }
}

internal fun org.readium.r2.lcp.license.model.components.Link.toNitro(): LcpLink =
  LcpLink(href = href.toString(), type = mediaType?.toString(), title = title)
