package com.margelo.nitro.reactnativereadium

import android.util.Log
import android.view.Choreographer
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.fragment.app.FragmentActivity
import com.reactnativereadium.ReaderHostView
import com.reactnativereadium.reader.BaseReaderFragment
import com.reactnativereadium.reader.EpubReaderFragment
import com.reactnativereadium.reader.PdfReaderFragment
import com.reactnativereadium.reader.ReaderService
import com.reactnativereadium.reader.SourceRecovery
import com.reactnativereadium.reader.ReaderViewModel
import com.reactnativereadium.reader.SearchPageData
import com.reactnativereadium.reader.SelectionAction as FragmentSelectionAction
import com.reactnativereadium.utils.nitroPreferencesToEpub
import com.reactnativereadium.utils.nitroPreferencesToPdf
import com.reactnativereadium.utils.nitroLocatorToReadium
import com.reactnativereadium.utils.nitroDecorationToReadium
import com.reactnativereadium.utils.readiumLocatorToNitro
import com.reactnativereadium.utils.flattenReadiumLinks
import com.reactnativereadium.utils.readiumDecorationToNitro
import com.reactnativereadium.utils.readiumCapabilities
import com.reactnativereadium.utils.readiumMetadataToNitro
import com.reactnativereadium.utils.nitroSearchOptionsToReadium
import com.reactnativereadium.utils.nitroSearchResultFromReadium
import com.margelo.nitro.core.Promise
import org.readium.r2.shared.publication.services.isProtected
import org.readium.r2.shared.publication.services.protectionScheme
import org.readium.r2.shared.publication.services.search.SearchService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.readium.r2.shared.util.AbsoluteUrl

class HybridReadiumView(private val context: android.content.Context) : HybridReadiumViewSpec() {
  companion object {
    private const val CONTAINER_ID_ATTEMPTS = 20
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
  private val hostView = ReaderHostView(context)
  private var scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
  private var svc: ReaderService? = null
  private var fragment: BaseReaderFragment? = null
  private var isFragmentAdded = false
  private var isBuilding = false
  /** The `file` most recently opened, kept after a failure so the same values don't reopen. */
  private var openedKey: OpenKey? = null
  /** Bumped on every open and teardown, so a superseded open can't deliver its result. */
  private var openGeneration = 0
  private var isAttached = false
  private var isDestroyed = false
  private var frameCallback: Choreographer.FrameCallback? = null

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
      field = value
      if (value == null) return
      val key = OpenKey(value.url, value.credentials)
      // A re-render with the same values must not reopen, or a failure would loop.
      if (key == openedKey) return
      // New credentials are only for retrying a failed open, not for a book already showing.
      if (isFragmentAdded && value.url == openedKey?.url) return
      // Supersede whatever is showing or still opening.
      if (isFragmentAdded || isBuilding) teardownFragment()
      // Opening waits for `afterUpdate`: `resolveSource` is a prop too, and a
      // publication opened before it arrived would be fetched from its
      // identity url rather than from a location that works.
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
  override var onPreferencesChanged: ((event: PreferencesChangedEvent) -> Unit)? = null
  override var onPublicationError: ((event: PublicationErrorEvent) -> Unit)? = null
  override var shouldRefreshSource:
    ((failure: SourceRequestFailure) -> Promise<Promise<Boolean>>)? = null
    set(value) {
      field = value
      // Awaiting an answer from JS, and surviving one that never comes, is
      // the view's side of the bridge.
      recovery.shouldRefresh = value?.let { decide ->
        { failure -> runCatching { decide(failure).await().await() }.getOrDefault(false) }
      }
    }
  override var resolveSource:
    ((request: ResolveSourceRequest) -> Promise<Promise<PublicationSource>>)? = null
    set(value) {
      field = value
      recovery.resolveLocation = value?.let { resolve ->
        { identity ->
          runCatching {
            resolve(
              ResolveSourceRequest(url = identity, reason = SourceRequestReason.REFRESH)
            ).await().await().url
          }.getOrNull()
        }
      }
    }

  /**
   * Answers a failed read by moving the publication. See [SourceRecovery],
   * which holds the policy, the budget and the one-at-a-time rule.
   */
  private val recovery = SourceRecovery(
    identity = { file?.url },
    currentLocation = { svc?.sourceLocation?.toString() },
    apply = { url ->
      val parsed = runCatching { AbsoluteUrl(url) }.getOrNull()
      if (parsed != null) svc?.setSourceLocation(parsed)
      parsed != null
    },
    report = { failure ->
      // The same callback an open failure goes through: what tells the two
      // apart is the code, and JS turns that into the event's `stage`.
      onPublicationError?.invoke(
        PublicationErrorEvent(
          url = failure.url,
          code = PublicationErrorCode.READFAILED,
          stage = PublicationErrorStage.READ,
          // The wording that goes with `code` is JS's to fill in.
          message = "",
          detail = failure.detail,
          protectionScheme = null,
          status = failure.status,
          kind = failure.kind
        )
      )
    }
  )

  override var onDecorationActivated: ((event: DecorationActivatedEvent) -> Unit)? = null
  override var onSelectionChange: ((event: SelectionEvent) -> Unit)? = null
  override var onSelectionAction: ((event: SelectionActionEvent) -> Unit)? = null
  /**
   * Never called here. AndroidPdfViewer zooms on a pinch by itself and reports
   * nothing back, so there is nothing to relay — the prop exists because the
   * view has one definition, and web does have something to say.
   */
  override var onZoomChange: ((event: ZoomEvent) -> Unit)? = null

  /**
   * Every prop for this render has arrived.
   *
   * Props are set one at a time and in no order this view controls, so
   * opening from any single setter risks opening without the others —
   * `resolveSource` above all, whose absence means fetching the identity url
   * itself.
   */
  override fun afterUpdate() {
    buildForViewIfReady()
  }

  private fun ensureService() {
    if (svc == null) {
      val reactContext = (context as? com.facebook.react.uimanager.ThemedReactContext)?.reactApplicationContext
      if (reactContext != null) {
        svc = ReaderService(reactContext).also {
          it.recoverRead = { url, error -> recovery.answer(url.toString(), error) }
          it.onReadSucceeded = recovery::noteReadSucceeded
          // A new publication starts with a whole budget: what the last one
          // spent says nothing about this one.
          it.onPublicationOpening = recovery::noteReadSucceeded
        }
      }
    }
  }

  // MARK: - Preferences

  private fun updatePreferences() {
    val prefs = preferences ?: return
    val currentFragment = fragment ?: return
    val pub = runCatching { currentFragment.publication }.getOrNull() ?: return

    when (currentFragment) {
      is EpubReaderFragment ->
        currentFragment.updatePreferences(nitroPreferencesToEpub(prefs))
      is PdfReaderFragment ->
        currentFragment.updatePreferences(nitroPreferencesToPdf(prefs))
    }

    onPreferencesChanged?.invoke(PreferencesChangedEvent(
      capabilities = readiumCapabilities(
        pub,
        currentFragment.navigator,
        prefs
      )
    ))

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

  override fun search(query: String, options: SearchOptions?): Promise<SearchPage> {
    val frag = fragment as? EpubReaderFragment
      ?: return Promise.resolved(unsupportedSearchPage())
    val readiumOptions = options?.let { nitroSearchOptionsToReadium(it) } ?: SearchService.Options()
    // Run on the view's lifecycle scope so an in-flight search is cancelled when
    // the view is torn down (see [scope], cancelled in teardown).
    return Promise.async(scope) {
      frag.startSearch(query, readiumOptions).toNitro()
    }
  }

  override fun loadMoreSearchResults(): Promise<SearchPage> {
    val frag = fragment as? EpubReaderFragment
      ?: return Promise.resolved(unsupportedSearchPage())
    return Promise.async(scope) {
      frag.loadMoreSearchResults().toNitro()
    }
  }

  override fun cancelSearch() {
    (fragment as? EpubReaderFragment)?.let { frag -> hostView.post { frag.cancelSearch() } }
  }

  // AndroidPdfViewer owns its own magnification: it zooms on a pinch and takes
  // no instruction, so these are declared and do nothing. Web implements them.
  override fun zoomIn() {}

  override fun zoomOut() {}

  override fun setZoom(scale: Double) {}

  override fun resetZoom() {}

  private fun unsupportedSearchPage(): SearchPage =
    SearchPage(results = emptyArray(), hasMore = false, totalCount = null, isSupported = false)

  private fun SearchPageData.toNitro(): SearchPage =
    SearchPage(
      results = results.map { nitroSearchResultFromReadium(it) }.toTypedArray(),
      hasMore = hasMore,
      totalCount = totalCount?.toDouble(),
      isSupported = isSupported
    )

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
    // Re-attaching reopens the current file.
    openedKey = null
    openGeneration++

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
    // Nothing is waiting on a relocation for a view that is gone.
    recovery.close()
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
    openedKey = OpenKey(fileUrl, currentFile.credentials)
    val generation = ++openGeneration

    val initialLocator = currentFile.initialLocation?.let { loc ->
      nitroLocatorToReadium(loc)?.let { com.reactnativereadium.utils.LinkOrLocator.Locator(it) }
    }

    scope.launch {
      // `file.url` names the publication; where its bytes are is something
      // else, and only the consumer knows. Asked once here, and again by
      // `recoverRead` when a location stops working.
      val location = resolveSource?.let { resolve ->
        val answer = runCatching {
          resolve(
            ResolveSourceRequest(url = fileUrl, reason = SourceRequestReason.OPEN)
          ).await().await().url
        }

        answer.getOrNull()?.takeIf { it.isNotEmpty() } ?: run {
          isBuilding = false
          if (generation == openGeneration) {
            onPublicationError?.invoke(PublicationErrorEvent(
              url = fileUrl,
              code = PublicationErrorCode.OPENFAILED,
              stage = PublicationErrorStage.OPEN,
              // The wording that goes with `code` is JS's to fill in.
              message = "",
              detail = answer.exceptionOrNull()?.message
                ?: "resolveSource gave no location for this publication.",
              protectionScheme = null,
              status = null,
              kind = null
            ))
          }
          return@launch
        }
      } ?: fileUrl

      // A path or a file:// URL as given: fileFromPath decodes the URL's percent-escapes.
      service.openPublication(
        location,
        initialLocator,
        currentFile.credentials,
        onError = onError@{ error ->
          if (generation != openGeneration) return@onError
          // openedKey stays, so only a `file` with different values retries.
          isBuilding = false
          onPublicationError?.invoke(PublicationErrorEvent(
            url = fileUrl,
            code = error.code,
            stage = PublicationErrorStage.OPEN,
            // The wording that goes with `code` is JS's to fill in.
            message = "",
            detail = error.message,
            protectionScheme = error.protectionScheme,
            // Only a failed read has either.
            status = null,
            kind = null
          ))
        }
      ) { frag ->
        if (generation == openGeneration) addFragment(frag)
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

    val containerId = assignContainerId(activity)

    // Apply selection actions BEFORE committing so they're available
    // during onCreate when the callback is conditionally registered.
    selectionActions?.takeIf { it.isNotEmpty() }?.let { actions ->
      if (frag is EpubReaderFragment) {
        frag.updateSelectionActions(actions.map { FragmentSelectionAction(it.id, it.label) })
      }
    }

    activity.supportFragmentManager
      .beginTransaction()
      .replace(containerId, frag, containerId.toString())
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
          onLocationChange?.invoke(readiumLocatorToNitro(event.locator))
        }
        is ReaderViewModel.Event.PublicationReady -> {
          onPublicationReady?.invoke(PublicationReadyEvent(
            tableOfContents = flattenReadiumLinks(event.tableOfContents).toTypedArray(),
            positions = event.positions.map { readiumLocatorToNitro(it) }.toTypedArray(),
            metadata = readiumMetadataToNitro(event.metadata),
            capabilities = readiumCapabilities(
              event.publication,
              frag.navigator,
              preferences
            ),
            isProtected = event.publication.isProtected,
            protectionScheme = event.publication.protectionScheme?.uri
          ))
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
          onSelectionChange?.invoke(SelectionEvent(
            locator = event.locator?.let { readiumLocatorToNitro(it) },
            selectedText = event.selectedText
          ))
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

  /**
   * Gives [hostView] an id that FragmentManager will resolve back to it, and
   * returns that id.
   *
   * FragmentManager looks the container up with `activity.findViewById()`, so a
   * colliding id silently attaches the reader somewhere else entirely.
   * `View.generateViewId()` draws from a process-wide counter starting at 1, and
   * React Native labels its root views with the surface tag - also a small
   * integer - so the first id generated in a process is typically 1, the very id
   * `ReactSurfaceView` carries. The fragment then lands on the React root, and
   * the corrective re-parent in [addFragment] has to move an already-attached
   * view. That is fatal for PDF: AndroidPdfViewer's `PDFView` nulls its rendering
   * `HandlerThread` in `onDetachedFromWindow()` and never recreates it, so the
   * next `load()` completes into a NullPointerException.
   */
  private fun assignContainerId(activity: FragmentActivity): Int {
    repeat(CONTAINER_ID_ATTEMPTS) {
      val candidate = View.generateViewId()
      hostView.id = candidate

      when (activity.findViewById<View>(candidate)) {
        // Resolves to us: FragmentManager will attach the fragment to hostView.
        hostView -> return candidate
        // Unreachable from the activity, so nothing can collide with it either.
        // FragmentManager resolves a null container and leaves the fragment view
        // unparented, which addFragment then adopts without detaching anything.
        null -> return candidate
        // Collision with another view - try a different id.
        else -> Unit
      }
    }

    Log.w(TAG, "addFragment: could not find a non-colliding container id for hostView")
    return hostView.id
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

/** What identifies an open: retrying the same file with new credentials is a new open. */
private data class OpenKey(val url: String, val credentials: String?)
