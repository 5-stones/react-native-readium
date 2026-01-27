package com.reactnativereadium.reader

import android.graphics.PointF
import android.graphics.RectF
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.reactnativereadium.utils.EventChannel
import kotlinx.coroutines.channels.Channel
import org.readium.r2.navigator.Decoration
import org.readium.r2.shared.publication.Locator
import org.readium.r2.shared.publication.Publication
import org.readium.r2.shared.publication.Link
import org.readium.r2.shared.publication.Metadata

class ReaderViewModel(
  val publication: Publication,
  val initialLocation: Locator?
) : ViewModel() {
    val channel = EventChannel(Channel<Event>(Channel.BUFFERED), viewModelScope)

    class Factory(
      private val publication: Publication,
      private val initialLocation: Locator?
    ) : ViewModelProvider.NewInstanceFactory() {
        override fun <T : ViewModel> create(modelClass: Class<T>): T =
            modelClass
              .getDeclaredConstructor(
                Publication::class.java,
                Locator::class.java
              )
              .newInstance(
                publication,
                initialLocation
              )
    }

    sealed class Event {
        class LocatorUpdate(val locator: Locator) : Event()
        class PublicationReady(
            val tableOfContents: List<Link>,
            val positions: List<Locator>,
            val metadata: Metadata
        ) : Event()
        class DecorationActivated(
            val decoration: Decoration,
            val group: String,
            val rect: RectF?,
            val point: PointF?
        ) : Event()
        class SelectionChanged(
            val locator: Locator?,
            val selectedText: String?
        ) : Event()
        class SelectionAction(
            val actionId: String,
            val locator: Locator,
            val selectedText: String
        ) : Event()
    }
}
