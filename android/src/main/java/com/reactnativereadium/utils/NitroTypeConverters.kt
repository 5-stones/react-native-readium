package com.reactnativereadium.utils

import android.graphics.Color
import com.margelo.nitro.reactnativereadium.*
import org.readium.r2.navigator.epub.EpubPreferences as ReadiumEpubPreferences
import org.readium.r2.navigator.preferences.ColumnCount
import org.readium.r2.navigator.preferences.Fit
import org.readium.r2.navigator.preferences.FontFamily
import org.readium.r2.navigator.preferences.ImageFilter
import org.readium.r2.navigator.preferences.ReadingProgression as NavReadingProgression
import org.readium.r2.navigator.preferences.Spread as NavSpread
import org.readium.r2.navigator.preferences.TextAlign
import org.readium.r2.navigator.preferences.Theme
import org.readium.r2.navigator.preferences.Color as ReadiumColor
import org.readium.r2.navigator.preferences.Axis
import org.readium.r2.shared.util.Language
import org.readium.r2.shared.publication.services.search.SearchService
import org.readium.r2.navigator.DecorableNavigator
import org.readium.r2.navigator.Navigator
import org.readium.r2.navigator.SelectableNavigator
import org.readium.r2.navigator.epub.EpubNavigatorFactory
import org.readium.r2.navigator.epub.EpubNavigatorFragment
import org.readium.r2.navigator.pdf.PdfNavigatorFactory
import org.readium.r2.navigator.pdf.PdfNavigatorFragment
import org.readium.r2.shared.publication.Publication
import org.readium.r2.shared.publication.services.search.SearchService as SearchServiceClass

import org.readium.r2.shared.publication.Locator as ReadiumLocator
import org.readium.r2.shared.publication.Link as ReadiumLink
import org.readium.r2.shared.publication.Metadata as ReadiumMetadata
import org.readium.r2.shared.util.Url as ReadiumUrl
import org.readium.r2.shared.util.mediatype.MediaType as ReadiumMediaType
import org.readium.r2.navigator.Decoration as ReadiumDecoration

import org.readium.adapter.pdfium.navigator.PdfiumPreferences as ReadiumPdfPreferences
import org.readium.adapter.pdfium.navigator.PdfiumEngineProvider

import android.util.Log

private const val TAG = "ReadiumConverters"


// MARK: - Nitro → Readium converters

// Sepia theme colors — unified across iOS, Android, and web
private const val SEPIA_BACKGROUND = "#f4ecd8"
private const val SEPIA_TEXT = "#5f4b32"

internal fun nitroPreferencesToEpub(prefs: Preferences): ReadiumEpubPreferences {
  // When theme is sepia and no explicit colors are set, inject our unified
  // sepia colors so the result matches iOS and web exactly.
  val bgColor = prefs.backgroundColor?.let { parseReadiumColor(it) }
    ?: if (prefs.theme == "sepia" && prefs.backgroundColor == null) parseReadiumColor(SEPIA_BACKGROUND) else null
  val txtColor = prefs.textColor?.let { parseReadiumColor(it) }
    ?: if (prefs.theme == "sepia" && prefs.textColor == null) parseReadiumColor(SEPIA_TEXT) else null

  return try {
    ReadiumEpubPreferences(
      backgroundColor = bgColor,
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
      textColor = txtColor,
      textNormalization = prefs.textNormalization,
      theme = prefs.theme?.let { parseTheme(it) },
      typeScale = prefs.typeScale,
      verticalText = prefs.verticalText,
      wordSpacing = prefs.wordSpacing,
    )
  } catch (e: IllegalArgumentException) {
    Log.e(TAG, "Failed to build EPUB preferences, using defaults", e)
    ReadiumEpubPreferences()
  }
}

internal fun nitroPreferencesToPdf(prefs: Preferences): ReadiumPdfPreferences {
  return try {
    ReadiumPdfPreferences(
      fit = prefs.fit?.let { parseFit(it) },
      pageSpacing = prefs.pageSpacing,
      readingProgression = prefs.readingProgression?.let { parseReadingProgression(it) },
      scrollAxis = prefs.scrollAxis?.let { parseAxis(it) },
    )
  } catch (e: IllegalArgumentException) {
    Log.e(TAG, "Failed to build PDF preferences, using defaults", e)
    ReadiumPdfPreferences()
  }
}

private fun parseReadiumColor(hex: String): ReadiumColor? {
  return try {
    ReadiumColor(android.graphics.Color.parseColor(hex))
  } catch (e: Exception) {
    null
  }
}

private fun parseTheme(value: String): Theme? = when (value.lowercase()) {
  "light" -> Theme.LIGHT
  "dark" -> Theme.DARK
  "sepia" -> Theme.SEPIA
  else -> null
}

private fun parseColumnCount(value: String): ColumnCount? = when (value.lowercase()) {
  "auto" -> ColumnCount.AUTO
  "1" -> ColumnCount.ONE
  "2" -> ColumnCount.TWO
  else -> null
}

private fun parseImageFilter(value: String): ImageFilter? = when (value.lowercase()) {
  "darken" -> ImageFilter.DARKEN
  "invert" -> ImageFilter.INVERT
  else -> null
}

private fun parseReadingProgression(value: String): NavReadingProgression? = when (value.lowercase()) {
  "ltr" -> NavReadingProgression.LTR
  "rtl" -> NavReadingProgression.RTL
  else -> null
}

private fun parseSpread(value: String): NavSpread? = when (value.lowercase()) {
  "auto" -> NavSpread.AUTO
  "never" -> NavSpread.NEVER
  "always" -> NavSpread.ALWAYS
  else -> null
}

private fun parseTextAlign(value: String): TextAlign? = when (value.lowercase()) {
  "center" -> TextAlign.CENTER
  "justify" -> TextAlign.JUSTIFY
  "start" -> TextAlign.START
  "end" -> TextAlign.END
  "left" -> TextAlign.LEFT
  "right" -> TextAlign.RIGHT
  else -> null
}

private fun parseFit(value: String): Fit? = when (value.lowercase()) {
  "cover" -> Fit.COVER
  "contain" -> Fit.CONTAIN
  "width" -> Fit.WIDTH
  "height" -> Fit.HEIGHT
  else -> null
}

/**
 * Stands in for an href that named no resource, so the locator survives conversion
 * long enough for `ReaderService` to remap it against the opened publication.
 */
internal const val UNRESOLVED_HREF_PLACEHOLDER = "__readium_unresolved__"

internal fun nitroLocatorToReadium(loc: Locator): ReadiumLocator? {
  val normalized = normalizeHref(loc.href)
  // Older web builds persisted PDF locators with a fragment-only href such as
  // "#page=3". Keep them rather than dropping the reading position on the floor.
  val resourcePath = normalized.resourcePath.ifEmpty { UNRESOLVED_HREF_PLACEHOLDER }
  val href = ReadiumUrl(resourcePath) ?: return null
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

private fun parseAxis(value: String): Axis? = when (value) {
  "horizontal" -> Axis.HORIZONTAL
  "vertical" -> Axis.VERTICAL
  else -> null
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
    progression = loc.locations.progression,
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

internal fun readiumLinkToNitro(link: ReadiumLink, depth: Double = 0.0, parentHref: String? = null, position: Double = 0.0): Link {
  return Link(
    href = link.href.toString(),
    title = link.title,
    rels = link.rels.toTypedArray(),
    languages = link.languages.toTypedArray(),
    depth = depth,
    hasChildren = if (link.children.isNotEmpty()) true else null,
    parentHref = parentHref,
    position = position
  )
}

internal fun flattenReadiumLinks(links: List<ReadiumLink>, depth: Double = 0.0, parentHref: String? = null): List<Link> {
  val result = mutableListOf<Link>()
  for ((index, link) in links.withIndex()) {
    result.add(readiumLinkToNitro(link, depth, parentHref, index.toDouble()))
    if (link.children.isNotEmpty()) {
      result.addAll(flattenReadiumLinks(link.children, depth + 1, link.href.toString()))
    }
  }
  return result
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
    conformsTo = meta.conformsTo.map { it.uri }.toTypedArray(),
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
    layout = meta.layout?.value,
    readingProgression = meta.readingProgression?.name?.lowercase(),
    description = meta.description,
    duration = meta.duration,
    numberOfPages = meta.numberOfPages?.toDouble(),
    belongsTo = null
  )
}

/**
 * What this reader can do with the publication it opened.
 *
 * Asks Readium rather than consulting a list: `isEffective` is the toolkit's own
 * answer for whether submitting a preference would change anything, given this
 * publication's layout and the preferences in force.
 */
internal fun readiumCapabilities(
  publication: Publication,
  navigator: Navigator,
  preferences: Preferences?
): Capabilities {

  val epubEditor = (navigator as? EpubNavigatorFragment)?.let { nav ->
    val current = preferences?.let { nitroPreferencesToEpub(it) } ?: ReadiumEpubPreferences()
    EpubNavigatorFactory(publication).createPreferencesEditor(current)
  }

  val pdfEditor = (navigator as? PdfNavigatorFragment<*, *>)?.let { nav ->
    val current = preferences?.let { nitroPreferencesToPdf(it) } ?: ReadiumPdfPreferences()
    PdfNavigatorFactory(publication, PdfiumEngineProvider()).createPreferencesEditor(current)
  }

  return Capabilities(
    // Shared Preferences
    readingProgression = epubEditor?.readingProgression?.isEffective ?: pdfEditor?.readingProgression?.isEffective ?: false,

    // EPUB-only Preferences
    backgroundColor = epubEditor?.backgroundColor?.isEffective ?: false,
    columnCount = epubEditor?.columnCount?.isEffective ?: false,
    fontFamily = epubEditor?.fontFamily?.isEffective ?: false,
    fontSize = epubEditor?.fontSize?.isEffective ?: false,
    fontWeight = epubEditor?.fontWeight?.isEffective ?: false,
    hyphens = epubEditor?.hyphens?.isEffective ?: false,
    imageFilter = epubEditor?.imageFilter?.isEffective ?: false,
    language = epubEditor?.language?.isEffective ?: false,
    letterSpacing = epubEditor?.letterSpacing?.isEffective ?: false,
    ligatures = epubEditor?.ligatures?.isEffective ?: false,
    lineHeight = epubEditor?.lineHeight?.isEffective ?: false,
    pageMargins = epubEditor?.pageMargins?.isEffective ?: false,
    paragraphIndent = epubEditor?.paragraphIndent?.isEffective ?: false,
    paragraphSpacing = epubEditor?.paragraphSpacing?.isEffective ?: false,
    publisherStyles = epubEditor?.publisherStyles?.isEffective ?: false,
    scroll = epubEditor?.scroll?.isEffective ?: false,
    spread = epubEditor?.spread?.isEffective ?: false,
    textAlign = epubEditor?.textAlign?.isEffective ?: false,
    textColor = epubEditor?.textColor?.isEffective ?: false,
    textNormalization = epubEditor?.textNormalization?.isEffective ?: false,
    theme = epubEditor?.theme?.isEffective ?: false,
    typeScale = epubEditor?.typeScale?.isEffective ?: false,
    verticalText = epubEditor?.verticalText?.isEffective ?: false,
    wordSpacing = epubEditor?.wordSpacing?.isEffective ?: false,

    // PDF-only Preferences
    fit = pdfEditor?.fit?.isEffective ?: false,
    offsetFirstPage = false,
    pageSpacing = pdfEditor?.pageSpacing?.isEffective ?: false,
    scrollAxis = pdfEditor?.scrollAxis?.isEffective ?: false,
    visibleScrollbar = false,

    // Web-only or Derived Capabilities
    zoom = false,
    search = publication.findService(SearchServiceClass::class) != null,
    decorations = navigator is DecorableNavigator,
    selection = navigator is SelectableNavigator
  )
}

internal fun colorToHex(color: Int): String = String.format("#%08X", color)

internal fun nitroSearchOptionsToReadium(options: SearchOptions): SearchService.Options {
  var result = SearchService.Options()
  options.caseSensitive?.let { result = result.copy(caseSensitive = it) }
  options.diacriticSensitive?.let { result = result.copy(diacriticSensitive = it) }
  options.wholeWord?.let { result = result.copy(wholeWord = it) }
  options.regularExpression?.let { result = result.copy(regularExpression = it) }
  options.language?.let { result = result.copy(language = it) }
  return result
}

internal fun nitroSearchResultFromReadium(locator: ReadiumLocator): SearchResult =
  SearchResult(
    locator = readiumLocatorToNitro(locator),
    before = locator.text.before,
    highlight = locator.text.highlight,
    after = locator.text.after
  )
