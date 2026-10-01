package com.reactnativereadium

import android.content.Context
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import kotlin.math.abs

/**
 * Hosts the reader fragment's view and arbitrates vertical drags with whatever
 * React Native parent it is embedded in - in practice a bottom sheet.
 *
 * The reader's content is a plain Android view - `PDFView` for PDF, a `WebView`
 * for EPUB - which React Native's gesture system knows nothing about, so it
 * cannot tell whether that content is able to consume a drag. Left alone, a
 * parent such as `@gorhom/bottom-sheet` claims every vertical drag as soon as it
 * passes its activation threshold and cancels the reader's own gesture, which
 * makes a scrolling PDF appear to freeze after a few pixels.
 *
 * While the content can still scroll in the direction being dragged, this view
 * claims the gesture so the reader keeps it. When the content has run out - at
 * the top or bottom, or because it does not scroll vertically at all, as with a
 * paginated EPUB - it stays out of the way and the parent takes over, so the
 * sheet can still be dragged closed.
 *
 * Only the vertical axis is arbitrated. Parents that compete for these gestures
 * drag vertically, so a horizontal swipe is never at risk of being stolen and
 * needs no defending; claiming those as well would starve a horizontally
 * paginated EPUB's own page-turn gesture.
 */
class ReaderHostView(context: Context) : FrameLayout(context) {

  private var downX = 0f
  private var downY = 0f
  private var claimed = false

  /**
   * Resolved once per gesture. The subtree is stable for the duration of a drag,
   * and re-walking it on every motion event would be needless work on the touch
   * path. Null when nothing in the reader scrolls vertically.
   */
  private var verticalScroller: View? = null

  // Only dispatchTouchEvent is overridden: it sees every event in the stream,
  // whereas onInterceptTouchEvent runs inside it and would double-process them.
  override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
    trackGesture(ev)
    return super.dispatchTouchEvent(ev)
  }

  private fun trackGesture(ev: MotionEvent) {
    when (ev.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        downX = ev.x
        downY = ev.y
        claimed = false
        verticalScroller = findVerticalScroller(this)

        // Claiming cancels the parent's handlers for this stream and cannot be
        // undone, so doing it up front is only safe when the content can absorb
        // a drag either way. At an edge, wait until the direction is known.
        val content = verticalScroller
        if (content != null && content.canScrollVertically(-1) && content.canScrollVertically(1)) {
          claim()
        }
      }

      MotionEvent.ACTION_POINTER_DOWN -> {
        // A second finger means pinch-to-zoom, which is always content
        // interaction and never a drag on the parent.
        if (verticalScroller != null) {
          claim()
        }
      }

      MotionEvent.ACTION_MOVE -> {
        if (claimed) return
        val content = verticalScroller ?: return

        val dy = ev.y - downY
        if (abs(dy) < MIN_TRAVEL_PX) return

        // Predominantly sideways travel is not ours to defend. This is only a
        // per-event judgement, never latched, so the few pixels of jitter at the
        // start of a drag cannot misclassify the whole gesture - the next event
        // re-decides.
        if (abs(dy) < abs(ev.x - downX)) return

        // Dragging the finger down (dy > 0) reveals content above, which is a
        // scroll towards negative offsets, and vice versa.
        if (content.canScrollVertically(if (dy > 0) -1 else 1)) {
          claim()
        }
        // Otherwise the content is at its edge in this direction: leave the
        // gesture to the parent so a sheet can still be dragged closed.
      }

      MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
        claimed = false
        verticalScroller = null
      }
    }
  }

  /**
   * Take ownership of the gesture. Under React Native this cancels the enclosing
   * gesture handlers for the current touch stream, so it is one-way: the gesture
   * cannot be handed back mid-drag.
   */
  private fun claim() {
    if (claimed) return
    claimed = true
    parent?.requestDisallowInterceptTouchEvent(true)
  }

  /**
   * Innermost view below this one that scrolls vertically, or null if none does.
   *
   * Children are searched before their parent so the view that would actually
   * consume the drag wins. That matters for EPUB, whose `WebView` sits inside a
   * horizontally paginated container: the container scrolls, but not on this
   * axis, and only the `WebView` can answer for vertical travel.
   *
   * `canScrollVertically` is a public `View` API that `PDFView` overrides and
   * `WebView` implements, so this needs no knowledge of which navigator is
   * mounted.
   */
  private fun findVerticalScroller(view: View): View? {
    if (view is ViewGroup) {
      for (i in view.childCount - 1 downTo 0) {
        findVerticalScroller(view.getChildAt(i))?.let { return it }
      }
    }
    if (view !== this && view.scrollsVertically()) {
      return view
    }
    return null
  }

  private fun View.scrollsVertically(): Boolean =
    canScrollVertically(-1) || canScrollVertically(1)

  private companion object {
    /**
     * Travel before a drag counts as directional. Kept tiny on purpose: the
     * claim has to happen before the parent's own activation threshold.
     */
    const val MIN_TRAVEL_PX = 1f
  }
}
