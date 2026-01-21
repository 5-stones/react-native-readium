package com.reactnativereadium.utils

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap

/**
 * Normalized metadata data classes that mirror the TypeScript PublicationMetadata interface.
 * These provide type safety and structure enforcement during metadata normalization.
 */

/**
 * Contributor information for publication metadata
 */
data class NormalizedContributor(
    val name: String,
    val sortAs: String? = null,
    val identifier: String? = null,
    val role: String? = null,
    val position: Int? = null
) {
    fun toWritableMap(): WritableMap {
        return Arguments.createMap().apply {
            putString("name", name)
            sortAs?.let { putString("sortAs", it) }
            identifier?.let { putString("identifier", it) }
            role?.let { putString("role", it) }
            position?.let { putInt("position", it) }
        }
    }
}

/**
 * Subject/tag information
 */
data class NormalizedSubject(
    val name: String,
    val sortAs: String? = null,
    val code: String? = null,
    val scheme: String? = null
) {
    fun toWritableMap(): WritableMap {
        return Arguments.createMap().apply {
            putString("name", name)
            sortAs?.let { putString("sortAs", it) }
            code?.let { putString("code", it) }
            scheme?.let { putString("scheme", it) }
        }
    }
}

/**
 * Normalized publication metadata following the RWPM spec
 * @see https://readium.org/webpub-manifest/
 */
data class NormalizedMetadata(
    // Required fields
    val title: String,

    // Optional localized string fields
    val sortAs: String? = null,
    val subtitle: String? = null,

    // Simple fields
    val identifier: String? = null,
    val description: String? = null,
    val readingProgression: String? = null,
    val layout: String? = null,
    val modified: String? = null,
    val published: String? = null,

    // Array fields
    val language: List<String>? = null,
    val conformsTo: List<String>? = null,

    // Numeric fields
    val duration: Double? = null,
    val numberOfPages: Int? = null,

    // Contributors (all types)
    val author: List<NormalizedContributor>? = null,
    val translator: List<NormalizedContributor>? = null,
    val editor: List<NormalizedContributor>? = null,
    val artist: List<NormalizedContributor>? = null,
    val illustrator: List<NormalizedContributor>? = null,
    val letterer: List<NormalizedContributor>? = null,
    val penciler: List<NormalizedContributor>? = null,
    val colorist: List<NormalizedContributor>? = null,
    val inker: List<NormalizedContributor>? = null,
    val narrator: List<NormalizedContributor>? = null,
    val contributor: List<NormalizedContributor>? = null,
    val publisher: List<NormalizedContributor>? = null,
    val imprint: List<NormalizedContributor>? = null,

    // Subjects
    val subject: List<NormalizedSubject>? = null,

    // Complex objects (preserved as-is from source)
    val accessibility: WritableMap? = null,
    val belongsTo: WritableMap? = null
) {
    /**
     * Converts this normalized metadata to a WritableMap for React Native
     */
    fun toWritableMap(): WritableMap {
        return Arguments.createMap().apply {
            // Required fields
            putString("title", title)

            // Optional localized fields
            sortAs?.let { putString("sortAs", it) }
            subtitle?.let { putString("subtitle", it) }

            // Simple fields
            identifier?.let { putString("identifier", it) }
            description?.let { putString("description", it) }
            readingProgression?.let { putString("readingProgression", it) }
            layout?.let { putString("layout", it) }
            modified?.let { putString("modified", it) }
            published?.let { putString("published", it) }

            // Array fields
            language?.let {
                putArray("language", Arguments.createArray().apply {
                    it.forEach { lang -> pushString(lang) }
                })
            }
            conformsTo?.let {
                putArray("conformsTo", Arguments.createArray().apply {
                    it.forEach { item -> pushString(item) }
                })
            }

            // Numeric fields
            duration?.let { putDouble("duration", it) }
            numberOfPages?.let { putInt("numberOfPages", it) }

            // Contributors
            author?.let { putArray("author", it.toContributorWritableArray()) }
            translator?.let { putArray("translator", it.toContributorWritableArray()) }
            editor?.let { putArray("editor", it.toContributorWritableArray()) }
            artist?.let { putArray("artist", it.toContributorWritableArray()) }
            illustrator?.let { putArray("illustrator", it.toContributorWritableArray()) }
            letterer?.let { putArray("letterer", it.toContributorWritableArray()) }
            penciler?.let { putArray("penciler", it.toContributorWritableArray()) }
            colorist?.let { putArray("colorist", it.toContributorWritableArray()) }
            inker?.let { putArray("inker", it.toContributorWritableArray()) }
            narrator?.let { putArray("narrator", it.toContributorWritableArray()) }
            contributor?.let { putArray("contributor", it.toContributorWritableArray()) }
            publisher?.let { putArray("publisher", it.toContributorWritableArray()) }
            imprint?.let { putArray("imprint", it.toContributorWritableArray()) }

            // Subjects
            subject?.let { putArray("subject", it.toSubjectWritableArray()) }

            // Complex objects
            accessibility?.let { putMap("accessibility", it) }
            belongsTo?.let { putMap("belongsTo", it) }
        }
    }
}

/**
 * Extension function to convert a list of contributors to WritableArray
 */
private fun List<NormalizedContributor>.toContributorWritableArray(): WritableArray {
    return Arguments.createArray().apply {
        this@toContributorWritableArray.forEach { pushMap(it.toWritableMap()) }
    }
}

/**
 * Extension function to convert a list of subjects to WritableArray
 */
private fun List<NormalizedSubject>.toSubjectWritableArray(): WritableArray {
    return Arguments.createArray().apply {
        this@toSubjectWritableArray.forEach { pushMap(it.toWritableMap()) }
    }
}
