package com.reactnativereadium.reader

import org.readium.r2.shared.publication.protection.ContentProtection

/**
 * Content protections supplied by the host app, read once when [ReaderService] builds its
 * `PublicationOpener`. Empty by default, so unprotected publications open unchanged.
 * Thread-safe: a host app may register from any thread.
 */
object ReaderContentProtectionRegistry {
    private val lock = Any()
    private val mutableProtections: MutableList<ContentProtection> = mutableListOf()

    /** A snapshot of the registered protections. */
    val protections: List<ContentProtection>
        get() = synchronized(lock) { mutableProtections.toList() }

    // Replace by type: a JS reload would otherwise leave a stale protection first in line.
    fun register(protection: ContentProtection) {
        synchronized(lock) {
            mutableProtections.removeAll { it::class == protection::class }
            mutableProtections.add(protection)
        }
    }

    fun unregister(protection: ContentProtection) {
        synchronized(lock) {
            mutableProtections.removeAll { it === protection }
        }
    }
}
