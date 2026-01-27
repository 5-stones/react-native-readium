package com.reactnativereadium

import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.annotations.ReactPropGroup
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.reactnativereadium.reader.ReaderService
import com.reactnativereadium.utils.File
import com.reactnativereadium.utils.LinkOrLocator
import com.reactnativereadium.utils.normalizedLocation
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
        ON_PUBLICATION_READY,
        MapBuilder.of(
          "phasedRegistrationNames",
          MapBuilder.of("bubbled", ON_PUBLICATION_READY)
        )
      )
      .put(
        ON_DECORATION_ACTIVATED,
        MapBuilder.of(
          "phasedRegistrationNames",
          MapBuilder.of("bubbled", ON_DECORATION_ACTIVATED)
        )
      )
      .build()
  }

  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> {
    return MapBuilder.builder<String, Any>()
      .put(ON_SELECTION_CHANGE, MapBuilder.of("registrationName", ON_SELECTION_CHANGE))
      .put(ON_SELECTION_ACTION, MapBuilder.of("registrationName", ON_SELECTION_ACTION))
      .build()
  }

  override fun receiveCommand(view: ReadiumView, commandId: String?, args: ReadableArray?) {
    super.receiveCommand(view, commandId, args)

    when (commandId) {
      "create" -> {
        view.isViewInitialized = true
        if (view.file != null) {
          buildForViewIfReady(view)
        }
      }
      else -> {
        Log.w(TAG, "Unknown command received: $commandId")
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
    val originalJson = JSONObject(location.toHashMap() as HashMap<*, *>)

    // Normalize the href by removing leading slashes for consistency across platforms
    val json = originalJson.normalizedLocation()

    val hasLocations = json.has("locations")
    val hasType = json.has("type") && !json.getString("type").isEmpty()
    val hasChildren = json.has("children")
    val hasHashHref = (json.get("href") as String).contains("#")
    val hasTemplated = json.has("templated")

    var linkOrLocator: LinkOrLocator? = null

    if ((!hasType || hasChildren || hasHashHref || hasTemplated) && !hasLocations) {
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

  @ReactProp(name = "preferences")
  fun setPreferences(view: ReadiumView, serialisedPreferences: String) {
    view.updatePreferencesFromJsonString(serialisedPreferences)
  }

  @ReactProp(name = "decorations")
  fun setDecorations(view: ReadiumView, serialisedDecorations: String?) {
    view.setDecorations(serialisedDecorations)
  }

  @ReactProp(name = "selectionActions")
  fun setSelectionActions(view: ReadiumView, serializedActions: String?) {
    view.setSelectionActions(serializedActions)
  }

  @ReactPropGroup(names = ["width", "height"], customType = "Style")
  fun setStyle(view: ReadiumView?, index: Int, value: Int) {
    if (view != null) {
      if (index == 0) {
        view.dimensions.width = value
      }
      if (index == 1) {
        view.dimensions.height = value
      }
      buildForViewIfReady(view)
    }
  }

  private fun buildForViewIfReady(view: ReadiumView) {
    var file = view.file
    val width = view.dimensions.width
    val height = view.dimensions.height

    if (file != null && view.isViewInitialized && width > 0 && height > 0) {
      runBlocking {
        svc.openPublication(file.path, file.initialLocation) { fragment ->
          view.addFragment(fragment)
        }
      }
    }
  }

  companion object {
    private const val TAG = "ReadiumViewManager"
    var ON_LOCATION_CHANGE = "onLocationChange"
    var ON_PUBLICATION_READY = "onPublicationReady"
    var ON_DECORATION_ACTIVATED = "onDecorationActivated"
    var ON_SELECTION_CHANGE = "onSelectionChange"
    var ON_SELECTION_ACTION = "onSelectionAction"
  }
}
