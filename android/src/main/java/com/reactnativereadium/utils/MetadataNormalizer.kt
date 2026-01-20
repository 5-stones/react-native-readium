package com.reactnativereadium.utils

import com.facebook.react.bridge.*
import org.readium.r2.shared.publication.Metadata
import org.readium.r2.shared.publication.LocalizedString
import org.readium.r2.shared.publication.Contributor
import org.readium.r2.shared.publication.Subject

/**
 * Normalizes metadata to ensure consistent structure per RWPM spec.
 *
 * This normalizer works directly with Readium's native Kotlin types (Metadata, LocalizedString,
 * Contributor, Subject) and converts them to normalized, spec-compliant structures.
 *
 * This approach is:
 * - More efficient (no intermediate WritableMap conversion)
 * - More type-safe (working with actual Kotlin types)
 * - Based on the stable RWPM specification
 *
 * https://readium.org/webpub-manifest/
 */
object MetadataNormalizer {

    /**
     * Normalizes a Metadata object to a consistent React Native-compatible format.
     * Works directly with Readium native types for efficiency and type safety.
     */
    fun normalize(metadata: Metadata): WritableMap {
        // Build typed NormalizedMetadata object from Readium's native types
        val normalized = NormalizedMetadata(
            // Required fields (provide default empty string if null)
            title = normalizeLocalizedString(metadata.localizedTitle) ?: "",

            // Optional localized string fields
            sortAs = normalizeLocalizedString(metadata.localizedSortAs),
            subtitle = normalizeLocalizedString(metadata.localizedSubtitle),

            // Simple string fields
            identifier = metadata.identifier,
            description = metadata.description,
            readingProgression = metadata.readingProgression?.name?.lowercase(),

            // Date fields (convert Instant to ISO string)
            modified = metadata.modified?.toString(),
            published = metadata.published?.toString(),

            // Layout is not directly on Metadata - would need Publication.metadata.presentation
            // For now, pass null and extract from JSON if needed
            layout = null,

            // Array fields
            language = if (metadata.languages.isNotEmpty()) metadata.languages else null,
            conformsTo = metadata.conformsTo.map { it.uri }.takeIf { it.isNotEmpty() },

            // Numeric fields
            duration = metadata.duration,
            numberOfPages = metadata.numberOfPages,

            // Normalize contributors (all types)
            author = normalizeContributors(metadata.authors),
            translator = normalizeContributors(metadata.translators),
            editor = normalizeContributors(metadata.editors),
            artist = normalizeContributors(metadata.artists),
            illustrator = normalizeContributors(metadata.illustrators),
            letterer = normalizeContributors(metadata.letterers),
            penciler = normalizeContributors(metadata.pencilers),
            colorist = normalizeContributors(metadata.colorists),
            inker = normalizeContributors(metadata.inkers),
            narrator = normalizeContributors(metadata.narrators),
            contributor = normalizeContributors(metadata.contributors),
            publisher = normalizeContributors(metadata.publishers),
            imprint = normalizeContributors(metadata.imprints),

            // Normalize subjects
            subject = normalizeSubjects(metadata.subjects),

            // Complex objects - these need special handling
            // For now, convert via JSON if they exist
            accessibility = metadata.accessibility?.let { convertAccessibilityToWritableMap(it) },
            belongsTo = if (metadata.belongsTo.isNotEmpty()) convertBelongsToToWritableMap(metadata.belongsTo) else null
        )

        // Convert to WritableMap for React Native
        return normalized.toWritableMap()
    }

    /**
     * Normalizes a LocalizedString per RWPM spec.
     *
     * Per RWPM spec, we extract a single string from the localized string using priority:
     * 1. null key (undefined/undetermined language)
     * 2. "en" (English fallback)
     * 3. First available translation
     *
     * https://readium.org/webpub-manifest/contexts/default/
     */
    private fun normalizeLocalizedString(value: LocalizedString?): String? {
        if (value == null) return null

        // Priority: null key (undefined) -> "en" -> first available
        return value.translations[null]?.string
            ?: value.translations["en"]?.string
            ?: value.translations.values.firstOrNull()?.string
    }

    /**
     * Normalizes contributors per RWPM spec.
     *
     * Converts Readium's Contributor objects to our normalized format.
     * https://readium.org/webpub-manifest/schema/contributor-object.schema.json
     */
    private fun normalizeContributors(contributors: List<Contributor>): List<NormalizedContributor>? {
        if (contributors.isEmpty()) return null

        return contributors.mapNotNull { contributor ->
            val name = normalizeLocalizedString(contributor.localizedName) ?: return@mapNotNull null

            NormalizedContributor(
                name = name,
                sortAs = normalizeLocalizedString(contributor.localizedSortAs),
                identifier = contributor.identifier,
                role = contributor.roles.firstOrNull(),
                position = contributor.position?.toInt()
            )
        }.takeIf { it.isNotEmpty() }
    }

    /**
     * Normalizes subjects per RWPM spec.
     *
     * Converts Readium's Subject objects to our normalized format.
     * https://readium.org/webpub-manifest/schema/subject.schema.json
     */
    private fun normalizeSubjects(subjects: List<Subject>): List<NormalizedSubject>? {
        if (subjects.isEmpty()) return null

        return subjects.mapNotNull { subject ->
            val name = normalizeLocalizedString(subject.localizedName) ?: return@mapNotNull null

            NormalizedSubject(
                name = name,
                sortAs = normalizeLocalizedString(subject.localizedSortAs),
                code = subject.code,
                scheme = subject.scheme
            )
        }.takeIf { it.isNotEmpty() }
    }

    /**
     * Converts Readium's Accessibility object to WritableMap.
     * This is a complex nested structure that we pass through as-is.
     */
    private fun convertAccessibilityToWritableMap(accessibility: org.readium.r2.shared.publication.Accessibility): WritableMap? {
        return try {
            // Use Readium's built-in JSON serialization
            val json = accessibility.toJSON()
            json.toWritableMap()
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Converts Readium's belongsTo map to WritableMap.
     * This is a complex nested structure that we pass through as-is.
     */
    private fun convertBelongsToToWritableMap(belongsTo: Map<String, List<org.readium.r2.shared.publication.Collection>>): WritableMap? {
        return try {
            Arguments.createMap().apply {
                belongsTo.forEach { (key, collections) ->
                    val array = Arguments.createArray().apply {
                        collections.forEach { collection ->
                            collection.toJSON().toWritableMap()?.let { pushMap(it) }
                        }
                    }
                    putArray(key, array)
                }
            }
        } catch (e: Exception) {
            null
        }
    }
}
