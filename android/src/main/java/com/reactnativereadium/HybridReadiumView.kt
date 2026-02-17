package com.margelo.nitro.reactnativereadium

import android.util.Log
import android.view.Choreographer
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.fragment.app.FragmentActivity
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
import com.reactnativereadium.utils.readiumDecorationToNitro
import com.reactnativereadium.utils.readiumMetadataToNitro
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

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
    val frag = fragment ?: return
    val readiumLocator = nitroLocatorToReadium(loc) ?: return
    frag.go(com.reactnativereadium.utils.LinkOrLocator.Locator(readiumLocator), true)
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

  override fun goForward() { fragment?.goForward() }
  override fun goBackward() { fragment?.goBackward() }
  override fun destroy() { cleanup() }

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
          onLocationChange?.invoke(readiumLocatorToNitro(event.locator))
        }
        is ReaderViewModel.Event.PublicationReady -> {
          onPublicationReady?.invoke(PublicationReadyEvent(
            tableOfContents = event.tableOfContents.map { readiumLinkToNitro(it) }.toTypedArray(),
            positions = event.positions.map { readiumLocatorToNitro(it) }.toTypedArray(),
            metadata = readiumMetadataToNitro(event.metadata)
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
