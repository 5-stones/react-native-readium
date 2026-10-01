package com.margelo.nitro.reactnativereadiumlcp

import org.json.JSONObject
import org.readium.r2.lcp.LcpError

/**
 * Rejects a JS promise with `[code] {json}`, which the TS wrapper turns into an `LcpError`.
 * The JSON carries `detail` (the native description, for logs) and any `fields`, such as dates
 * in milliseconds; the wrapper writes the user-facing message from the code and those fields.
 */
internal class LcpBridgeException(
  code: LcpErrorCode,
  detail: String,
  fields: Map<String, Double> = emptyMap(),
) : Exception("[${code.name}] " + JSONObject(fields + ("detail" to detail)).toString())

internal fun LcpError.toException(): LcpBridgeException =
  LcpBridgeException(code, message, fields)

/** The dates and counts a message about this error should mention. */
private val LcpError.fields: Map<String, Double>
  get() = when (this) {
    is LcpError.LicenseStatus.Cancelled -> mapOf("date" to date.millis)
    is LcpError.LicenseStatus.Returned -> mapOf("date" to date.millis)
    is LcpError.LicenseStatus.NotStarted -> mapOf("date" to start.millis)
    is LcpError.LicenseStatus.Expired -> mapOf("date" to end.millis)
    is LcpError.LicenseStatus.Revoked ->
      mapOf("date" to date.millis, "devicesCount" to devicesCount.toDouble())
    is LcpError.Renew.InvalidRenewalPeriod ->
      maxRenewDate?.let { mapOf("maxRenewDate" to it.millis) } ?: emptyMap()
    else -> emptyMap()
  }

private val kotlin.time.Instant.millis: Double
  get() = toEpochMilliseconds().toDouble()

/** The `LcpErrorCode` JS sees for this error. */
internal val LcpError.code: LcpErrorCode
  get() = when (this) {
    is LcpError.MissingPassphrase -> LcpErrorCode.MISSINGPASSPHRASE
    is LcpError.LicenseInteractionNotAvailable -> LcpErrorCode.LICENSEINTERACTIONNOTAVAILABLE
    is LcpError.LicenseProfileNotSupported -> LcpErrorCode.LICENSEPROFILENOTSUPPORTED
    is LcpError.CrlFetching -> LcpErrorCode.CRLFETCHING
    is LcpError.Network -> LcpErrorCode.NETWORK
    is LcpError.LicenseStatus.Cancelled -> LcpErrorCode.LICENSECANCELLED
    is LcpError.LicenseStatus.Returned -> LcpErrorCode.LICENSERETURNED
    is LcpError.LicenseStatus.NotStarted -> LcpErrorCode.LICENSENOTSTARTED
    is LcpError.LicenseStatus.Expired -> LcpErrorCode.LICENSEEXPIRED
    is LcpError.LicenseStatus.Revoked -> LcpErrorCode.LICENSEREVOKED
    is LcpError.Renew.InvalidRenewalPeriod -> LcpErrorCode.INVALIDRENEWALPERIOD
    is LcpError.Renew -> LcpErrorCode.RENEWFAILED
    is LcpError.Return.AlreadyReturnedOrExpired -> LcpErrorCode.ALREADYRETURNEDOREXPIRED
    is LcpError.Return -> LcpErrorCode.RETURNFAILED
    is LcpError.Parsing -> LcpErrorCode.PARSING
    is LcpError.Container -> LcpErrorCode.LICENSECONTAINER
    is LcpError.LicenseIntegrity -> LcpErrorCode.LICENSEINTEGRITY
    else -> LcpErrorCode.UNKNOWN
  }
