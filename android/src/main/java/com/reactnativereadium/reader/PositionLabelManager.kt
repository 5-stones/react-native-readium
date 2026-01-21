package com.reactnativereadium.reader

import android.graphics.Color
import android.view.Gravity
import android.widget.FrameLayout
import android.widget.TextView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import org.readium.r2.shared.publication.Publication
import org.readium.r2.shared.publication.services.positions

/**
 * Manages the position label display for the reader.
 * Similar to iOS PositionLabelManager, this class handles the display of current position
 * and total position count in a TextView overlay.
 */
class PositionLabelManager(
    private val containerView: FrameLayout,
    private val publication: Publication,
    private val lifecycleScope: CoroutineScope
) {
    private val label: TextView = TextView(containerView.context)
    private var positionsCount: Int? = null
    private var positionsLoadingJob: Job? = null
    private var lastKnownPosition: Int? = null
    private var lastKnownProgression: Double? = null

    init {
        setupLabel()
    }

    companion object {
        private const val LABEL_TEXT_SIZE_SP = 12f
        private const val LABEL_PADDING_HORIZONTAL_DP = 10
        private const val LABEL_PADDING_VERTICAL_DP = 5
        private const val LABEL_BOTTOM_MARGIN_DP = 20
        private const val LABEL_ELEVATION_DP = 4f
    }

    private fun setupLabel() {
        val density = containerView.resources.displayMetrics.density

        label.apply {
            textSize = LABEL_TEXT_SIZE_SP
            setTextColor(Color.DKGRAY) // Default, will be updated based on theme
            setBackgroundColor(Color.TRANSPARENT)
            gravity = Gravity.CENTER
            setPadding(
                (LABEL_PADDING_HORIZONTAL_DP * density).toInt(),
                (LABEL_PADDING_VERTICAL_DP * density).toInt(),
                (LABEL_PADDING_HORIZONTAL_DP * density).toInt(),
                (LABEL_PADDING_VERTICAL_DP * density).toInt()
            )
            elevation = LABEL_ELEVATION_DP * density
        }

        val params = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            bottomMargin = (LABEL_BOTTOM_MARGIN_DP * density).toInt()
        }

        containerView.addView(label, params)
        // Ensure label is above navigator fragment
        label.bringToFront()
    }

    /**
     * Update the position label with current position and progression.
     * Should be called on the main thread.
     */
    fun update(position: Int?, totalProgression: Double?) {
        lastKnownPosition = position
        lastKnownProgression = totalProgression
        label.text = positionLabelText(position, totalProgression)
    }

    private fun positionLabelText(position: Int?, totalProgression: Double?): String? {
        return when {
            position != null -> {
                val total = positionsCount
                if (total != null) {
                    "$position / $total"
                } else {
                    loadPositionsCountIfNeeded()
                    "$position"
                }
            }
            totalProgression != null -> {
                "${(totalProgression * 100).toInt()}%"
            }
            else -> null
        }
    }

    private fun loadPositionsCountIfNeeded() {
        if (positionsCount != null) return
        if (positionsLoadingJob?.isActive == true) return

        positionsLoadingJob = lifecycleScope.launch {
            try {
                val positions = publication.positions()
                positionsCount = positions.size

                // Refresh label with the new count
                label.text = positionLabelText(lastKnownPosition, lastKnownProgression)
            } catch (e: Exception) {
                // Failed to load positions, continue showing position without total
            }
        }
    }

    /**
     * Update the text color of the position label.
     * Should be called on the main thread.
     */
    fun setTextColor(color: Int) {
        label.setTextColor(color)
    }

    /**
     * Cancel any ongoing loading operations and remove the label from the view hierarchy.
     */
    fun cleanup() {
        positionsLoadingJob?.cancel()
        positionsLoadingJob = null
        containerView.removeView(label)
    }
}
