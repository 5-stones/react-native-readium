package com.reactnativereadium

import android.util.Log
import android.view.Choreographer
import android.widget.FrameLayout
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import com.reactnativereadium.reader.BaseReaderFragment
import com.reactnativereadium.reader.EpubReaderFragment
import com.reactnativereadium.reader.ReaderViewModel
import com.reactnativereadium.reader.VisualReaderFragment
import com.reactnativereadium.utils.Dimensions
import com.reactnativereadium.utils.File
import com.reactnativereadium.utils.LinkOrLocator
import com.reactnativereadium.utils.toWritableArray
import com.reactnativereadium.utils.toWritableMap
import org.readium.r2.navigator.epub.EpubNavigatorFragment
import org.readium.r2.navigator.epub.EpubPreferences

class ReadiumView(
  val reactContext: ThemedReactContext
) : FrameLayout(reactContext) {
  companion object {
    private const val TAG = "ReadiumView"
  }

  var dimensions: Dimensions = Dimensions(0,0)
  var file: File? = null
  var fragment: BaseReaderFragment? = null
  var isViewInitialized: Boolean = false
  var isFragmentAdded: Boolean = false
  var lateInitSerializedUserPreferences: String? = null
  private var frameCallback: Choreographer.FrameCallback? = null

  fun updateLocation(location: LinkOrLocator) : Boolean {
    if (fragment == null) {
      return false
    } else {
      return this.fragment!!.go(location, true)
    }
  }

  fun updatePreferencesFromJsonString(preferences: String?) {
    lateInitSerializedUserPreferences = preferences
    if (preferences == null || fragment == null) {
      return
    }

    if (fragment is EpubReaderFragment) {
      (fragment as EpubReaderFragment).updatePreferencesFromJsonString(preferences)
    }
  }

  fun addFragment(frag: BaseReaderFragment) {
    if (isFragmentAdded) {
      return
    }

    fragment = frag
    isFragmentAdded = true
    setupLayout()
    lateInitSerializedUserPreferences?.let { updatePreferencesFromJsonString(it)}
    val activity = reactContext.currentActivity as? FragmentActivity
    if (activity == null) {
      Log.w(TAG, "addFragment: currentActivity is null, cannot add fragment")
      return
    }

    activity.supportFragmentManager
      .beginTransaction()
      .replace(this.id, frag, this.id.toString())
      .commitNow()

    // Ensure the fragment's view fills the container
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

    // subscribe to reader events
    frag.channel.receive(frag) { event ->
      when (event) {
        is ReaderViewModel.Event.LocatorUpdate -> {
          val payload = event.locator.toWritableMap()
          dispatch(ReadiumViewManager.ON_LOCATION_CHANGE, payload)
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
  }

  // Custom event class for new architecture
  private class ReadiumEvent(
    viewTag: Int,
    private val _eventName: String,
    private val _eventData: WritableMap?
  ) : Event<ReadiumEvent>(viewTag) {
    override fun getEventName(): String = _eventName
    override fun getEventData(): WritableMap? = _eventData
  }

  private fun setupLayout() {
    // keep a reference so we can remove the callback when the view is detached
    frameCallback = object : Choreographer.FrameCallback {
      override fun doFrame(frameTimeNanos: Long) {
        manuallyLayoutChildren()
        this@ReadiumView.viewTreeObserver.dispatchOnGlobalLayout()
        Choreographer.getInstance().postFrameCallback(this)
      }
    }
    frameCallback!!.let { Choreographer.getInstance().postFrameCallback(it) }
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    // remove frame callback to avoid leaks/continuous callbacks after view is destroyed
    frameCallback?.let {
      try {
        Choreographer.getInstance().removeFrameCallback(it)
      } catch (e: Exception) {
        Log.w(TAG, "Failed to remove frame callback: ${e.message}")
      }
    }
    frameCallback = null
  }

  /**
   * Layout all children properly
   */
  private fun manuallyLayoutChildren() {
    // propWidth and propHeight coming from react-native props
    val width = dimensions.width
    val height = dimensions.height

    // Measure and layout each child within this container
    for (i in 0 until childCount) {
      val child = getChildAt(i)
      child.measure(
        MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
        MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
      )
      // Position child at (0, 0) within this container, filling the container
      child.layout(0, 0, width, height)
    }
  }
}

