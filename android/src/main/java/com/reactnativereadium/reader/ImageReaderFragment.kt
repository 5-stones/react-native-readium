package com.reactnativereadium.reader

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.commitNow
import androidx.lifecycle.ViewModelProvider
import com.reactnativereadium.R
import org.readium.r2.navigator.Navigator
import org.readium.r2.navigator.image.ImageNavigatorFragment
import org.readium.r2.shared.ExperimentalReadiumApi
import org.readium.r2.shared.publication.Locator
import org.readium.r2.shared.publication.Publication

@OptIn(ExperimentalReadiumApi::class)
class ImageReaderFragment : VisualReaderFragment(), ImageNavigatorFragment.Listener {

    override lateinit var model: ReaderViewModel
    override lateinit var navigator: Navigator

    private lateinit var factory: ReaderViewModel.Factory
    private lateinit var navigatorFactory: androidx.fragment.app.FragmentFactory

    fun initFactory(publication: Publication, initialLocation: Locator?) {
        factory = ReaderViewModel.Factory(publication, initialLocation)
        navigatorFactory = ImageNavigatorFragment.createFactory(
            publication = publication,
            initialLocator = initialLocation,
            listener = this
        )
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        check(::factory.isInitialized) { "ImageReaderFragment factory was not initialized" }
        ViewModelProvider(this, factory)
            .get(ReaderViewModel::class.java)
            .let { model = it }
        childFragmentManager.fragmentFactory = navigatorFactory
        super.onCreate(savedInstanceState)
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = super.onCreateView(inflater, container, savedInstanceState)
        val tag = getString(R.string.image_navigator_tag)
        if (savedInstanceState == null) {
            childFragmentManager.commitNow {
                add(R.id.fragment_reader_container, ImageNavigatorFragment::class.java, Bundle(), tag)
            }
        }
        navigator = childFragmentManager.findFragmentByTag(tag) as Navigator
        return view
    }

    companion object {
        fun newInstance() = ImageReaderFragment()
    }
}
