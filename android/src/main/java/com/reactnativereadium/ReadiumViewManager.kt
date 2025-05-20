package com.reactnativereadium

import com.facebook.react.bridge.*
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.annotations.ReactPropGroup
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.reactnativereadium.reader.ReaderService
import com.reactnativereadium.utils.File
import com.reactnativereadium.utils.LinkOrLocator
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.readium.r2.shared.publication.Link
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
    val location = file.getMap("initialLocation")
    var initialLocation: LinkOrLocator? = null

    if (location != null) {
      initialLocation = locationToLinkOrLocator(location)
    }

    view.file = File(path, initialLocation)
    this.buildForViewIfReady(view)
  }

  fun locationToLinkOrLocator(location: ReadableMap): LinkOrLocator? {
    val json = JSONObject(location.toHashMap() as HashMap<*, *>)
    val hasLocations = json.has("locations")
    val hasChildren = json.has("children")
    val hasHashHref = (json.get("href") as String).contains("#")
    var linkOrLocator: LinkOrLocator? = null

    if ((hasChildren || hasHashHref) && !hasLocations) {
      val link = Link.fromJSON(json)
      if (link != null) {
        linkOrLocator = LinkOrLocator.Link(link)
      }
    } else {
      val locator = Locator.fromJSON(json)
      if (locator != null) {
        linkOrLocator = LinkOrLocator.Locator(locator)
      }
    }

    return linkOrLocator;
  }

  @ReactProp(name = "location")
  fun setLocation(view: ReadiumView, location: ReadableMap) {
    var linkOrLocator: LinkOrLocator? = locationToLinkOrLocator(location)

    if (linkOrLocator != null) {
      view.updateLocation(linkOrLocator)
    }
  }

  @ReactProp(name = "settings")
  fun setSettings(view: ReadiumView, settings: ReadableMap) {
    val map = mutableMapOf<String, Any>()
    settings.toHashMap().forEach { (key, value) -> if (value != null) map[key] = value }
    view.updateSettingsFromMap(map)
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
