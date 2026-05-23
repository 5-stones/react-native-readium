package com.margelo.nitro.reactnativereadium

import android.util.Log
import android.view.Choreographer
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.fragment.app.FragmentActivity
import com.margelo.nitro.core.Promise
import com.reactnativereadium.reader.BaseReaderFragment
import com.reactnativereadium.reader.EpubReaderFragment
import com.reactnativereadium.reader.ReaderService
import com.reactnativereadium.reader.ReaderViewModel
import com.reactnativereadium.reader.SelectionAction as FragmentSelectionAction
import com.reactnativereadium.utils.nitroPreferencesToEpub
import com.reactnativereadium.utils.nitroLocatorToReadium
import com.reactnativereadium.utils.nitroDecorationToReadium
import com.reactnativereadium.utils.readiumLocatorToNitro
import com.reactnativereadium.utils.readiumLinkToNitro
import com.reactnativereadium.utils.flattenReadiumLinks
import com.reactnativereadium.utils.readiumDecorationToNitro
import com.reactnativereadium.utils.readiumMetadataToNitro
import com.reactnativereadium.utils.readiumPublicationInfo
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import com.reactnativereadium.reader.AudioReaderFragment
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.time.Duration.Companion.milliseconds
import org.json.JSONObject
import org.readium.navigator.media.audio.AudioNavigator
import org.readium.navigator.media.common.MediaNavigator
import org.readium.r2.navigator.epub.EpubNavigatorFragment

class HybridReadiumView(private val context: android.content.Context) : HybridReadiumViewSpec() {
  companion object {
    private const val TAG = "HybridReadiumView"
    private var nextInstanceId = 0
    // Fabric creates the new native view before removing the old one when React
    // remounts via key change. The old hostView (with its WebView) stays in the
    // tree covering the new view until Fabric eventually detaches it. This
    // registry lets a new instance force-clear stale ones immediately.
    private val liveInstances = mutableMapOf<Int, HybridReadiumView>()
    init {
      NitroReadiumOnLoad.initializeNative()
    }
  }

  private val instanceId = nextInstanceId++
  private val hostView = FrameLayout(context)
  private var scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
  private var svc: ReaderService? = null
  private var fragment: BaseReaderFragment? = null
  private var isFragmentAdded = false
  private var isBuilding = false
  private var isAttached = false
  private var isDestroyed = false
  private var frameCallback: Choreographer.FrameCallback? = null
  private var currentPublicationInfo: PublicationInfo? = null
  private var currentLocation: Locator? = null
  private var currentSelection: SelectionEvent = SelectionEvent(locator = null, selectedText = null)
  private var mediaState: MediaState = MediaState(
    state = "unsupported",
    resourceIndex = 0.0,
    position = 0.0,
    duration = null,
    totalDuration = null,
    playbackRate = 1.0,
    track = null
  )

  override val view: View get() = hostView

  init {
    hostView.addOnAttachStateChangeListener(object : View.OnAttachStateChangeListener {
      override fun onViewAttachedToWindow(v: View) {
        isAttached = true
        buildForViewIfReady()
      }
      override fun onViewDetachedFromWindow(v: View) {
        isAttached = false
        teardownFragment()
      }
    })
  }

  // MARK: - Props

  override var file: ReadiumFile? = null
    set(value) {
      val previousUrl = field?.url
      field = value
      if (value != null) {
        if (isFragmentAdded && value.url != previousUrl) {
          teardownFragment()
        }
        buildForViewIfReady()
      }
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
  override var onReady: ((event: PublicationInfo) -> Unit)? = null
  override var onError: ((error: ReadiumError) -> Unit)? = null
  override var onUnsupportedCapability: ((event: UnsupportedCapabilityEvent) -> Unit)? = null
  override var onSearchProgress: ((event: SearchProgressEvent) -> Unit)? = null
  override var onDecorationActivated: ((event: DecorationActivatedEvent) -> Unit)? = null
  override var onSelectionChange: ((event: SelectionEvent) -> Unit)? = null
  override var onSelectionAction: ((event: SelectionActionEvent) -> Unit)? = null
  override var onMediaStateChange: ((state: MediaState) -> Unit)? = null
  override var onMediaError: ((error: ReadiumError) -> Unit)? = null

  private fun ensureService() {
    if (svc == null) {
      val reactContext = (context as? com.facebook.react.uimanager.ThemedReactContext)?.reactApplicationContext
      if (reactContext != null) {
        svc = ReaderService(reactContext)
      }
    }
  }

  // MARK: - Preferences

  private fun updatePreferences() {
    val prefs = preferences ?: return
    val frag = fragment as? EpubReaderFragment ?: return
    frag.updatePreferences(nitroPreferencesToEpub(prefs))
  }

  // MARK: - Decorations

  private fun updateDecorations() {
    val groups = decorations ?: return
    val frag = fragment ?: return

    val readiumGroups = mutableMapOf<String, List<org.readium.r2.navigator.Decoration>>()
    for (group in groups) {
      readiumGroups[group.name] = group.decorations.mapNotNull { nitroDecorationToReadium(it) }
    }

    frag.applyDecorations(readiumGroups)
  }

  // MARK: - Selection Actions

  private fun updateSelectionActions() {
    val actions = selectionActions?.takeIf { it.isNotEmpty() } ?: return
    val frag = fragment as? EpubReaderFragment ?: return
    frag.updateSelectionActions(actions.map { FragmentSelectionAction(it.id, it.label) })
  }

  // MARK: - Imperative navigation

  override fun goTo(locator: Locator) {
    val action = Runnable {
      val readiumLocator = nitroLocatorToReadium(locator) ?: return@Runnable
      fragment?.go(com.reactnativereadium.utils.LinkOrLocator.Locator(readiumLocator), true)
    }
    if (android.os.Looper.myLooper() == android.os.Looper.getMainLooper()) {
      action.run()
    } else {
      hostView.post(action)
    }
  }

  override fun goForward() { fragment?.goForward() }
  override fun goBackward() { fragment?.goBackward() }
  override fun destroy() {
    if (android.os.Looper.myLooper() == android.os.Looper.getMainLooper()) {
      cleanup()
    } else {
      hostView.post { cleanup() }
    }
  }

  override fun getPublication(): Promise<PublicationInfo> =
    currentPublicationInfo?.let { Promise.resolved(it) }
      ?: Promise.rejected(IllegalStateException("Publication is not ready"))

  override fun getCurrentLocation(): Promise<Locator> =
    currentLocation?.let { Promise.resolved(it) }
      ?: Promise.rejected(IllegalStateException("Current location is not available"))

  override fun getCurrentSelection(): Promise<SelectionEvent> =
    Promise.resolved(currentSelection)

  override fun clearSelection() {
    fragment?.clearSelection()
    currentSelection = SelectionEvent(locator = null, selectedText = null)
    onSelectionChange?.invoke(currentSelection)
  }

  override fun setSelection(locator: Locator): Promise<Boolean> {
    val promise = Promise<Boolean>()
    scope.launch {
      try {
        val readiumLocator = nitroLocatorToReadium(locator)
        if (readiumLocator == null) {
          promise.resolve(false)
          return@launch
        }

        // 1. Navigate to the locator first.
        val frag = fragment
        if (frag == null) {
          promise.resolve(false)
          return@launch
        }
        frag.go(com.reactnativereadium.utils.LinkOrLocator.Locator(readiumLocator), true)

        // 2. Wait briefly for the resource to render before evaluating JS.
        delay(350)

        val epubFrag = (frag as? EpubReaderFragment)?.navigatorFragment
        if (epubFrag == null) {
          promise.resolve(false)
          return@launch
        }

        // 3. Build the JS selection script using the locator's text context.
        val highlight = readiumLocator.text.highlight.orEmpty()
        val before = readiumLocator.text.before.orEmpty()
        val after = readiumLocator.text.after.orEmpty()
        if (highlight.isEmpty()) {
          promise.resolve(false)
          return@launch
        }

        val highlightJs = JSONObject.quote(highlight)
        val beforeJs = JSONObject.quote(before)
        val afterJs = JSONObject.quote(after)

        val script = """
        (function(highlight, before, after) {
          try {
            var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            var nodes = [];
            var combined = "";
            var node;
            while ((node = walker.nextNode())) {
              nodes.push({ node: node, start: combined.length });
              combined += node.nodeValue;
            }

            var needle = before + highlight + after;
            var pos = -1;
            if (needle.length > 0) {
              pos = combined.indexOf(needle);
              if (pos >= 0) pos += before.length;
            }
            if (pos < 0) {
              pos = combined.indexOf(highlight);
            }
            if (pos < 0) return 'not-found';

            var startPos = pos;
            var endPos = pos + highlight.length;

            var startNode = null, startOffset = 0;
            var endNode = null, endOffset = 0;
            for (var i = 0; i < nodes.length; i++) {
              var n = nodes[i];
              var len = n.node.nodeValue.length;
              if (!startNode && startPos >= n.start && startPos < n.start + len) {
                startNode = n.node;
                startOffset = startPos - n.start;
              }
              if (endPos > n.start && endPos <= n.start + len) {
                endNode = n.node;
                endOffset = endPos - n.start;
                break;
              }
            }
            if (!startNode || !endNode) return 'no-node';

            var range = document.createRange();
            range.setStart(startNode, startOffset);
            range.setEnd(endNode, endOffset);

            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            try {
              var rect = range.getBoundingClientRect();
              if (rect.top < 0 || rect.bottom > window.innerHeight) {
                (startNode.parentElement || document.body).scrollIntoView({ block: 'center' });
              }
            } catch (e) {}

            return 'ok';
          } catch (e) {
            return 'error: ' + (e && e.message ? e.message : String(e));
          }
        })($highlightJs, $beforeJs, $afterJs);
        """.trimIndent()

        val result = withContext(Dispatchers.Main) {
          epubFrag.evaluateJavascript(script)
        }
        promise.resolve(result?.contains("ok") == true)
      } catch (e: Throwable) {
        Log.w(TAG, "setSelection failed: ${e.message}")
        promise.resolve(false)
      }
    }
    return promise
  }

  override fun search(query: String, options: SearchOptions?): Promise<Array<SearchResult>> {
    val error = unsupported("search", "Publication search is not implemented on Android yet")
    onUnsupportedCapability?.invoke(UnsupportedCapabilityEvent("search", currentPublicationInfo?.format, error.message))
    return Promise.rejected(UnsupportedOperationException(error.message))
  }

  override fun cancelSearch() {
    onSearchProgress?.invoke(SearchProgressEvent(query = "", resultCount = null, isComplete = true))
  }

  override fun getResource(href: String): Promise<ResourceResponse> {
    val error = unsupported("resources", "Resource extraction is not implemented on Android yet")
    onUnsupportedCapability?.invoke(UnsupportedCapabilityEvent("resources", currentPublicationInfo?.format, error.message))
    return Promise.rejected(UnsupportedOperationException(error.message))
  }

  override fun getPositions(): Promise<Array<Locator>> =
    Promise.resolved(currentPublicationInfo?.positions ?: emptyArray())

  override fun getTableOfContents(): Promise<Array<Link>> =
    Promise.resolved(currentPublicationInfo?.tableOfContents ?: emptyArray())

  override fun applyPreferences(preferences: Preferences) {
    this.preferences = preferences
  }

  override fun setPdfPreferences(preferences: PdfPreferences) {
    emitUnsupported("pdfPreferences", "PDF preferences are not implemented on Android yet")
  }

  override fun setComicPreferences(preferences: ComicPreferences) {
    emitUnsupported("comicPreferences", "Comic preferences are not implemented on Android yet")
  }

  override fun setAudioPreferences(preferences: AudioPreferences) {
    // Speed is the only preference relevant to playback today.
    preferences.speed?.let { setPlaybackRate(it.toDouble()) }
  }

  override fun play() {
    val nav = audioNavigator() ?: return emitMediaUnsupported("mediaPlayback")
    scope.launch {
      nav.play()
      refreshMediaState()
    }
  }
  override fun pause() {
    val nav = audioNavigator() ?: return emitMediaUnsupported("mediaPlayback")
    scope.launch {
      nav.pause()
      refreshMediaState()
    }
  }
  override fun stop() {
    val nav = audioNavigator() ?: return emitMediaUnsupported("mediaPlayback")
    scope.launch {
      nav.pause()
      val player = nav.asMedia3Player()
      player.seekTo(0)
      refreshMediaState()
    }
  }
  override fun seekTo(position: Double) {
    val nav = audioNavigator() ?: return emitMediaUnsupported("mediaPlayback")
    scope.launch {
      val player = nav.asMedia3Player()
      player.seekTo((position * 1000.0).toLong())
      refreshMediaState()
    }
  }
  override fun skipToNext() {
    val nav = audioNavigator() ?: return emitMediaUnsupported("mediaPlayback")
    scope.launch {
      nav.skipForward()
      refreshMediaState()
    }
  }
  override fun skipToPrevious() {
    val nav = audioNavigator() ?: return emitMediaUnsupported("mediaPlayback")
    scope.launch {
      nav.skipBackward()
      refreshMediaState()
    }
  }
  override fun setPlaybackRate(rate: Double) {
    val nav = audioNavigator()
    if (nav == null) {
      mediaState = mediaState.copy(playbackRate = rate)
      emitMediaUnsupported("mediaPlayback")
      return
    }
    scope.launch {
      val player = nav.asMedia3Player()
      player.setPlaybackSpeed(rate.toFloat())
      mediaState = mediaState.copy(playbackRate = rate)
      onMediaStateChange?.invoke(mediaState)
    }
  }

  override fun getMediaState(): Promise<MediaState> {
    if (audioNavigator() != null) {
      // Must read ExoPlayer state on main thread.
      scope.launch { refreshMediaState() }
    }
    return Promise.resolved(mediaState)
  }

  // ------- Audio helpers ------------------------------------------------

  private fun audioNavigator(): AudioNavigator<*, *>? =
    (fragment as? AudioReaderFragment)?.audioNavigatorOrNull()

  private fun refreshMediaState() {
    val nav = audioNavigator() ?: return
    val player = try { nav.asMedia3Player() } catch (e: Throwable) { return }
    val state = when {
      player.isPlaying -> "playing"
      player.playbackState == androidx.media3.common.Player.STATE_BUFFERING -> "loading"
      player.playbackState == androidx.media3.common.Player.STATE_ENDED -> "ended"
      else -> "paused"
    }
    val position = player.currentPosition / 1000.0
    val duration = if (player.duration > 0) player.duration / 1000.0 else null
    val resourceIndex = player.currentMediaItemIndex
    mediaState = MediaState(
      state = state,
      resourceIndex = resourceIndex.toDouble(),
      position = position,
      duration = duration,
      totalDuration = duration,
      playbackRate = player.playbackParameters.speed.toDouble(),
      track = null
    )
    onMediaStateChange?.invoke(mediaState)
  }

  private fun unsupported(capability: String, message: String): ReadiumError =
    ReadiumError(
      code = "UNSUPPORTED_CAPABILITY",
      message = message,
      capability = capability,
      format = currentPublicationInfo?.format,
      details = null
    )

  private fun emitUnsupported(capability: String, message: String) {
    val error = unsupported(capability, message)
    onUnsupportedCapability?.invoke(UnsupportedCapabilityEvent(capability, error.format, message))
  }

  private fun emitMediaUnsupported(capability: String) {
    val error = unsupported(capability, "Media playback is not implemented on Android yet")
    onMediaError?.invoke(error)
    onUnsupportedCapability?.invoke(UnsupportedCapabilityEvent(capability, error.format, error.message))
  }

  // MARK: - Fragment management

  /**
   * Tears down the current fragment and resets state so a new fragment can
   * be built. Safe to call multiple times. Does NOT detach hostView from the
   * tree — use [cleanup] for permanent removal.
   */
  private fun teardownFragment() {
    liveInstances.remove(instanceId)

    frameCallback?.let {
      try {
        Choreographer.getInstance().removeFrameCallback(it)
      } catch (e: Exception) {
        Log.w(TAG, "Failed to remove frame callback during teardown: ${e.message}")
      }
    }
    frameCallback = null

    fragment?.let { frag ->
      try {
        findActivity()?.supportFragmentManager
          ?.beginTransaction()
          ?.remove(frag)
          ?.commitNowAllowingStateLoss()
      } catch (e: Exception) {
        Log.w(TAG, "teardownFragment: failed to remove fragment: ${e.message}")
      }
    }

    hostView.removeAllViews()
    fragment = null
    isFragmentAdded = false
    isBuilding = false
    currentPublicationInfo = null
    currentLocation = null
    currentSelection = SelectionEvent(locator = null, selectedText = null)

    scope.cancel()
    scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
  }

  /**
   * Called by ViewManager.onDropViewInstance when Fabric permanently removes
   * the view. Tears down the fragment and physically detaches hostView from
   * the tree so it cannot overlay or intercept touches on other views.
   */
  internal fun cleanup() {
    if (isDestroyed) return
    isDestroyed = true

    teardownFragment()
    (hostView.parent as? ViewGroup)?.removeView(hostView)
  }

  private fun buildForViewIfReady() {
    if (isDestroyed) return
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

    // Force-clear any stale instances whose hostViews are still in Fabric's
    // tree from a key-change remount.
    liveInstances.values.toList().filter { it !== this }.forEach { other ->
      other.cleanup()
    }
    liveInstances[instanceId] = this

    fragment = frag
    isFragmentAdded = true
    setupLayout()

    val activity = findActivity()
    if (activity == null) {
      Log.e(TAG, "Could not find FragmentActivity")
      return
    }

    hostView.id = View.generateViewId()

    // Apply selection actions BEFORE committing so they're available
    // during onCreate when the callback is conditionally registered.
    selectionActions?.takeIf { it.isNotEmpty() }?.let { actions ->
      if (frag is EpubReaderFragment) {
        frag.updateSelectionActions(actions.map { FragmentSelectionAction(it.id, it.label) })
      }
    }

    activity.supportFragmentManager
      .beginTransaction()
      .replace(hostView.id, frag, hostView.id.toString())
      .commitNow()

    // The FragmentManager may not find hostView via activity.findViewById()
    // in React Native's Fabric view tree. Manually add the fragment's view
    // to hostView if needed.
    frag.view?.let { fragView ->
      if (fragView.parent !== hostView) {
        (fragView.parent as? ViewGroup)?.removeView(fragView)
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
    } ?: Log.w(TAG, "addFragment: fragment view is null after commitNow!")

    preferences?.let { updatePreferences() }
    decorations?.let { updateDecorations() }

    frag.channel.receive(frag) { event ->
      when (event) {
        is ReaderViewModel.Event.LocatorUpdate -> {
          val locator = readiumLocatorToNitro(event.locator)
          currentLocation = locator
          onLocationChange?.invoke(locator)
        }
        is ReaderViewModel.Event.PublicationReady -> {
          val info = readiumPublicationInfo(event.publication, event.positions)
          currentPublicationInfo = info
          onPublicationReady?.invoke(PublicationReadyEvent(
            tableOfContents = info.tableOfContents,
            positions = event.positions.map { readiumLocatorToNitro(it) }.toTypedArray(),
            metadata = readiumMetadataToNitro(event.metadata),
            format = info.format,
            capabilities = info.capabilities,
            readingOrder = info.readingOrder,
            resources = info.resources
          ))
          onReady?.invoke(info)
        }
        is ReaderViewModel.Event.DecorationActivated -> {
          val rect = event.rect?.let {
            Rect(x = it.left.toDouble(), y = it.top.toDouble(), width = it.width().toDouble(), height = it.height().toDouble())
          }
          val point = event.point?.let { Point(x = it.x.toDouble(), y = it.y.toDouble()) }
          onDecorationActivated?.invoke(DecorationActivatedEvent(
            decoration = readiumDecorationToNitro(event.decoration),
            group = event.group,
            rect = rect,
            point = point
          ))
        }
        is ReaderViewModel.Event.SelectionChanged -> {
          val selection = SelectionEvent(
            locator = event.locator?.let { readiumLocatorToNitro(it) },
            selectedText = event.selectedText
          )
          currentSelection = selection
          onSelectionChange?.invoke(selection)
        }
        is ReaderViewModel.Event.SelectionAction -> {
          onSelectionAction?.invoke(SelectionActionEvent(
            locator = readiumLocatorToNitro(event.locator),
            selectedText = event.selectedText,
            actionId = event.actionId
          ))
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

  private fun findActivity(): FragmentActivity? {
    var ctx: android.content.Context? = hostView.context
    while (ctx != null) {
      if (ctx is FragmentActivity) return ctx
      ctx = (ctx as? android.content.ContextWrapper)?.baseContext
    }
    return null
  }
}
