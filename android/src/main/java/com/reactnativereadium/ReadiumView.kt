package com.reactnativereadium

import android.view.Choreographer
import android.widget.FrameLayout
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Arguments
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.events.RCTEventEmitter
import com.reactnativereadium.reader.BaseReaderFragment
import com.reactnativereadium.reader.EpubReaderFragment
import com.reactnativereadium.reader.ReaderViewModel
import com.reactnativereadium.reader.VisualReaderFragment
import com.reactnativereadium.utils.Dimensions
import com.reactnativereadium.utils.File
import com.reactnativereadium.utils.LinkOrLocator
import org.readium.r2.navigator.epub.EpubNavigatorFragment
import org.readium.r2.navigator.epub.EpubPreferences
import org.readium.r2.shared.extensions.toMap

class ReadiumView(
  val reactContext: ThemedReactContext
) : FrameLayout(reactContext) {
  var dimensions: Dimensions = Dimensions(0,0)
  var file: File? = null
  var fragment: BaseReaderFragment? = null
  var isViewInitialized: Boolean = false
  var lateInitSerializedUserPreferences: String? = null

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
    fragment = frag
    setupLayout()
    lateInitSerializedUserPreferences?.let { updatePreferencesFromJsonString(it)}
    val activity: FragmentActivity? = reactContext.currentActivity as FragmentActivity?
    activity!!.supportFragmentManager
      .beginTransaction()
      .replace(this.id, frag, this.id.toString())
      .commit()

    val module = reactContext.getJSModule(RCTEventEmitter::class.java)
    // subscribe to reader events
    frag.channel.receive(frag) { event ->
      when (event) {
        is ReaderViewModel.Event.LocatorUpdate -> {
          val json = event.locator.toJSON()
          val payload = Arguments.makeNativeMap(json.toMap())
          module.receiveEvent(
            this.id.toInt(),
            ReadiumViewManager.ON_LOCATION_CHANGE,
            payload
          )
        }
        is ReaderViewModel.Event.TableOfContentsLoaded -> {
          val map = event.toc.map { it.toJSON().toMap() }
          val payload = Arguments.makeNativeMap(mapOf("toc" to map))
          module.receiveEvent(
            this.id.toInt(),
            ReadiumViewManager.ON_TABLE_OF_CONTENTS,
            payload
          )
        }
        else -> {
          // do nothing
        }
      }
    }
  }

  private fun setupLayout() {
    Choreographer.getInstance().postFrameCallback(object : Choreographer.FrameCallback {
      override fun doFrame(frameTimeNanos: Long) {
        manuallyLayoutChildren()
        this@ReadiumView.viewTreeObserver.dispatchOnGlobalLayout()
        Choreographer.getInstance().postFrameCallback(this)
      }
    })
  }

  /**
   * Layout all children properly
   */
  private fun manuallyLayoutChildren() {
    // propWidth and propHeight coming from react-native props
    val width = dimensions.width
    val height = dimensions.height
    this.measure(
      MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY))
    this.layout(0, 0, width, height)
  }
}
