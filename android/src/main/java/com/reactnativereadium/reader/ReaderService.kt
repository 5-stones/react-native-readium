package com.reactnativereadium.reader

import android.annotation.SuppressLint
import androidx.lifecycle.ViewModelStore
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.util.RNLog
import com.reactnativereadium.utils.LinkOrLocator
import java.io.File
import java.io.IOException
import java.net.ServerSocket
import org.readium.r2.shared.extensions.mediaType
import org.readium.r2.shared.extensions.tryOrNull
import org.readium.r2.shared.publication.Locator
import org.readium.r2.shared.publication.asset.FileAsset
import org.readium.r2.shared.publication.Publication
import org.readium.r2.streamer.server.Server
import org.readium.r2.streamer.Streamer


class ReaderService(
  private val reactContext: ReactApplicationContext
) {
  private var streamer = Streamer(reactContext)
  // see R2App.onCreate
  private var server: Server
  // val channel = EventChannel(Channel<Event>(Channel.BUFFERED), viewModelScope)
  private var store = ViewModelStore()

  companion object {
    @SuppressLint("StaticFieldLeak")
    lateinit var server: Server
      private set

    lateinit var R2DIRECTORY: String
      private set

    var isServerStarted = false
      private set
  }

  init {
    val s = ServerSocket(0)
    s.close()
    server = Server(s.localPort, reactContext)
    this.startServer()
  }

  fun locatorFromLinkOrLocator(
    location: LinkOrLocator?,
    publication: Publication,
  ): Locator? {

    if (location == null) return null

    when (location) {
      is LinkOrLocator.Link -> {
        return publication.locatorFromLink(location.link)
      }
      is LinkOrLocator.Locator -> {
        return location.locator
      }
    }

    return null
  }

  suspend fun openPublication(
    fileName: String,
    initialLocation: LinkOrLocator?,
    callback: suspend (fragment: BaseReaderFragment) -> Unit
  ) {
    val file = File(fileName)
    val asset = FileAsset(file, file.mediaType())

    streamer.open(
      asset,
      allowUserInteraction = false,
      sender = reactContext
    )
      .onSuccess {
          val locator = locatorFromLinkOrLocator(initialLocation, it)
          val readerFragment = EpubReaderFragment.newInstance()
          readerFragment.initFactory(it, locator)
          callback.invoke(readerFragment)

      }
      .onFailure {
        tryOrNull { asset.file.delete() }
        RNLog.w(reactContext, "Error executing ReaderService.openPublication")
        // TODO: implement failure event
      }
  }

  private fun startServer() {
    if (!server.isAlive) {
      try {
        server.start()
      } catch (e: IOException) {
        RNLog.e(reactContext, "Unable to start the Readium server.")
      }
      if (server.isAlive) {
        // // Add your own resources here
        // server.loadCustomResource(assets.open("scripts/test.js"), "test.js")
        // server.loadCustomResource(assets.open("styles/test.css"), "test.css")
        // server.loadCustomFont(assets.open("fonts/test.otf"), applicationContext, "test.otf")

        isServerStarted = true
      }
    }
  }

  sealed class Event {

    class ImportPublicationFailed(val errorMessage: String?) : Event()

    object UnableToMovePublication : Event()

    object ImportPublicationSuccess : Event()

    object ImportDatabaseFailed : Event()

    class OpenBookError(val errorMessage: String?) : Event()
  }
}
