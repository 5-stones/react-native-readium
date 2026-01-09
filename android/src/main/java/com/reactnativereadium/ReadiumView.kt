package com.reactnativereadium

import android.util.Log
import android.view.Choreographer
import android.widget.FrameLayout
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import com.reactnativereadium.reader.BaseReaderFragment
import com.reactnativereadium.reader.EpubReaderFragment
import com.reactnativereadium.reader.ReaderViewModel
import com.reactnativereadium.utils.Dimensions
import com.reactnativereadium.utils.File
import com.reactnativereadium.utils.LinkOrLocator
import com.reactnativereadium.utils.toWritableArray
import com.reactnativereadium.utils.toWritableMap
import kotlinx.coroutines.launch
import org.readium.r2.shared.publication.Locator
import org.readium.r2.shared.publication.services.positions

class ReadiumView(
  val reactContext: ThemedReactContext
) : FrameLayout(reactContext) {
  companion object {
    private const val TAG = "ReadiumView"
  }

  var dimensions: Dimensions = Dimensions(0, 0)
  var file: File? = null
  var fragment: BaseReaderFragment? = null
  var isViewInitialized: Boolean = false
  var isFragmentAdded: Boolean = false
  var lateInitSerializedUserPreferences: String? = null

  var showPageNumbers: Boolean = true
  var totalPositions: Int? = null
  var isComputingTotalPositions: Boolean = false
  var lastKnownPosition: Int? = null

  private var frameCallback: Choreographer.FrameCallback? = null

  fun updateLocation(location: LinkOrLocator): Boolean {
    val frag = fragment ?: return false
    return frag.go(location, true)
  }

  fun updatePreferencesFromJsonString(preferences: String?) {
    lateInitSerializedUserPreferences = preferences
    if (preferences == null || fragment == null) {
      return
    }

    // Positions can change when preferences (font size, scroll mode, etc.) change.
    totalPositions = null
    isComputingTotalPositions = false

    if (fragment is EpubReaderFragment) {
      (fragment as EpubReaderFragment).updatePreferencesFromJsonString(preferences)
    }
  }

  fun addFragment(frag: BaseReaderFragment) {
    if (isFragmentAdded) return

    fragment = frag
    isFragmentAdded = true

    setupLayout()
    lateInitSerializedUserPreferences?.let { updatePreferencesFromJsonString(it) }

    val activity = reactContext.currentActivity as? FragmentActivity
    if (activity == null) {
      Log.w(TAG, "addFragment: currentActivity is null, cannot add fragment")
      return
    }

    activity.supportFragmentManager
      .beginTransaction()
      .replace(this.id, frag, this.id.toString())
      .commitNow()

    frag.view?.layoutParams = FrameLayout.LayoutParams(
      FrameLayout.LayoutParams.MATCH_PARENT,
      FrameLayout.LayoutParams.MATCH_PARENT
    )

    val eventDispatcher = UIManagerHelper.getEventDispatcherForReactTag(reactContext, this.id)

    val dispatch: (String, WritableMap?) -> Unit = { eventName, payload ->
      if (eventDispatcher != null) {
        eventDispatcher.dispatchEvent(ReadiumEvent(this.id, eventName, payload))
      } else {
        Log.w(TAG, "EventDispatcher is null for view id ${this.id}")
      }
    }

    frag.channel.receive(frag) { event ->
      when (event) {
        is ReaderViewModel.Event.LocatorUpdate -> {
          dispatch(ReadiumViewManager.ON_LOCATION_CHANGE, event.locator.toWritableMap())
          updatePositionTextIfNeeded(event.locator)
        }
        is ReaderViewModel.Event.TableOfContentsLoaded -> {
          val payload = Arguments.createMap().apply {
            putArray("toc", event.toc.toWritableArray())
          }
          dispatch(ReadiumViewManager.ON_TABLE_OF_CONTENTS, payload)
        }
        else -> {
          // do nothing
        }
      }
    }

    applyShowPageNumbersToFragmentView()
    ensureTotalPositionsAsync()
  }

  private class ReadiumEvent(
    viewTag: Int,
    private val _eventName: String,
    private val _eventData: WritableMap?
  ) : Event<ReadiumEvent>(viewTag) {
    override fun getEventName(): String = _eventName
    override fun getEventData(): WritableMap? = _eventData
  }

  private fun applyShowPageNumbersToFragmentView() {
    val label = fragment?.view?.findViewById<android.view.View>(R.id.reader_position_label)
    if (label != null) {
      label.visibility = if (showPageNumbers) android.view.View.VISIBLE else android.view.View.GONE
    }
  }

  private fun ensureTotalPositionsAsync() {
    val frag = fragment ?: return
    if (totalPositions != null || isComputingTotalPositions) return
    isComputingTotalPositions = true

    frag.lifecycleScope.launch {
      try {
        totalPositions = frag.publication().positions().size
      } catch (e: Exception) {
        Log.w(TAG, "Failed to compute total positions: ${e.message}")
      } finally {
        isComputingTotalPositions = false
        lastKnownPosition?.let { updatePositionLabelText(it) }
      }
    }
  }

  private fun updatePositionLabelText(position: Int) {
    val label = fragment?.view?.findViewById<android.widget.TextView>(R.id.reader_position_label)
      ?: return

    val total = totalPositions
    label.text = if (total != null && total > 0) {
      "$position / $total"
    } else {
      position.toString()
    }
  }

  private fun updatePositionTextIfNeeded(locator: Locator) {
    try {
      applyShowPageNumbersToFragmentView()
      if (!showPageNumbers) return

      val position = locator.locations.position ?: return
      lastKnownPosition = position

      if (totalPositions == null) {
        ensureTotalPositionsAsync()
      }

      updatePositionLabelText(position)
    } catch (e: Exception) {
      Log.w(TAG, "Failed to update position text: ${e.message}")
    }
  }

  private fun setupLayout() {
    frameCallback = object : Choreographer.FrameCallback {
      override fun doFrame(frameTimeNanos: Long) {
        manuallyLayoutChildren()
        this@ReadiumView.viewTreeObserver.dispatchOnGlobalLayout()
        Choreographer.getInstance().postFrameCallback(this)
      }
    }
    frameCallback?.let { Choreographer.getInstance().postFrameCallback(it) }
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    frameCallback?.let {
      try {
        Choreographer.getInstance().removeFrameCallback(it)
      } catch (e: Exception) {
        Log.w(TAG, "Failed to remove frame callback: ${e.message}")
      }
    }
    frameCallback = null
  }

  private fun manuallyLayoutChildren() {
    val width = dimensions.width
    val height = dimensions.height

    for (i in 0 until childCount) {
      val child = getChildAt(i)
      child.measure(
        MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
        MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
      )
      child.layout(0, 0, width, height)
    }
  }
}


