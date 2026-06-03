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
import org.readium.r2.shared.publication.Locator
import org.readium.r2.shared.publication.Publication

class PdfReaderFragment : VisualReaderFragment() {

    override lateinit var model: ReaderViewModel
    override lateinit var navigator: Navigator
    private lateinit var publication: Publication
    private lateinit var factory: ReaderViewModel.Factory
    private lateinit var navigatorFactory: PdfNavigatorFactory<PdfiumSettings, PdfiumPreferences, PdfiumPreferencesEditor>

    fun initFactory(
        publication: Publication,
        initialLocation: Locator?
    ) {
        factory = ReaderViewModel.Factory(publication, initialLocation)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        ViewModelProvider(this, factory)
            .get(ReaderViewModel::class.java)
            .let {
                model = it
                publication = it.publication
            }

        navigatorFactory = PdfNavigatorFactory(
            publication = publication,
            pdfEngineProvider = PdfiumEngineProvider()
        )

        childFragmentManager.fragmentFactory =
            navigatorFactory.createFragmentFactory(
                initialLocator = model.initialLocation,
                initialPreferences = PdfiumPreferences()
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

        return view
    }

    companion object {
        fun newInstance(): PdfReaderFragment {
            return PdfReaderFragment()
        }
    }
}
