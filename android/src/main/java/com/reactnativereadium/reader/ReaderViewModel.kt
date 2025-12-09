package com.reactnativereadium.reader

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.reactnativereadium.utils.EventChannel
import kotlinx.coroutines.channels.Channel
import org.readium.r2.shared.publication.Locator
import org.readium.r2.shared.publication.Publication
import org.readium.r2.shared.publication.Link

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
        class TableOfContentsLoaded(val toc: List<Link>) : Event()
    }
}
