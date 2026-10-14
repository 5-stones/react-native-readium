package com.reactnativereadium.reader

import android.graphics.Color
import android.view.View
import android.widget.TextView
import androidx.annotation.ColorInt
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import org.readium.r2.shared.publication.Publication
import org.readium.r2.shared.publication.services.positions

/**
 * Keeps the reader's position label up to date: "12 / 340", or a percentage
 * where the publication has no positions.
 *
 * The label floats over the page's bottom margin and is hidden while it has
 * nothing to say. Its colour is the only thing it owns: the surface behind it
 * belongs to the reader's root view. See `res/layout/fragment_reader.xml`.
 */
class PositionLabelManager(
    private val label: TextView,
    private val publication: Publication,
    private val lifecycleScope: CoroutineScope
) {
    private var positionsCount: Int? = null
    private var positionsLoadingJob: Job? = null
    private var lastKnownPosition: Int? = null
    private var lastKnownProgression: Double? = null

    init {
        setupLabel()
    }

    private fun setupLabel() {
        // The theme decides the colour; until it says, this suits a light page.
        setTextColor(Color.DKGRAY)
    }

    /** Sets the label's colour from the reader's theme. */
    fun setTextColor(@ColorInt text: Int) {
        label.setTextColor(text)
    }

    /** Shown only when it has something to say, so it costs no space when not. */
    private fun show(text: String?) {
        label.text = text
        label.visibility = if (text.isNullOrEmpty()) View.GONE else View.VISIBLE
    }

    /**
     * Update the position label with current position and progression.
     * Should be called on the main thread.
     */
    fun update(position: Int?, totalProgression: Double?) {
        lastKnownPosition = position
        lastKnownProgression = totalProgression
        show(positionLabelText(position, totalProgression))
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
                show(positionLabelText(lastKnownPosition, lastKnownProgression))
            } catch (e: Exception) {
                // Failed to load positions, continue showing position without total
            }
        }
    }

    /**
     * Stops loading positions, and leaves the label with nothing to say.
     *
     * The label belongs to the layout now, so it is not removed — the fragment
     * that owns it is going away anyway.
     */
    fun cleanup() {
        positionsLoadingJob?.cancel()
        positionsLoadingJob = null
        show(null)
    }
}
