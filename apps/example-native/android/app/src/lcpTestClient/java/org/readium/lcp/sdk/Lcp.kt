package org.readium.lcp.sdk

import android.util.Base64
import javax.crypto.Cipher
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec
import org.json.JSONObject

/*
 * A stand-in for EDRLab's liblcp that opens licenses using LCP's open *basic profile*, which
 * EDRLab's test server issues and the end-to-end fixtures use. readium-lcp finds these classes
 * by reflection, exactly as it finds the real ones.
 *
 * Test-only: it checks no signature and no revocation list, and refuses every other profile, so
 * it can never open a production license. It is compiled into debug builds only, and only when
 * no liblcp AAR is configured. Launch with the extra `ReadiumLCPTestClient=false` to turn it off.
 */

class DRMContext(
  val hashedPassphrase: String,
  val encryptedContentKey: String,
  val token: String,
  val profile: String,
)

/** Codes readium-lcp understands; see its LcpClient.mapException. */
class DRMError(val code: Int)

class DRMException(val drmError: DRMError) : Exception("LCP error ${drmError.code}")

class Lcp {

  init {
    check(System.getProperty(ENABLED_PROPERTY, "true") != "false") {
      "The basic-profile LCP test client is turned off."
    }
  }

  fun findOneValidPassphrase(jsonLicense: String, hashedPassphrases: Array<String>): String {
    val license = BasicLicense.parse(jsonLicense) ?: throw DRMException(DRMError(CONTEXT_INVALID))
    return hashedPassphrases.firstOrNull { license.isUnlockedBy(it.hexToBytes()) }
      ?: throw DRMException(DRMError(USER_KEY_CHECK_INVALID))
  }

  fun createContext(jsonLicense: String, hashedPassphrase: String, pemCrl: String): DRMContext {
    val license = BasicLicense.parse(jsonLicense) ?: throw DRMException(DRMError(CONTEXT_INVALID))
    if (!license.isUnlockedBy(hashedPassphrase.hexToBytes())) {
      throw DRMException(DRMError(USER_KEY_CHECK_INVALID))
    }
    return DRMContext(hashedPassphrase, license.encryptedContentKey, token = "", profile = BASIC_PROFILE)
  }

  /** readium-lcp strips the padding itself, so it is left on. */
  fun decrypt(context: DRMContext, encryptedData: ByteArray): ByteArray {
    val contentKey = contentKey(context)
    return aesDecrypt(encryptedData, contentKey)
      ?: throw DRMException(DRMError(CONTENT_DECRYPT_ERROR))
  }

  private fun contentKey(context: DRMContext): ByteArray =
    aesDecrypt(Base64.decode(context.encryptedContentKey, Base64.DEFAULT), context.hashedPassphrase.hexToBytes())
      ?.unpad()
      ?: throw DRMException(DRMError(CONTENT_KEY_DECRYPT_ERROR))

  private class BasicLicense(
    val id: String,
    val keyCheck: ByteArray,
    val encryptedContentKey: String,
  ) {
    /** The key check is the license ID, encrypted with the user key. */
    fun isUnlockedBy(userKey: ByteArray): Boolean =
      aesDecrypt(keyCheck, userKey)?.unpad()?.contentEquals(id.toByteArray()) == true

    companion object {
      fun parse(json: String): BasicLicense? = runCatching {
        val license = JSONObject(json)
        val encryption = license.getJSONObject("encryption")
        if (encryption.getString("profile") != BASIC_PROFILE) return null
        BasicLicense(
          id = license.getString("id"),
          keyCheck = Base64.decode(
            encryption.getJSONObject("user_key").getString("key_check"),
            Base64.DEFAULT
          ),
          encryptedContentKey = encryption.getJSONObject("content_key").getString("encrypted_value"),
        )
      }.getOrNull()
    }
  }

  companion object {
    const val ENABLED_PROPERTY = "readium.lcp.testClient"
    private const val BASIC_PROFILE = "http://readium.org/lcp/basic-profile"

    private const val CONTEXT_INVALID = 121
    private const val CONTENT_KEY_DECRYPT_ERROR = 131
    private const val USER_KEY_CHECK_INVALID = 141
    private const val CONTENT_DECRYPT_ERROR = 151
  }
}

/** AES-256-CBC with the IV prepended, padding kept. */
private fun aesDecrypt(data: ByteArray, key: ByteArray): ByteArray? {
  if (key.size != 32 || data.size <= 16 || data.size % 16 != 0) return null
  return runCatching {
    Cipher.getInstance("AES/CBC/NoPadding").run {
      init(Cipher.DECRYPT_MODE, SecretKeySpec(key, "AES"), IvParameterSpec(data, 0, 16))
      doFinal(data, 16, data.size - 16)
    }
  }.getOrNull()
}

/** LCP pads with random bytes, so only the last byte (the pad length) is meaningful. */
private fun ByteArray.unpad(): ByteArray? {
  val length = lastOrNull()?.toInt()?.and(0xFF) ?: return null
  if (length == 0 || length > size) return null
  return copyOfRange(0, size - length)
}

private fun String.hexToBytes(): ByteArray =
  ByteArray(length / 2) { i -> substring(i * 2, i * 2 + 2).toInt(16).toByte() }
