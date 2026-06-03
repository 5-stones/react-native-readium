import UIKit
import ReadiumShared
import ReadiumNavigator

class PDFViewController: ReaderViewController {

    /// Retained because `UIGestureRecognizer.delegate` is a weak reference.
    /// Replaced whenever the navigator recreates its `PDFDocumentView`.
    private var scrollEdgeCoordinator: PDFScrollEdgeGestureCoordinator?

    init(
        publication: Publication,
        locator: ReadiumShared.Locator?,
        bookId: String
    ) throws {
        // The navigator derives `displayMode`, `displaysAsBook` and the scale
        // factors from these preferences, so the reading layout is expressed
        // here rather than set on the `PDFDocumentView` after the fact.
        var preferences = PDFPreferences()
        preferences.scroll = true
        preferences.scrollAxis = .vertical
        // One page at a time, scaled to fit - i.e. `.singlePageContinuous`.
        preferences.spread = .never
        preferences.fit = .page
        preferences.offsetFirstPage = false

        let navigator = try PDFNavigatorViewController(
            publication: publication,
            initialLocation: locator,
            config: PDFNavigatorViewController.Configuration(
                preferences: preferences
            )
        )

        super.init(
            navigator: navigator,
            publication: publication,
            bookId: bookId
        )

        navigator.delegate = self
    }
}

extension PDFViewController: PDFNavigatorDelegate {

    /// Renders the document edge to edge.
    ///
    /// Left to itself the navigator insets the page by the window's safe area on
    /// iPhone, so the notch cannot cover the content. Here the reader is hosted
    /// inside a React Native view hierarchy that has already accounted for the
    /// safe area, so honouring it again just adds a band of empty space above
    /// the first page.
    func navigatorContentInset(_ navigator: VisualNavigator) -> UIEdgeInsets? {
        .zero
    }

    /// Called by the navigator every time it (re)creates the `PDFDocumentView`,
    /// right after it has applied `PDFPreferences`.
    ///
    /// Display mode, zoom and scale factors all come from those preferences, so
    /// this only carries what has no preference equivalent.
    func navigator(_ navigator: PDFNavigatorViewController, setupPDFView view: PDFDocumentView) {
        guard
            let scrollView = view.subviews.first(where: { $0 is UIScrollView }) as? UIScrollView
        else {
            return
        }

        // Rubber-banding is disabled so the reader stops consuming the drag once
        // it runs out of content. While the scroll view bounces it keeps owning
        // the gesture, which prevents an enclosing sheet from picking it up at
        // the top of the document and being dragged closed.
        scrollView.bounces = false
        scrollView.alwaysBounceVertical = false
        scrollView.alwaysBounceHorizontal = false

        // Stopping the bounce keeps the page still at the top but does not make
        // the scroll view give the gesture up, so the handoff needs this too.
        // Releasing the old coordinator detaches its observer and restores
        // scrolling before the new one attaches.
        scrollEdgeCoordinator = nil
        scrollEdgeCoordinator = PDFScrollEdgeGestureCoordinator(
            scrollView: scrollView,
            observing: view
        )
    }
}
