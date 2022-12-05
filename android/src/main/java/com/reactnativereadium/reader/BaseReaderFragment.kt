package com.reactnativereadium.reader

import android.os.Bundle
import android.view.*
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import org.readium.r2.navigator.*
import org.readium.r2.shared.publication.Locator
import com.reactnativereadium.utils.EventChannel
import kotlinx.coroutines.channels.Channel

/*
 * Base reader fragment class
 *
 * Provides common menu items and saves last location on stop.
 */
@OptIn(ExperimentalDecorator::class)
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

    val tocLocators: List<Locator> = model.publication.tableOfContents.mapNotNull {
      model.publication.locatorFromLink(it)
    }

    channel.send(ReaderViewModel.Event.TableOfContentsLoaded(tocLocators))
    navigator.currentLocator
      .onEach { channel.send(ReaderViewModel.Event.LocatorUpdate(it)) }
      .launchIn(viewScope)
  }

  override fun onHiddenChanged(hidden: Boolean) {
    super.onHiddenChanged(hidden)
    setMenuVisibility(!hidden)
    requireActivity().invalidateOptionsMenu()
  }

  fun go(locator: Locator, animated: Boolean): Boolean {
    // don't attempt to navigate if we're already there
    val currentLocator = navigator.currentLocator.value
    if (locator.hashCode() == currentLocator.hashCode()) {
      return true
    }

    return navigator.go(locator, animated)
  }

}
