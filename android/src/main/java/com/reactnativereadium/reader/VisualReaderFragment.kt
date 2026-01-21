/*
 * Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by the BSD-style license
 * available in the top-level LICENSE file of the project.
 */

package com.reactnativereadium.reader

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.widget.FrameLayout
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.reactnativereadium.R
import com.reactnativereadium.databinding.FragmentReaderBinding
import com.reactnativereadium.utils.clearPadding
import com.reactnativereadium.utils.hideSystemUi
import com.reactnativereadium.utils.padSystemUi
import com.reactnativereadium.utils.showSystemUi
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach

/*
 * Adds fullscreen support to the BaseReaderFragment
 */
abstract class VisualReaderFragment : BaseReaderFragment() {

    private lateinit var navigatorFragment: Fragment

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
        navigatorFragment = navigator as Fragment

        if (positionLabelManager == null) {
            positionLabelManager = PositionLabelManager(
                binding.fragmentReaderContainer,
                model.publication,
                viewLifecycleOwner.lifecycleScope
            )
        }

        navigator.currentLocator
            .onEach { locator ->
                positionLabelManager?.update(
                    locator.locations.position,
                    locator.locations.totalProgression
                )
            }
            .launchIn(viewLifecycleOwner.lifecycleScope)

        childFragmentManager.addOnBackStackChangedListener {
            updateSystemUiVisibility()
        }
        binding.fragmentReaderContainer.setOnApplyWindowInsetsListener { container, insets ->
            updateSystemUiPadding(container, insets)
            insets
        }
    }

    override fun onDestroyView() {
        positionLabelManager?.cleanup()
        positionLabelManager = null
        _binding = null
        super.onDestroyView()
    }

    fun setPositionLabelColor(color: Int) {
        positionLabelManager?.setTextColor(color)
    }

    fun setPositionLabelHidden(hidden: Boolean) {
        positionLabelManager?.setHidden(hidden)
    }

    fun updateSystemUiVisibility() {
        if (navigatorFragment.isHidden)
            requireActivity().showSystemUi()
        else
            requireActivity().hideSystemUi()

        requireView().requestApplyInsets()
    }

    private fun updateSystemUiPadding(container: View, insets: WindowInsets) {
        if (navigatorFragment.isHidden) {
            container.padSystemUi(insets, requireActivity())
        } else {
            container.clearPadding()
        }
    }
}