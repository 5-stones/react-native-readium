/*
 * Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by the BSD-style license
 * available in the top-level LICENSE file of the project.
 */

package com.reactnativereadium.reader

import android.os.Bundle
import androidx.annotation.DimenRes
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.reactnativereadium.R
import com.reactnativereadium.databinding.FragmentReaderBinding
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach

/*
 * Adds fullscreen support to the BaseReaderFragment
 */
abstract class VisualReaderFragment : BaseReaderFragment() {


    private var _binding: FragmentReaderBinding? = null
    val binding get() = _binding!!

    private var positionLabelManager: PositionLabelManager? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        _binding = FragmentReaderBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        positionLabelManager = PositionLabelManager(
            label = binding.positionLabel,
            publication = model.publication,
            lifecycleScope = viewLifecycleOwner.lifecycleScope
        )

        // Update position label when navigator location changes
        navigator.currentLocator
            .onEach { locator ->
                positionLabelManager?.update(
                    position = locator.locations.position,
                    totalProgression = locator.locations.totalProgression
                )
            }
            .launchIn(viewLifecycleOwner.lifecycleScope)

    }

    override fun onDestroyView() {
        positionLabelManager?.cleanup()
        positionLabelManager = null
        _binding = null
        super.onDestroyView()
    }

    /**
     * Sets the reader's colours, which follow the publication's theme.
     *
     * One surface and one label: the background belongs to the root view, so
     * the page's margin, the area behind the label and the label itself all
     * change in the same breath.
     *
     * @param textColor Android color integer for the position label.
     * @param backgroundColor Android color integer for everything behind the page.
     */
    fun setReaderColors(textColor: Int, backgroundColor: Int) {
        _binding?.readerRoot?.setBackgroundColor(backgroundColor)
        positionLabelManager?.setTextColor(textColor)
    }

    /**
     * Insets the page by its reading margin.
     *
     * The label floats in the bottom one, so this is also what keeps the page
     * from being laid out underneath it. Applied by the subclass, because a
     * PDF wants its page edge to edge where a reflowable publication wants a
     * margin.
     */
    protected fun applyReadingMargin(@DimenRes dimen: Int) {
        val padding = resources.getDimensionPixelSize(dimen)
        binding.fragmentReaderContainer.setPadding(0, padding, 0, padding)
    }

}