/*
 * Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by the BSD-style license
 * available in the top-level LICENSE file of the project.
 */

package com.reactnativereadium.reader

import android.os.Bundle
import android.view.*
import androidx.fragment.app.commitNow
import androidx.lifecycle.ViewModelProvider
import com.reactnativereadium.R
import org.readium.adapter.pdfium.navigator.PdfiumEngineProvider
import org.readium.adapter.pdfium.navigator.PdfiumPreferences
import org.readium.adapter.pdfium.navigator.PdfiumSettings
import org.readium.adapter.pdfium.navigator.PdfiumPreferencesEditor
import org.readium.r2.navigator.Navigator
import org.readium.r2.navigator.pdf.PdfNavigatorFactory
import org.readium.r2.navigator.pdf.PdfNavigatorFragment
import org.readium.r2.navigator.preferences.Configurable
import org.readium.r2.navigator.preferences.Fit
import org.readium.r2.shared.ExperimentalReadiumApi
import org.readium.r2.shared.publication.Locator
import org.readium.r2.shared.publication.Publication

@OptIn(ExperimentalReadiumApi::class)
class PdfReaderFragment : VisualReaderFragment() {

  override lateinit var model: ReaderViewModel
  override lateinit var navigator: Navigator
  override lateinit var publication: Publication
  private lateinit var factory: ReaderViewModel.Factory

  private var pendingPreferences: PdfiumPreferences? = null
  private lateinit var userPreferences: PdfiumPreferences

  @OptIn(ExperimentalReadiumApi::class)
  private lateinit var navigatorFactory: PdfNavigatorFactory<PdfiumSettings, PdfiumPreferences, PdfiumPreferencesEditor>

  private fun ensureUserPreferencesInitialized() {
    if (this::userPreferences.isInitialized) return
    userPreferences = pendingPreferences ?: PdfiumPreferences()
  }

  private fun applyPendingPreferencesIfNeeded() {
    if (!this::navigator.isInitialized) return
    pendingPreferences?.let { updatePreferences(it) }
  }

  fun initFactory(
    publication: Publication,
    initialLocation: Locator?
  ) {
    factory = ReaderViewModel.Factory(publication, initialLocation)
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    check(::factory.isInitialized) { "PdfReaderFragment factory was not initialized" }

    ViewModelProvider(this, factory)
      .get(ReaderViewModel::class.java)
      .let {
        model = it
        publication = it.publication
      }

    ensureUserPreferencesInitialized()

    navigatorFactory = PdfNavigatorFactory(
      publication = publication,
      pdfEngineProvider = PdfiumEngineProvider()
    )

    childFragmentManager.fragmentFactory =
      navigatorFactory.createFragmentFactory(
        initialLocator = model.initialLocation,
        initialPreferences = PdfiumPreferences(fit = Fit.WIDTH) + userPreferences
      )

    setHasOptionsMenu(true)

    super.onCreate(savedInstanceState)
  }

  override fun onCreateView(
    inflater: LayoutInflater,
    container: ViewGroup?,
    savedInstanceState: Bundle?
  ): View? {
    val view = super.onCreateView(inflater, container, savedInstanceState)
    val navigatorFragmentTag = getString(R.string.pdf_navigator_tag)

    if (savedInstanceState == null) {
      childFragmentManager.commitNow {
        add(
          R.id.fragment_reader_container,
          PdfNavigatorFragment::class.java,
          Bundle(),
          navigatorFragmentTag
        )
      }
    }

    navigator = childFragmentManager.findFragmentByTag(navigatorFragmentTag) as Navigator
    applyPendingPreferencesIfNeeded()

    return view
  }

  fun updatePreferences(pdfPreferences: PdfiumPreferences) {
    userPreferences = pdfPreferences

    if (this::navigator.isInitialized) {
      @Suppress("UNCHECKED_CAST")
      (navigator as? Configurable<*, PdfiumPreferences>)?.submitPreferences(userPreferences)
      pendingPreferences = null
    } else {
      pendingPreferences = pdfPreferences
    }
  }

  companion object {
    fun newInstance(): PdfReaderFragment {
      return PdfReaderFragment()
    }
  }
}
