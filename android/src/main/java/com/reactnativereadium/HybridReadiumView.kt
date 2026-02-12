package com.margelo.nitro.reactnativereadium

import android.graphics.Color
import android.util.Log
import android.view.Choreographer
import android.view.View
import android.widget.FrameLayout
import androidx.fragment.app.FragmentActivity
import com.reactnativereadium.reader.BaseReaderFragment
import com.reactnativereadium.reader.EpubReaderFragment
import com.reactnativereadium.reader.ReaderService
import com.reactnativereadium.reader.ReaderViewModel
import com.reactnativereadium.reader.SelectionAction as FragmentSelectionAction
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
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

class HybridReadiumView(private val context: android.content.Context) : HybridReadiumViewSpec() {
  companion object {
    private const val TAG = "HybridReadiumView"
    init {
      NitroReadiumOnLoad.initializeNative()
    }
  }

  private val hostView = FrameLayout(context)
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
  private var svc: ReaderService? = null
  private var fragment: BaseReaderFragment? = null
  private var isFragmentAdded = false
  private var isBuilding = false
  private var isAttached = false
  private var frameCallback: Choreographer.FrameCallback? = null
  private var viewWidth = 0
  private var viewHeight = 0

  override val view: View get() = hostView

  init {
    hostView.addOnAttachStateChangeListener(object : View.OnAttachStateChangeListener {
      override fun onViewAttachedToWindow(v: View) {
        isAttached = true
        buildForViewIfReady()
      }
      override fun onViewDetachedFromWindow(v: View) {
        isAttached = false
        frameCallback?.let {
          try {
            Choreographer.getInstance().removeFrameCallback(it)
          } catch (e: Exception) {
            Log.w(TAG, "Failed to remove frame callback: ${e.message}")
          }
        }
        frameCallback = null
        scope.cancel()
      }
    })
  }

  // Props
  override var file: ReadiumFile? = null
    set(value) {
      field = value
      if (value != null) {
        buildForViewIfReady()
      }
    }

  override var location: Locator? = null
    set(value) {
      field = value
      updateLocation()
    }

  override var preferences: Preferences? = null
    set(value) {
      field = value
      updatePreferences()
    }

  override var decorations: Array<DecorationGroup>? = null
    set(value) {
      field = value
      updateDecorations()
    }

  override var selectionActions: Array<SelectionAction>? = null
    set(value) {
      field = value
      updateSelectionActions()
    }

  override var onLocationChange: ((locator: Locator) -> Unit)? = null
  override var onPublicationReady: ((event: PublicationReadyEvent) -> Unit)? = null
  override var onDecorationActivated: ((event: DecorationActivatedEvent) -> Unit)? = null
  override var onSelectionChange: ((event: SelectionEvent) -> Unit)? = null
  override var onSelectionAction: ((event: SelectionActionEvent) -> Unit)? = null

  private fun ensureService() {
    if (svc == null) {
      val reactContext = (context as? com.facebook.react.uimanager.ThemedReactContext)?.reactApplicationContext
      if (reactContext != null) {
        svc = ReaderService(reactContext)
      }
    }
  }

  // MARK: - Location

  private fun updateLocation() {
    val loc = location ?: return
    if (fragment == null) return

    val readiumLocator = nitroLocatorToReadium(loc) ?: return
    fragment?.go(com.reactnativereadium.utils.LinkOrLocator.Locator(readiumLocator), true)
  }

  // MARK: - Preferences

  private fun updatePreferences() {
    val prefs = preferences ?: return
    if (fragment == null) return

    val epubPrefs = nitroPreferencesToEpub(prefs)
    if (fragment is EpubReaderFragment) {
      (fragment as EpubReaderFragment).updatePreferences(epubPrefs)
    }
  }

  private fun nitroPreferencesToEpub(prefs: Preferences): ReadiumEpubPreferences {
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

  // MARK: - Decorations

  private fun updateDecorations() {
    val groups = decorations ?: return
    if (fragment == null) return

    val readiumGroups = mutableMapOf<String, List<ReadiumDecoration>>()
    for (group in groups) {
      readiumGroups[group.name] = group.decorations.mapNotNull { nitroDecorationToReadium(it) }
    }

    fragment?.applyDecorations(readiumGroups)
  }

  // MARK: - Selection Actions

  private fun updateSelectionActions() {
    val actions = selectionActions ?: return
    if (fragment == null) return

    val fragmentActions = actions.map { FragmentSelectionAction(it.id, it.label) }
    if (fragment is EpubReaderFragment) {
      (fragment as EpubReaderFragment).updateSelectionActions(fragmentActions)
    }
  }

  // MARK: - Direct type converters (no JSON round-trip)

  private fun nitroLocatorToReadium(loc: Locator): ReadiumLocator? {
    val href = ReadiumUrl(loc.href) ?: return null
    val mediaType = ReadiumMediaType(loc.type) ?: ReadiumMediaType.BINARY

    return ReadiumLocator(
      href = href,
      mediaType = mediaType,
      title = loc.title,
      locations = ReadiumLocator.Locations(
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

  private fun nitroDecorationToReadium(dec: Decoration): ReadiumDecoration? {
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

  private fun parseColorString(colorString: String?): Int {
    if (colorString == null) return Color.YELLOW
    return try {
      Color.parseColor(colorString)
    } catch (e: Exception) {
      Color.YELLOW
    }
  }

  private fun readiumLocatorToNitro(loc: ReadiumLocator): Locator {
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

  private fun readiumLinkToNitro(link: ReadiumLink): Link {
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

  private fun readiumDecorationToNitro(dec: ReadiumDecoration): Decoration {
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

  private fun readiumMetadataToNitro(meta: ReadiumMetadata): PublicationMetadata {
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

  private fun colorToHex(color: Int): String = String.format("#%08X", color)

  // MARK: - Imperative navigation

  override fun goForward() { fragment?.goForward() }
  override fun goBackward() { fragment?.goBackward() }

  // MARK: - Fragment management

  private fun buildForViewIfReady() {
    if (!isAttached) return
    if (isFragmentAdded) return
    if (isBuilding) return
    val currentFile = file ?: return
    val fileUrl = currentFile.url
    if (fileUrl.isEmpty()) return

    ensureService()
    val service = svc ?: return

    isBuilding = true

    val path = fileUrl.replace("^(file:/+)?(/.*)$".toRegex(), "$2")

    // Convert initial location
    val initialLocator = currentFile.initialLocation?.let { loc ->
      nitroLocatorToReadium(loc)?.let { com.reactnativereadium.utils.LinkOrLocator.Locator(it) }
    }

    scope.launch {
      service.openPublication(path, initialLocator) { frag ->
        addFragment(frag)
      }
    }
  }

  private fun addFragment(frag: BaseReaderFragment) {
    if (isFragmentAdded) return

    fragment = frag
    isFragmentAdded = true
    setupLayout()

    val activity = hostView.context as? FragmentActivity
      ?: (hostView.context as? android.content.ContextWrapper)?.let {
        var ctx = it.baseContext
        while (ctx is android.content.ContextWrapper) {
          if (ctx is FragmentActivity) return@let ctx
          ctx = ctx.baseContext
        }
        null
      }

    if (activity == null) {
      Log.e(TAG, "Could not find FragmentActivity")
      return
    }

    hostView.id = View.generateViewId()

    activity.supportFragmentManager
      .beginTransaction()
      .replace(hostView.id, frag, hostView.id.toString())
      .commitNow()

    // The FragmentManager may not find hostView via activity.findViewById()
    // in React Native's Fabric view tree. Manually add the fragment's view
    // to hostView if needed.
    frag.view?.let { fragView ->
      if (fragView.parent !== hostView) {
        (fragView.parent as? android.view.ViewGroup)?.removeView(fragView)
        hostView.addView(fragView, FrameLayout.LayoutParams(
          FrameLayout.LayoutParams.MATCH_PARENT,
          FrameLayout.LayoutParams.MATCH_PARENT
        ))
      } else {
        fragView.layoutParams = FrameLayout.LayoutParams(
          FrameLayout.LayoutParams.MATCH_PARENT,
          FrameLayout.LayoutParams.MATCH_PARENT
        )
      }
    }

    // Apply pending state
    preferences?.let { updatePreferences() }
    decorations?.let { updateDecorations() }
    selectionActions?.let { updateSelectionActions() }

    // Subscribe to fragment events
    frag.channel.receive(frag) { event ->
      when (event) {
        is ReaderViewModel.Event.LocatorUpdate -> {
          val payload = readiumLocatorToNitro(event.locator)
          onLocationChange?.invoke(payload)
        }
        is ReaderViewModel.Event.PublicationReady -> {
          val payload = PublicationReadyEvent(
            tableOfContents = event.tableOfContents.map { readiumLinkToNitro(it) }.toTypedArray(),
            positions = event.positions.map { readiumLocatorToNitro(it) }.toTypedArray(),
            metadata = readiumMetadataToNitro(event.metadata)
          )
          onPublicationReady?.invoke(payload)
        }
        is ReaderViewModel.Event.DecorationActivated -> {
          val decoration = readiumDecorationToNitro(event.decoration)
          val rect = event.rect?.let {
            Rect(x = it.left.toDouble(), y = it.top.toDouble(), width = it.width().toDouble(), height = it.height().toDouble())
          }
          val point = event.point?.let { Point(x = it.x.toDouble(), y = it.y.toDouble()) }
          val payload = DecorationActivatedEvent(
            decoration = decoration,
            group = event.group,
            rect = rect,
            point = point
          )
          onDecorationActivated?.invoke(payload)
        }
        is ReaderViewModel.Event.SelectionChanged -> {
          val payload = SelectionEvent(
            locator = event.locator?.let { readiumLocatorToNitro(it) },
            selectedText = event.selectedText
          )
          onSelectionChange?.invoke(payload)
        }
        is ReaderViewModel.Event.SelectionAction -> {
          val payload = SelectionActionEvent(
            locator = readiumLocatorToNitro(event.locator),
            selectedText = event.selectedText,
            actionId = event.actionId
          )
          onSelectionAction?.invoke(payload)
        }
      }
    }
  }

  private fun setupLayout() {
    frameCallback = object : Choreographer.FrameCallback {
      override fun doFrame(frameTimeNanos: Long) {
        manuallyLayoutChildren()
        hostView.viewTreeObserver.dispatchOnGlobalLayout()
        Choreographer.getInstance().postFrameCallback(this)
      }
    }
    frameCallback?.let { Choreographer.getInstance().postFrameCallback(it) }
  }

  private fun manuallyLayoutChildren() {
    val w = hostView.measuredWidth
    val h = hostView.measuredHeight
    if (w <= 0 || h <= 0) return

    for (i in 0 until hostView.childCount) {
      val child = hostView.getChildAt(i)
      child.measure(
        View.MeasureSpec.makeMeasureSpec(w, View.MeasureSpec.EXACTLY),
        View.MeasureSpec.makeMeasureSpec(h, View.MeasureSpec.EXACTLY)
      )
      child.layout(0, 0, w, h)
    }
  }

}
