package com.reactnativereadium.reader

import android.os.Bundle
import android.view.*
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.reactnativereadium.utils.EventChannel
import com.reactnativereadium.utils.LinkOrLocator
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import org.readium.r2.navigator.Navigator
import org.readium.r2.shared.publication.Locator
import org.readium.r2.shared.publication.services.positions

/*
 * Base reader fragment class
 *
 * Provides common menu items and saves last location on stop.
 */
abstract class BaseReaderFragment : Fragment() {
  val channel = EventChannel(
    Channel<ReaderViewModel.Event>(Channel.BUFFERED),
    lifecycleScope
  )

  protected abstract val model: ReaderViewModel
  protected abstract val navigator: Navigator

  override fun onCreate(savedInstanceState: Bundle?) {
    setHasOptionsMenu(true)
    super.onCreate(savedInstanceState)
  }

  override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
    super.onViewCreated(view, savedInstanceState)

    val viewScope = viewLifecycleOwner.lifecycleScope

    // Emit PublicationReady event with all metadata
    viewScope.launch {
      // positions() is a suspending function that returns List<Locator>
      val positions = try {
        model.publication.positions()
      } catch (e: Exception) {
        emptyList<Locator>()
      }

      // Normalize metadata to ensure consistent structure across platforms
      // This uses spec-based normalization to handle LocalizedStrings and other
      // platform-specific serialization differences
      channel.send(
        ReaderViewModel.Event.PublicationReady(
          tableOfContents = model.publication.tableOfContents,
          positions = positions,
          metadata = model.publication.metadata
        )
      )
    }

    navigator.currentLocator
      .onEach { channel.send(ReaderViewModel.Event.LocatorUpdate(it)) }
      .launchIn(viewScope)
  }

  override fun onHiddenChanged(hidden: Boolean) {
    super.onHiddenChanged(hidden)
    setMenuVisibility(!hidden)
    requireActivity().invalidateOptionsMenu()
  }

  fun go(location: LinkOrLocator, animated: Boolean): Boolean {
    var locator: Locator? = null
    when (location) {
      is LinkOrLocator.Link -> {
        locator = model.publication.locatorFromLink(location.link)
      }
      is LinkOrLocator.Locator -> {
        locator = location.locator
      }
    }

    if (locator == null) {
      return false
    }

    // don't attempt to navigate if we're already there
    val currentLocator = navigator.currentLocator.value
    if (locator.hashCode() == currentLocator.hashCode()) {
      return true
    }

    return navigator.go(locator, animated)
  }

}
