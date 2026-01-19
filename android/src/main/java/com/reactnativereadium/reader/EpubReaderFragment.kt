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
import com.reactnativereadium.R
import org.readium.r2.navigator.epub.EpubNavigatorFragment
import org.readium.r2.navigator.Navigator
import org.readium.r2.navigator.epub.EpubPreferences
import org.readium.r2.navigator.epub.EpubPreferencesSerializer
import org.readium.r2.navigator.epub.EpubNavigatorFactory
import org.readium.r2.shared.publication.Locator
import org.readium.r2.shared.publication.Publication

class EpubReaderFragment : VisualReaderFragment() {

    override lateinit var model: ReaderViewModel
    override lateinit var navigator: Navigator
    private lateinit var publication: Publication
    lateinit var navigatorFragment: EpubNavigatorFragment
    private lateinit var factory: ReaderViewModel.Factory
    private lateinit var navigatorFactory: EpubNavigatorFactory
    private val preferencesSerializer = EpubPreferencesSerializer()
    private var initialPreferencesJsonString: String? = null

    private lateinit var userPreferences: EpubPreferences

    // Accessibility
    private var isExploreByTouchEnabled = false

    private fun ensureUserPreferencesInitialized() {
      if (this::userPreferences.isInitialized) return
      userPreferences = initialPreferencesJsonString?.let {
        preferencesSerializer.deserialize(it)
      } ?: EpubPreferences()
    }

    private fun applyPendingPreferencesIfNeeded() {
      if (!this::navigator.isInitialized) return
      initialPreferencesJsonString?.let { updatePreferencesFromJsonString(it) }
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

    fun updatePreferencesFromJsonString(serialisedPreferences: String) {
      userPreferences = preferencesSerializer.deserialize(serialisedPreferences)

      if (this::navigator.isInitialized && navigator is EpubNavigatorFragment) {
        (navigator as EpubNavigatorFragment).submitPreferences(userPreferences)
        initialPreferencesJsonString = null
      } else {
        initialPreferencesJsonString = serialisedPreferences
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

    companion object {

        fun newInstance(): EpubReaderFragment {
            return EpubReaderFragment()
        }
    }
}
