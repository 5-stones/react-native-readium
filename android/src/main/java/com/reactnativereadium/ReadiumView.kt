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
import com.reactnativereadium.utils.Dimensions
import org.readium.r2.shared.extensions.toMap
import org.readium.r2.shared.publication.Locator

class ReadiumView(
  val reactContext: ThemedReactContext
) : FrameLayout(reactContext) {
  var dimensions: Dimensions = Dimensions(0,0)
  var fragment: BaseReaderFragment? = null

  fun updateLocation(locator: Locator) : Boolean {
    if (fragment == null) {
      return false
    } else {
      return this.fragment!!.go(locator, true)
    }
  }

  fun updateSettingsFromMap(map: Map<String, Any>) {
    if (fragment != null && fragment is EpubReaderFragment) {
      (fragment as EpubReaderFragment).updateSettingsFromMap(map)
    }
  }

  fun addFragment(frag: BaseReaderFragment) {
    fragment = frag
    setupLayout()
    val activity: FragmentActivity? = reactContext.currentActivity as FragmentActivity?
    activity!!.supportFragmentManager
      .beginTransaction()
      .replace(this.id, frag, this.id.toString())
      .commit()

    // subscribe to reader events
    frag.channel.receive(frag) { event ->
      val module = reactContext.getJSModule(RCTEventEmitter::class.java)
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
