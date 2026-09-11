package com.reactnativereadium.reader

import org.readium.r2.shared.publication.protection.ContentProtection

/**
 * Content protections supplied by the host app, read once when [ReaderService] builds its
 * `PublicationOpener`. Empty by default, so unprotected publications open unchanged.
 */
object ReaderContentProtectionRegistry {
    private val mutableProtections: MutableList<ContentProtection> = mutableListOf()

    val protections: List<ContentProtection>
        get() = mutableProtections.toList()

    // Replace by type: a JS reload would otherwise leave a stale protection first in line.
    fun register(protection: ContentProtection) {
        mutableProtections.removeAll { it::class == protection::class }
        mutableProtections.add(protection)
    }

    fun unregister(protection: ContentProtection) {
        mutableProtections.removeAll { it === protection }
    }
}
