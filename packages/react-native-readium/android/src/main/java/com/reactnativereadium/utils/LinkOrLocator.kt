package com.reactnativereadium.utils

import org.readium.r2.shared.publication.Link as BaseLink
import org.readium.r2.shared.publication.Locator as BaseLocator

sealed class LinkOrLocator {
  class Link(val link: BaseLink): LinkOrLocator()
  class Locator(val locator: BaseLocator): LinkOrLocator()
}
