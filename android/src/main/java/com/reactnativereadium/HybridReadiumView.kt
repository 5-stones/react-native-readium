package com.margelo.nitro.reactnativereadium

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

  // MARK: - Decorations

  private fun updateDecorations() {
    val groups = decorations ?: return
    if (fragment == null) return

    val readiumGroups = mutableMapOf<String, List<org.readium.r2.navigator.Decoration>>()
    for (group in groups) {
      readiumGroups[group.name] = group.decorations.mapNotNull { nitroDecorationToReadium(it) }
    }

    fragment?.applyDecorations(readiumGroups)
  }

  // MARK: - Selection Actions

  private fun updateSelectionActions() {
    val actions = selectionActions?.takeIf { it.isNotEmpty() } ?: return
    if (fragment == null) return

    val fragmentActions = actions.map { FragmentSelectionAction(it.id, it.label) }
    if (fragment is EpubReaderFragment) {
      (fragment as EpubReaderFragment).updateSelectionActions(fragmentActions)
    }
  }

  // MARK: - Imperative navigation

  override fun goForward() { fragment?.goForward() }
  override fun goBackward() { fragment?.goBackward() }

  // MARK: - Fragment management

  private fun teardownFragment() {
    liveInstances.remove(instanceId)

    // Stop the frame callback loop
    frameCallback?.let {
      try {
        Choreographer.getInstance().removeFrameCallback(it)
      } catch (e: Exception) {
        Log.w(TAG, "Failed to remove frame callback during teardown: ${e.message}")
      }
    }
    frameCallback = null

    // Remove the old fragment from the FragmentManager
    fragment?.let { frag ->
      try {
        val activity = findActivity()
        activity?.supportFragmentManager
          ?.beginTransaction()
          ?.remove(frag)
          ?.commitNowAllowingStateLoss()
      } catch (e: Exception) {
        Log.w(TAG, "teardownFragment: failed to remove fragment: ${e.message}")
      }
    }

    // Clear the hostView children and reset state
    hostView.removeAllViews()
    fragment = null
    isFragmentAdded = false
    isBuilding = false

    // Replace the cancelled scope with a fresh one
    scope.cancel()
    scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
  }

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

    // Force-clear any stale instances whose hostViews are still in Fabric's
    // tree. Teardown removes their fragment + children; GONE hides the
    // hostView in case the WebView's hardware layer persists.
    liveInstances.values.toList().filter { it !== this }.forEach { other ->
      other.teardownFragment()
      other.hostView.visibility = View.GONE
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
    } ?: Log.w(TAG, "addFragment: fragment view is null after commitNow!")

    // Apply pending state
    preferences?.let { updatePreferences() }
    decorations?.let { updateDecorations() }

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

  private fun findActivity(): FragmentActivity? {
    return hostView.context as? FragmentActivity
      ?: (hostView.context as? android.content.ContextWrapper)?.let {
        var ctx = it.baseContext
        while (ctx is android.content.ContextWrapper) {
          if (ctx is FragmentActivity) return ctx
          ctx = ctx.baseContext
        }
        null
      }
  }
}
