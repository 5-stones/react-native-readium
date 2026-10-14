/*
 * Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by the BSD-style license
 * available in the top-level LICENSE file of the project.
 */

package com.reactnativereadium.reader

import android.os.Bundle
import android.view.*
import android.view.accessibility.AccessibilityManager
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.commitNow
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import com.reactnativereadium.R
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.coroutines.yield
import org.readium.r2.navigator.DecorableNavigator
import org.readium.r2.navigator.SelectableNavigator
import org.readium.r2.navigator.epub.EpubNavigatorFragment
import org.readium.r2.navigator.Navigator
import org.readium.r2.navigator.epub.EpubPreferences
import org.readium.r2.navigator.epub.EpubNavigatorFactory
import org.readium.r2.shared.publication.Locator
import org.readium.r2.shared.publication.Publication
import org.readium.r2.navigator.preferences.Theme
import org.readium.r2.shared.ExperimentalReadiumApi
import org.readium.r2.shared.publication.services.search.SearchIterator
import org.readium.r2.shared.publication.services.search.SearchService
import org.readium.r2.shared.publication.services.search.search

data class SelectionAction(
    val id: String,
    val label: String
)

/**
 * A page of search results produced by [EpubReaderFragment]'s paginated search,
 * converted to a Nitro `SearchPage` by the view layer.
 */
data class SearchPageData(
    val results: List<Locator>,
    val hasMore: Boolean,
    val totalCount: Int?,
    val isSupported: Boolean
)

class EpubReaderFragment : VisualReaderFragment() {

    override lateinit var model: ReaderViewModel
    override lateinit var navigator: Navigator
    override lateinit var publication: Publication
    lateinit var navigatorFragment: EpubNavigatorFragment
    private lateinit var factory: ReaderViewModel.Factory
    private lateinit var navigatorFactory: EpubNavigatorFactory
    private var pendingPreferences: EpubPreferences? = null

    private lateinit var userPreferences: EpubPreferences

    // Accessibility
    private var isExploreByTouchEnabled = false

    // Selection actions configuration
    private var selectionActions: List<SelectionAction> = emptyList()
    private var searchIterator: SearchIterator? = null
    // Assumed true until a search proves otherwise, so a loadMore with no active
    // search doesn't masquerade as "search unsupported".
    private var searchSupported = true
    // Bumped on each new search / cancel so a coroutine whose next() was in flight
    // when superseded can't close or clobber the iterator that replaced it.
    private var searchGeneration = 0

    // Custom selection action mode callback for adding custom action buttons
    val customSelectionActionModeCallback: ActionMode.Callback by lazy {
        SelectionActionModeCallback()
    }

    private fun ensureUserPreferencesInitialized() {
      if (this::userPreferences.isInitialized) return
      userPreferences = pendingPreferences ?: EpubPreferences()
    }

    private fun applyPendingPreferencesIfNeeded() {
      if (!this::navigator.isInitialized) return
      pendingPreferences?.let { updatePreferences(it) }
    }

    fun initFactory(
      publication: Publication,
      initialLocation: Locator?
    ) {
      factory = ReaderViewModel.Factory(
        publication,
        initialLocation
      )
      navigatorFactory = EpubNavigatorFactory(publication)
    }

    fun updatePreferences(epubPreferences: EpubPreferences) {
      userPreferences = epubPreferences

      if (this::navigator.isInitialized && navigator is EpubNavigatorFragment) {
        (navigator as EpubNavigatorFragment).submitPreferences(userPreferences)
        pendingPreferences = null
      } else {
        pendingPreferences = epubPreferences
      }
    }

    fun updateSelectionActions(actions: List<SelectionAction>) {
      selectionActions = actions
    }

    /**
     * Starts a new search, releasing any previous iterator, and returns the
     * first page of results. Subsequent pages are fetched via [loadMoreSearchResults].
     */
    @OptIn(ExperimentalReadiumApi::class)
    suspend fun startSearch(
      query: String,
      options: SearchService.Options = SearchService.Options()
    ): SearchPageData {
      // Supersede any prior search and release its iterator.
      val generation = ++searchGeneration
      searchIterator?.close()
      searchIterator = null

      val iterator = model.publication.search(query, options)
      if (iterator == null) {
        searchSupported = false
        return SearchPageData(emptyList(), hasMore = false, totalCount = null, isSupported = false)
      }
      searchSupported = true

      // A newer search (or cancel) ran while we awaited; discard this iterator.
      if (generation != searchGeneration) {
        iterator.close()
        return SearchPageData(emptyList(), hasMore = false, totalCount = null, isSupported = true)
      }
      searchIterator = iterator
      return nextSearchPage(generation)
    }

    /**
     * Returns the next page of results for the in-flight search, or a terminal
     * page when the iterator is exhausted or no search is active.
     */
    suspend fun loadMoreSearchResults(): SearchPageData = nextSearchPage(searchGeneration)

    /** Cancels the in-flight search and releases its iterator. */
    fun cancelSearch() {
      searchGeneration++
      searchIterator?.close()
      searchIterator = null
    }

    private suspend fun nextSearchPage(generation: Int): SearchPageData {
      if (generation != searchGeneration) {
        return SearchPageData(emptyList(), hasMore = false, totalCount = null, isSupported = searchSupported)
      }
      val iterator = searchIterator
        ?: return SearchPageData(emptyList(), hasMore = false, totalCount = null, isSupported = searchSupported)

      return try {
        val page = iterator.next().getOrNull()
        // Read before any close() below — the iterator is invalid once closed.
        val total = iterator.resultCount
        if (generation != searchGeneration) {
          // Superseded while awaiting next(); the new search owns the iterator.
          SearchPageData(emptyList(), hasMore = false, totalCount = null, isSupported = true)
        } else if (page != null) {
          SearchPageData(page.locators, hasMore = true, totalCount = total, isSupported = true)
        } else {
          iterator.close()
          searchIterator = null
          SearchPageData(emptyList(), hasMore = false, totalCount = total, isSupported = true)
        }
      } catch (e: kotlinx.coroutines.CancellationException) {
        throw e
      } catch (e: Exception) {
        android.util.Log.w("EpubReaderFragment", "Search iteration error", e)
        if (generation == searchGeneration) {
          iterator.close()
          searchIterator = null
        }
        SearchPageData(emptyList(), hasMore = false, totalCount = null, isSupported = true)
      }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
      check(::navigatorFactory.isInitialized) { "EpubReaderFragment factory was not initialized" }

        ViewModelProvider(this, factory)
          .get(ReaderViewModel::class.java)
          .let {
            model = it
            publication = it.publication
          }

          ensureUserPreferencesInitialized()

          childFragmentManager.fragmentFactory =
            navigatorFactory.createFragmentFactory(
              initialLocator = model.initialLocation,
              initialPreferences = userPreferences,
              configuration = EpubNavigatorFragment.Configuration {
                if (selectionActions.isNotEmpty()) {
                  selectionActionModeCallback = customSelectionActionModeCallback
                }

                // Safe areas are the host app's concern, not the reader's.
                //
                // Left on, the navigator adds the display cutout's insets to
                // the page's own margins, inside a view the app has already
                // positioned — so the reading margins vary with the device's
                // notch, and change again on rotation, while the app's own
                // insets are applied too. The page keeps its reading margin
                // (40dp portrait, 20dp landscape, Readium's own dimension);
                // what it no longer does is guess at the window.
                shouldApplyInsetsPadding = false
              }
            )

        setHasOptionsMenu(true)

        super.onCreate(savedInstanceState)
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        val view = super.onCreateView(inflater, container, savedInstanceState)
        val navigatorFragmentTag = getString(R.string.epub_navigator_tag)

        if (savedInstanceState == null) {
            childFragmentManager.commitNow {
                add(R.id.fragment_reader_container, EpubNavigatorFragment::class.java, Bundle(), navigatorFragmentTag)
            }
        }
        navigator = childFragmentManager.findFragmentByTag(navigatorFragmentTag) as Navigator
        navigatorFragment = navigator as EpubNavigatorFragment

        applyPendingPreferencesIfNeeded()

        return view
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        applyReadingMargin(R.dimen.rnr_reader_vertical_padding)
        viewLifecycleOwner.lifecycleScope.launch { followNavigatorColors() }
    }

    /**
     * Keeps the position label's colours in step with the page.
     *
     * Driven by the navigator's own `settings` flow rather than by the
     * preferences we submit, because that is what the navigator reacts to, and
     * because it is the more truthful value: what Readium resolved from the
     * preferences, the publication and its defaults.
     *
     * The page itself changes later than that, though. A theme reaches the
     * page as a *second* emission — Readium turns the new Readium CSS into
     * `readium.setCSSProperties(…)` and sends it to the web views through a
     * channel — so a label repainted on the settings emission changes a beat
     * before the page does, which reads as two surfaces changing one after the
     * other.
     *
     * So the label waits for the page: a script of our own, queued behind
     * Readium's, cannot run until that one has. The wait is bounded because a
     * web view that never answers must not leave the label the wrong colour
     * for the rest of the session, and the first emission is applied at once,
     * there being no page on screen yet to be out of step with.
     */
    private suspend fun followNavigatorColors() {
      val configurable = navigator as? EpubNavigatorFragment ?: return
      var applied: Pair<Int, Int>? = null

      configurable.settings
        // `collectLatest`, because waiting on the page suspends: a newer
        // emission abandons a stale wait rather than queueing behind it.
        .collectLatest { settings ->
          val colors = Pair(
            settings.textColor?.int ?: settings.theme.contentColor,
            settings.backgroundColor?.int ?: settings.theme.backgroundColor
          )

          // `settings` emits for every preference, most of which leave the
          // colours alone — and a page that is not repainting is not worth
          // waiting for.
          if (colors == applied) return@collectLatest

          if (applied != null) {
            // Yield first, so Readium's script is queued ahead of ours.
            yield()
            withTimeoutOrNull(PAGE_REPAINT_TIMEOUT_MS) {
              // Reading a layout property forces style recalculation in the
              // same task, so this returns after the new colours have been
              // applied rather than merely after the script that set them.
              runCatching {
                configurable.evaluateJavascript(
                  "document.documentElement.offsetHeight"
                )
              }
            }
          }

          applied = colors
          setReaderColors(colors.first, colors.second)
        }
    }

    override fun onResume() {
        super.onResume()
        val activity = requireActivity()

        ensureUserPreferencesInitialized()
        applyPendingPreferencesIfNeeded()

        // If TalkBack or any touch exploration service is activated we force scroll mode (and
        // override user preferences)
        val am = activity.getSystemService(AppCompatActivity.ACCESSIBILITY_SERVICE) as AccessibilityManager
        isExploreByTouchEnabled = am.isTouchExplorationEnabled

        userPreferences = if (isExploreByTouchEnabled) {
            userPreferences.plus(EpubPreferences(scroll = true))
        } else {
            userPreferences.plus(EpubPreferences(scroll = null))
        }
        (navigator as? EpubNavigatorFragment)?.submitPreferences(userPreferences)
    }

    private inner class SelectionActionModeCallback : ActionMode.Callback {
        // Store action IDs mapped to their menu item IDs for lookup
        private val actionIdMap = mutableMapOf<Int, String>()

        override fun onCreateActionMode(mode: ActionMode, menu: Menu): Boolean {
            // Clear previous action mappings
            actionIdMap.clear()

            // Only add menu items if navigator supports decorations
            if (navigator !is DecorableNavigator) {
                return true
            }

            // Dynamically add menu items for each configured action
            selectionActions.forEachIndexed { index, action ->
                // Generate a unique menu item ID using the action's hash
                val menuItemId = action.id.hashCode()
                actionIdMap[menuItemId] = action.id

                // Add menu item with the action's label
                menu.add(Menu.NONE, menuItemId, index, action.label).apply {
                    // Show as action button if there's space
                    setShowAsAction(MenuItem.SHOW_AS_ACTION_IF_ROOM)
                    // Use star icon for highlight action, otherwise use default
                    if (action.id == "highlight") {
                        setIcon(android.R.drawable.btn_star_big_on)
                    }
                }
            }

            return true
        }

        override fun onPrepareActionMode(mode: ActionMode, menu: Menu): Boolean {
            return false
        }

        override fun onActionItemClicked(mode: ActionMode, item: MenuItem): Boolean {
            val actionId = actionIdMap[item.itemId]
            if (actionId != null) {
                // Get the current selection from the navigator
                lifecycleScope.launch {
                    val selectableNavigator = navigator as? SelectableNavigator
                    val selection = selectableNavigator?.currentSelection()

                    if (selection != null) {
                        // Emit generic SelectionAction event to React Native
                        channel.send(
                            ReaderViewModel.Event.SelectionAction(
                                actionId = actionId,
                                locator = selection.locator,
                                selectedText = selection.locator.text.highlight ?: ""
                            )
                        )
                    }
                }

                mode.finish()
                return true
            }
            return false
        }

        override fun onDestroyActionMode(mode: ActionMode) {
            // Clean up action mappings
            actionIdMap.clear()
        }
    }

    companion object {
        /**
         * How long the position label waits for the page to repaint before
         * changing colour anyway. A web view that never answers must not leave
         * the label the wrong colour for the rest of the session.
         */
        private const val PAGE_REPAINT_TIMEOUT_MS = 500L

        fun newInstance(): EpubReaderFragment {
            return EpubReaderFragment()
        }
    }
}
