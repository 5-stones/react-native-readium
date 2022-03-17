package com.reactnativereadium.utils.extensions

import org.readium.r2.shared.publication.Metadata

val Metadata.authorName: String get() =
    authors.firstOrNull()?.name ?: ""
