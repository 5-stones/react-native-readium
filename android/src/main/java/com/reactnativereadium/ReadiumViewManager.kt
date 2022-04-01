package com.reactnativereadium

import com.facebook.react.bridge.*
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.annotations.ReactPropGroup
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.reactnativereadium.reader.ReaderService
import com.reactnativereadium.utils.File
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.readium.r2.shared.publication.Locator


class ReadiumViewManager(
  val reactContext: ReactApplicationContext
) : ViewGroupManager<ReadiumView>() {
  private var svc = ReaderService(reactContext)

  override fun getName() = "ReadiumView"

  override fun createViewInstance(reactContext: ThemedReactContext): ReadiumView {
    return ReadiumView(reactContext)
  }

  override fun getExportedCustomBubblingEventTypeConstants(): Map<String, Any> {
    return MapBuilder.builder<String, Any>()
      .put(
        ON_LOCATION_CHANGE,
        MapBuilder.of(
          "phasedRegistrationNames",
          MapBuilder.of("bubbled", ON_LOCATION_CHANGE)
        )
      )
      .put(
        ON_TABLE_OF_CONTENTS,
        MapBuilder.of(
          "phasedRegistrationNames",
          MapBuilder.of("bubbled", ON_TABLE_OF_CONTENTS)
        )
      )
      .build()
  }

  override fun getCommandsMap(): MutableMap<String, Int> {
    return MapBuilder.of("create", COMMAND_CREATE)
  }

  override fun receiveCommand(view: ReadiumView, commandId: String?, args: ReadableArray?) {
    super.receiveCommand(view, commandId, args)
    val reactNativeViewId = args!!.getInt(0)
    val commandIdInt = commandId!!.toInt()

    when (commandIdInt) {
      COMMAND_CREATE -> {
        view.isViewInitialized = true

        if (view.file != null) {
          buildForViewIfReady(view)
        }
      }
      else -> {
      }
    }
  }

  @ReactProp(name = "file")
  fun setFile(view: ReadiumView, file: ReadableMap) {
    val path = (file.getString("url") ?: "")
      .replace("^(file:/+)?(/.*)$".toRegex(), "$2")
    val locatorMap = file.getMap("initialLocation")
    var initialLocation: Locator? = null

    if (locatorMap != null) {
      initialLocation = Locator.fromJSON(JSONObject(locatorMap.toHashMap()))
    }

    view.file = File(path, initialLocation)
    this.buildForViewIfReady(view)
  }

  @ReactProp(name = "location")
  fun setLocation(view: ReadiumView, location: ReadableMap) {
    val locator = Locator.fromJSON(JSONObject(location.toHashMap()))

    if (locator != null) {
      view.updateLocation(locator)
    }
  }

  @ReactProp(name = "settings")
  fun setSettings(view: ReadiumView, settings: ReadableMap) {
    view.updateSettingsFromMap(settings.toHashMap())
  }

  @ReactPropGroup(names = ["width", "height"], customType = "Style")
  fun setStyle(view: ReadiumView?, index: Int, value: Int) {
    if (index == 0) {
      view?.dimensions?.width = value
    }
    if (index == 1) {
      view?.dimensions?.height = value
    }
  }

  private fun buildForViewIfReady(view: ReadiumView) {
    var file = view.file
    if (file != null && view.isViewInitialized) {
      runBlocking {
        svc.openPublication(file.path, file.initialLocation) { fragment ->
          view.addFragment(fragment)
        }
      }
    }
  }

  companion object {
    var ON_LOCATION_CHANGE = "onLocationChange"
    var ON_TABLE_OF_CONTENTS = "onTableOfContents"
    var COMMAND_CREATE = 1
  }
}
