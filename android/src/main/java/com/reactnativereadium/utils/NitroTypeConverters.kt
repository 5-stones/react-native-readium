package com.reactnativereadium.utils

import android.graphics.Color
import com.margelo.nitro.reactnativereadium.*
import org.readium.r2.navigator.epub.EpubPreferences as ReadiumEpubPreferences
import org.readium.r2.navigator.preferences.ColumnCount
import org.readium.r2.navigator.preferences.FontFamily
import org.readium.r2.navigator.preferences.ImageFilter
import org.readium.r2.navigator.preferences.ReadingProgression as NavReadingProgression
import org.readium.r2.navigator.preferences.Spread as NavSpread
import org.readium.r2.navigator.preferences.TextAlign
import org.readium.r2.navigator.preferences.Theme
import org.readium.r2.navigator.preferences.Color as ReadiumColor
import org.readium.r2.shared.util.Language
import org.readium.r2.shared.publication.Locator as ReadiumLocator
import org.readium.r2.shared.publication.Link as ReadiumLink
import org.readium.r2.shared.publication.Metadata as ReadiumMetadata
import org.readium.r2.shared.util.Url as ReadiumUrl
import org.readium.r2.shared.util.mediatype.MediaType as ReadiumMediaType
import org.readium.r2.navigator.Decoration as ReadiumDecoration

// MARK: - Nitro → Readium converters

internal fun nitroPreferencesToEpub(prefs: Preferences): ReadiumEpubPreferences {
  return ReadiumEpubPreferences(
    backgroundColor = prefs.backgroundColor?.let { parseReadiumColor(it) },
    columnCount = prefs.columnCount?.let { parseColumnCount(it) },
    fontFamily = prefs.fontFamily?.let { FontFamily(it) },
    fontSize = prefs.fontSize,
    fontWeight = prefs.fontWeight,
    hyphens = prefs.hyphens,
    imageFilter = prefs.imageFilter?.let { parseImageFilter(it) },
    language = prefs.language?.let { Language(it) },
    letterSpacing = prefs.letterSpacing,
    ligatures = prefs.ligatures,
    lineHeight = prefs.lineHeight,
    pageMargins = prefs.pageMargins,
    paragraphIndent = prefs.paragraphIndent,
    paragraphSpacing = prefs.paragraphSpacing,
    publisherStyles = prefs.publisherStyles,
    readingProgression = prefs.readingProgression?.let { parseReadingProgression(it) },
    scroll = prefs.scroll,
    spread = prefs.spread?.let { parseSpread(it) },
    textAlign = prefs.textAlign?.let { parseTextAlign(it) },
    textColor = prefs.textColor?.let { parseReadiumColor(it) },
    textNormalization = prefs.textNormalization,
    theme = prefs.theme?.let { parseTheme(it) },
    typeScale = prefs.typeScale,
    verticalText = prefs.verticalText,
    wordSpacing = prefs.wordSpacing,
  )
}

private fun parseReadiumColor(hex: String): ReadiumColor? {
  return try {
    ReadiumColor(android.graphics.Color.parseColor(hex))
  } catch (e: Exception) {
    null
  }
}

private fun parseTheme(value: String): Theme? = when (value) {
  "light" -> Theme.LIGHT
  "dark" -> Theme.DARK
  "sepia" -> Theme.SEPIA
  else -> null
}

private fun parseColumnCount(value: String): ColumnCount? = when (value) {
  "auto" -> ColumnCount.AUTO
  "1" -> ColumnCount.ONE
  "2" -> ColumnCount.TWO
  else -> null
}

private fun parseImageFilter(value: String): ImageFilter? = when (value) {
  "darken" -> ImageFilter.DARKEN
  "invert" -> ImageFilter.INVERT
  else -> null
}

private fun parseReadingProgression(value: String): NavReadingProgression? = when (value) {
  "ltr" -> NavReadingProgression.LTR
  "rtl" -> NavReadingProgression.RTL
  else -> null
}

private fun parseSpread(value: String): NavSpread? = when (value) {
  "auto" -> NavSpread.AUTO
  "never" -> NavSpread.NEVER
  "always" -> NavSpread.ALWAYS
  else -> null
}

private fun parseTextAlign(value: String): TextAlign? = when (value) {
  "center" -> TextAlign.CENTER
  "justify" -> TextAlign.JUSTIFY
  "start" -> TextAlign.START
  "end" -> TextAlign.END
  "left" -> TextAlign.LEFT
  "right" -> TextAlign.RIGHT
  else -> null
}

internal fun nitroLocatorToReadium(loc: Locator): ReadiumLocator? {
  val normalized = normalizeHref(loc.href)
  val href = ReadiumUrl(normalized.resourcePath) ?: return null
  val mediaType = ReadiumMediaType(loc.type) ?: ReadiumMediaType.BINARY

  // Merge any fragment from the href into locations.fragments
  val fragments = buildList {
    normalized.fragment?.let { add(it) }
  }

  return ReadiumLocator(
    href = href,
    mediaType = mediaType,
    title = loc.title,
    locations = ReadiumLocator.Locations(
      fragments = fragments,
      progression = loc.locations?.progression,
      position = loc.locations?.position?.toInt(),
      totalProgression = loc.locations?.totalProgression
    ),
    text = ReadiumLocator.Text(
      before = loc.text?.before,
      highlight = loc.text?.highlight,
      after = loc.text?.after
    )
  )
}

internal fun nitroDecorationToReadium(dec: Decoration): ReadiumDecoration? {
  val locator = nitroLocatorToReadium(dec.locator) ?: return null

  val style: ReadiumDecoration.Style = when (dec.style.type) {
    "highlight" -> ReadiumDecoration.Style.Highlight(
      tint = parseColorString(dec.style.tint),
      isActive = dec.style.isActive ?: false
    )
    "underline" -> ReadiumDecoration.Style.Underline(
      tint = parseColorString(dec.style.tint),
      isActive = dec.style.isActive ?: false
    )
    else -> return null
  }

  val extras: Map<String, Any> = dec.extras ?: emptyMap()

  return ReadiumDecoration(
    id = dec.id,
    locator = locator,
    style = style,
    extras = extras
  )
}

internal fun parseColorString(colorString: String?): Int {
  if (colorString == null) return Color.YELLOW
  val trimmed = colorString.trim()
  return try {
    when {
      trimmed.startsWith("rgb(") -> {
        val values = trimmed.substringAfter("(").substringBefore(")").split(",")
        Color.rgb(values[0].trim().toInt(), values[1].trim().toInt(), values[2].trim().toInt())
      }
      trimmed.startsWith("rgba(") -> {
        val values = trimmed.substringAfter("(").substringBefore(")").split(",")
        Color.argb((values[3].trim().toFloat() * 255).toInt(),
          values[0].trim().toInt(), values[1].trim().toInt(), values[2].trim().toInt())
      }
      else -> Color.parseColor(trimmed) // handles hex + named colors
    }
  } catch (e: Exception) {
    Color.YELLOW
  }
}

// MARK: - Readium → Nitro converters

internal fun readiumLocatorToNitro(loc: ReadiumLocator): Locator {
  val locations = LocatorLocations(
    progression = loc.locations.progression ?: 0.0,
    position = loc.locations.position?.toDouble(),
    totalProgression = loc.locations.totalProgression
  )

  val text = if (loc.text.highlight != null || loc.text.before != null || loc.text.after != null) {
    LocatorText(
      before = loc.text.before,
      highlight = loc.text.highlight,
      after = loc.text.after
    )
  } else null

  return Locator(
    href = loc.href.toString(),
    type = loc.mediaType.toString(),
    target = null,
    title = loc.title,
    locations = locations,
    text = text
  )
}

internal fun readiumLinkToNitro(link: ReadiumLink): Link {
  return Link(
    href = link.href.toString(),
    templated = link.href.isTemplated,
    type = link.mediaType?.toString(),
    title = link.title,
    rels = link.rels.toTypedArray(),
    height = null,
    width = null,
    bitrate = null,
    duration = null,
    languages = link.languages.toTypedArray()
  )
}

internal fun readiumDecorationToNitro(dec: ReadiumDecoration): Decoration {
  val locator = readiumLocatorToNitro(dec.locator)

  val style = DecorationStyle(
    type = when (dec.style) {
      is ReadiumDecoration.Style.Highlight -> "highlight"
      is ReadiumDecoration.Style.Underline -> "underline"
      else -> "custom"
    },
    tint = when (dec.style) {
      is ReadiumDecoration.Style.Highlight -> colorToHex((dec.style as ReadiumDecoration.Style.Highlight).tint)
      is ReadiumDecoration.Style.Underline -> colorToHex((dec.style as ReadiumDecoration.Style.Underline).tint)
      else -> null
    },
    isActive = when (dec.style) {
      is ReadiumDecoration.Style.Highlight -> (dec.style as ReadiumDecoration.Style.Highlight).isActive
      is ReadiumDecoration.Style.Underline -> (dec.style as ReadiumDecoration.Style.Underline).isActive
      else -> null
    },
    id = null, html = null, css = null, layout = null, width = null
  )

  val extras = if (dec.extras.isNotEmpty()) {
    dec.extras.entries.associate { it.key to it.value.toString() }
  } else null

  return Decoration(id = dec.id, locator = locator, style = style, extras = extras)
}

internal fun readiumMetadataToNitro(meta: ReadiumMetadata): PublicationMetadata {
  fun contributors(list: List<org.readium.r2.shared.publication.Contributor>): Array<Contributor>? {
    if (list.isEmpty()) return null
    return list.map {
      Contributor(
        name = it.name,
        sortAs = null,
        identifier = it.identifier,
        role = it.roles.firstOrNull(),
        position = it.position
      )
    }.toTypedArray()
  }

  fun subjects(list: List<org.readium.r2.shared.publication.Subject>): Array<Subject>? {
    if (list.isEmpty()) return null
    return list.map {
      Subject(name = it.name, sortAs = null, code = it.code, scheme = it.scheme)
    }.toTypedArray()
  }

  return PublicationMetadata(
    title = meta.title ?: "Untitled",
    sortAs = null,
    subtitle = meta.localizedSubtitle?.string,
    identifier = meta.identifier,
    accessibility = null,
    modified = meta.modified?.toString(),
    published = meta.published?.toString(),
    language = if (meta.languages.isNotEmpty()) meta.languages.toTypedArray() else null,
    author = contributors(meta.authors),
    translator = contributors(meta.translators),
    editor = contributors(meta.editors),
    artist = contributors(meta.artists),
    illustrator = contributors(meta.illustrators),
    letterer = contributors(meta.letterers),
    penciler = contributors(meta.pencilers),
    colorist = contributors(meta.colorists),
    inker = contributors(meta.inkers),
    narrator = contributors(meta.narrators),
    contributor = contributors(meta.contributors),
    publisher = contributors(meta.publishers),
    imprint = contributors(meta.imprints),
    subject = subjects(meta.subjects),
    layout = null,
    readingProgression = meta.readingProgression?.name?.lowercase(),
    description = meta.description,
    duration = meta.duration,
    numberOfPages = meta.numberOfPages?.toDouble(),
    belongsTo = null
  )
}

internal fun colorToHex(color: Int): String = String.format("#%08X", color)
