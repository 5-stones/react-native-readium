/*
 * Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by the BSD-style license
 * available in the top-level LICENSE file of the project.
 */

package com.reactnativereadium.reader

import android.graphics.Color
import android.graphics.PointF
import android.os.Bundle
import android.view.*
import android.view.accessibility.AccessibilityManager
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.SearchView
import androidx.fragment.app.commitNow
import androidx.lifecycle.ViewModelProvider
import com.reactnativereadium.R
import com.reactnativereadium.utils.toggleSystemUi
import java.net.URL
import kotlinx.coroutines.delay
import org.readium.r2.navigator.epub.EpubNavigatorFragment
import org.readium.r2.navigator.ExperimentalDecorator
import org.readium.r2.navigator.Navigator
import org.readium.r2.navigator.epub.EpubPreferences
import org.readium.r2.navigator.epub.EpubPreferencesSerializer
import org.readium.r2.shared.publication.Locator
import org.readium.r2.shared.publication.Publication
import org.readium.r2.shared.ReadiumCSSName

@OptIn(ExperimentalDecorator::class)
class EpubReaderFragment : VisualReaderFragment(), EpubNavigatorFragment.Listener {

    override lateinit var model: ReaderViewModel
    override lateinit var navigator: Navigator
    private lateinit var publication: Publication
    lateinit var navigatorFragment: EpubNavigatorFragment
    private lateinit var factory: ReaderViewModel.Factory
    private var initialPreferencesJsonString: String? = null

    private lateinit var menuScreenReader: MenuItem
    private lateinit var menuSearch: MenuItem
    lateinit var menuSearchView: SearchView

    private lateinit var userPreferences: EpubPreferences
    private var isScreenReaderVisible = false
    private var isSearchViewIconified = true

    // Accessibility
    private var isExploreByTouchEnabled = false

    fun initFactory(
      publication: Publication,
      initialLocation: Locator?
    ) {
      factory = ReaderViewModel.Factory(
        publication,
        initialLocation
      )
    }

    fun updatePreferencesFromJsonString(serialisedPreferences: String) {
      if (this::userPreferences.isInitialized) {
        val serializer = EpubPreferencesSerializer()
        this.userPreferences = serializer.deserialize(serialisedPreferences)
        if (navigator is EpubNavigatorFragment) {
          (navigator as EpubNavigatorFragment).submitPreferences(this.userPreferences)
        }
        initialPreferencesJsonString = null
      } else {
        initialPreferencesJsonString = serialisedPreferences
      }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        // FIXME: this should be checked
        // check(R2App.isServerStarted)

        if (savedInstanceState != null) {
            isScreenReaderVisible = savedInstanceState.getBoolean(IS_SCREEN_READER_VISIBLE_KEY)
            isSearchViewIconified = savedInstanceState.getBoolean(IS_SEARCH_VIEW_ICONIFIED)
        }

        ViewModelProvider(this, factory)
          .get(ReaderViewModel::class.java)
          .let {
            model = it
            publication = it.publication
          }


        childFragmentManager.fragmentFactory =
            EpubNavigatorFragment.createFactory(
                publication = publication,
                initialLocator = model.initialLocation,
                listener = this,
                config = EpubNavigatorFragment.Configuration().apply {
                    // Register the HTML template for our custom [DecorationStyleAnnotationMark].
                    // TODO: remove?
                    /* decorationTemplates[DecorationStyleAnnotationMark::class] = annotationMarkTemplate(activity) */
                    /* selectionActionModeCallback = customSelectionActionModeCallback */
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

        return view
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
    }

    override fun onResume() {
        super.onResume()
        val activity = requireActivity()

        if (!this::userPreferences.isInitialized) {
          userPreferences = EpubPreferences()
        }
        initialPreferencesJsonString?.let { updatePreferencesFromJsonString(it)}

        // If TalkBack or any touch exploration service is activated we force scroll mode (and
        // override user preferences)
        val am = activity.getSystemService(AppCompatActivity.ACCESSIBILITY_SERVICE) as AccessibilityManager
        isExploreByTouchEnabled = am.isTouchExplorationEnabled

        if (isExploreByTouchEnabled) {
          this.userPreferences = this.userPreferences.plus(
            EpubPreferences(scroll = true)
          )
        } else {
            if (publication.cssStyle != "cjk-vertical") {
              this.userPreferences = this.userPreferences.plus(
                EpubPreferences(scroll = null)
              )
            }
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putBoolean(IS_SCREEN_READER_VISIBLE_KEY, isScreenReaderVisible)
        outState.putBoolean(IS_SEARCH_VIEW_ICONIFIED, isSearchViewIconified)
    }

    override fun onTap(point: PointF): Boolean {
        return true
    }

    companion object {

        private const val SEARCH_FRAGMENT_TAG = "search"

        private const val IS_SCREEN_READER_VISIBLE_KEY = "isScreenReaderVisible"

        private const val IS_SEARCH_VIEW_ICONIFIED = "isSearchViewIconified"

        fun newInstance(): EpubReaderFragment {
            return EpubReaderFragment()
        }
    }
}
