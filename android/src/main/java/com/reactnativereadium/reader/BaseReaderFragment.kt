package com.reactnativereadium.reader

import android.os.Bundle
import android.view.*
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.reactnativereadium.utils.DecorationSerializer
import com.reactnativereadium.utils.EventChannel
import com.reactnativereadium.utils.LinkOrLocator
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import org.readium.r2.navigator.DecorableNavigator
import org.readium.r2.navigator.Navigator
import org.readium.r2.navigator.SelectableNavigator
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

  // Track active decoration listeners to avoid duplicates
  private val activeDecorationGroups = mutableSetOf<String>()

  // Store decorations if they're set before navigator is ready
  private var pendingDecorations: String? = null

  // Check if navigator is ready to use
  private val isNavigatorReady: Boolean
    get() {
      if (view == null) return false
      return try {
        navigator
        true
      } catch (e: UninitializedPropertyAccessException) {
        false
      }
    }

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

    // Apply any pending decorations now that navigator is ready
    pendingDecorations?.let { decorationsJson ->
      applyDecorationsFromJsonString(decorationsJson)
    }

    // Start monitoring text selection
    startSelectionMonitoring()
  }

  override fun onHiddenChanged(hidden: Boolean) {
    super.onHiddenChanged(hidden)
    setMenuVisibility(!hidden)
    requireActivity().invalidateOptionsMenu()
  }

  fun go(location: LinkOrLocator, animated: Boolean): Boolean {
    // Check if navigator is initialized
    if (!isNavigatorReady) {
      android.util.Log.w("BaseReaderFragment", "Navigator not initialized yet")
      return false
    }

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

  /**
   * Apply decorations from JSON string
   */
  fun applyDecorationsFromJsonString(decorationsJson: String?) {
    if (decorationsJson == null) {
      pendingDecorations = null
      return
    }

    // Check if navigator is initialized
    if (!isNavigatorReady) {
      // Store for later application
      pendingDecorations = decorationsJson
      return
    }

    val decorableNavigator = navigator as? DecorableNavigator
    if (decorableNavigator == null) {
      android.util.Log.w("BaseReaderFragment", "Navigator does not support decorations")
      return
    }

    val decorationGroups = DecorationSerializer.deserialize(decorationsJson)

    val viewScope = viewLifecycleOwner.lifecycleScope

    decorationGroups.forEach { (group, decorations) ->
      // Apply decorations to this group (suspend function)
      viewScope.launch {
        decorableNavigator.applyDecorations(decorations, group)
      }

      // Set up listener for this group if not already active
      if (!activeDecorationGroups.contains(group)) {
        activeDecorationGroups.add(group)
        setupDecorationListener(decorableNavigator, group)
      }
    }

    // Clear pending decorations as they've been applied
    pendingDecorations = null
  }

  /**
   * Set up a decoration listener for a specific group
   */
  private fun setupDecorationListener(decorableNavigator: DecorableNavigator, group: String) {
    val viewScope = viewLifecycleOwner.lifecycleScope

    decorableNavigator.addDecorationListener(group, object : DecorableNavigator.Listener {
      override fun onDecorationActivated(event: DecorableNavigator.OnActivatedEvent): Boolean {
        viewScope.launch {
          channel.send(
            ReaderViewModel.Event.DecorationActivated(
              decoration = event.decoration,
              group = event.group,
              rect = event.rect,
              point = event.point
            )
          )
        }
        return true
      }
    })
  }

  /**
   * Get the current text selection from the navigator
   * Returns the selection locator which includes text position information needed for highlighting
   */
  suspend fun getCurrentSelection(): Locator? {
    if (!isNavigatorReady) {
      android.util.Log.w("BaseReaderFragment", "Navigator not initialized yet")
      return null
    }

    val selectableNavigator = navigator as? SelectableNavigator
    if (selectableNavigator == null) {
      android.util.Log.w("BaseReaderFragment", "Navigator does not support text selection")
      return null
    }

    val selection = selectableNavigator.currentSelection()
    if (selection == null) {
      return null
    }

    return selection.locator
  }

  /**
   * Start monitoring text selection and emit selection change events
   */
  private fun startSelectionMonitoring() {
    val viewScope = viewLifecycleOwner.lifecycleScope

    viewScope.launch {
      var previousSelection: Locator? = null

      while (true) {
        delay(500) // Check every 500ms

        if (!isNavigatorReady) continue

        val selectableNavigator = navigator as? SelectableNavigator
        if (selectableNavigator == null) continue

        val currentSelection = try {
          selectableNavigator.currentSelection()
        } catch (e: Exception) {
          android.util.Log.w("BaseReaderFragment", "Error getting selection: ${e.message}")
          null
        }

        val currentLocator = currentSelection?.locator
        val currentText = currentLocator?.text?.highlight

        // Check if selection has changed
        val hasChanged = when {
          previousSelection == null && currentLocator == null -> false
          previousSelection == null || currentLocator == null -> true
          previousSelection.href != currentLocator.href -> true
          previousSelection.text.highlight != currentText -> true
          else -> false
        }

        if (hasChanged) {
          channel.send(
            ReaderViewModel.Event.SelectionChanged(
              locator = currentLocator,
              selectedText = currentText
            )
          )

          previousSelection = currentLocator
        }
      }
    }
  }

}
