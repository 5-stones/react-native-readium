package com.reactnativereadium.reader

import android.app.Application
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.cache.NoOpCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import com.reactnativereadium.R
import java.io.File
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import org.readium.adapter.exoplayer.audio.DefaultExoPlayerCacheProvider
import org.readium.adapter.exoplayer.audio.ExoPlayerDefaults
import org.readium.adapter.exoplayer.audio.ExoPlayerEngineProvider
import org.readium.adapter.exoplayer.audio.ExoPlayerPreferences
import org.readium.navigator.media.audio.AudioNavigator
import org.readium.navigator.media.audio.AudioNavigatorFactory
import org.readium.navigator.media.common.DefaultMediaMetadataProvider
import org.readium.r2.navigator.Navigator
import org.readium.r2.shared.publication.Locator
import org.readium.r2.shared.publication.Publication
import org.readium.r2.shared.util.Try

/**
 * Reader fragment for audiobook publications. Wraps Readium's [AudioNavigator]
 * backed by the ExoPlayer engine. The navigator is headless — the React-Native
 * layer renders its own media-control chrome.
 */
class AudioReaderFragment : BaseReaderFragment() {

  override lateinit var model: ReaderViewModel
  private lateinit var _navigator: AudioNavigator<*, *>

  /** True once `_navigator` has been initialized. */
  private var navigatorReady = false

  /** Listener invoked when the audio navigator finishes initializing. */
  var onNavigatorReady: ((AudioNavigator<*, *>) -> Unit)? = null

  override val navigator: Navigator
    get() = _navigator

  private lateinit var factory: ReaderViewModel.Factory

  fun initFactory(publication: Publication, initialLocation: Locator?) {
    factory = ReaderViewModel.Factory(publication, initialLocation)
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    check(::factory.isInitialized) { "AudioReaderFragment factory was not initialized" }

    ViewModelProvider(this, factory)
      .get(ReaderViewModel::class.java)
      .let { model = it }

    super.onCreate(savedInstanceState)
  }

  override fun onCreateView(
    inflater: LayoutInflater,
    container: ViewGroup?,
    savedInstanceState: Bundle?
  ): View? {
    val view = inflater.inflate(R.layout.fragment_reader, container, false)

    // The base class's onViewCreated subscribes to `navigator.currentLocator`
    // immediately, so the navigator MUST exist before super.onViewCreated runs.
    // ExoPlayer engine setup is fast (millisecond range) for a single-file
    // publication; blocking the main thread briefly is acceptable.
    if (!navigatorReady) {
      runBlocking { createNavigatorAsync() }
    }
    return view
  }

  /** Returns the audio navigator, or null if not yet ready. */
  fun audioNavigatorOrNull(): AudioNavigator<*, *>? =
    if (navigatorReady) _navigator else null

  private suspend fun createNavigatorAsync() {
    val app = requireContext().applicationContext as Application

    val cache = sharedCache(app)
    val provider = ExoPlayerEngineProvider(
      application = app,
      metadataProvider = DefaultMediaMetadataProvider(),
      cacheProvider = DefaultExoPlayerCacheProvider(cache),
      defaults = ExoPlayerDefaults(pitch = null, speed = null)
    )

    val publication = model.publication
    val navFactory = AudioNavigatorFactory(publication, provider)
      ?: run {
        android.util.Log.w("AudioReaderFragment", "Publication is not supported by AudioNavigatorFactory")
        return
      }
    val result = navFactory.createNavigator(
      initialLocator = model.initialLocation,
      initialPreferences = ExoPlayerPreferences(),
      readingOrder = publication.readingOrder
    )

    when (result) {
      is Try.Success -> {
        _navigator = result.value
        navigatorReady = true
        onNavigatorReady?.invoke(_navigator)
      }
      is Try.Failure -> {
        android.util.Log.w(
          "AudioReaderFragment",
          "Failed to create audio navigator: ${result.value}"
        )
      }
    }
  }

  companion object {
    private var sharedCacheInstance: SimpleCache? = null

    /** Shared in-process cache so we don't spin a new one per book. */
    @Synchronized
    fun sharedCache(app: Application): SimpleCache {
      sharedCacheInstance?.let { return it }
      val cacheDir = File(app.cacheDir, "readium-audio-cache")
      cacheDir.mkdirs()
      val database = StandaloneDatabaseProvider(app)
      val cache = SimpleCache(cacheDir, NoOpCacheEvictor(), database)
      sharedCacheInstance = cache
      return cache
    }

    fun newInstance(): AudioReaderFragment = AudioReaderFragment()
  }
}
