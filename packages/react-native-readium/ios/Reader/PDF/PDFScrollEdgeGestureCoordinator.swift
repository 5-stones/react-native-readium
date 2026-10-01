import UIKit

/// Lets a container that encloses the reader - typically a bottom sheet - take
/// over a downward drag once the PDF has nothing left to scroll.
///
/// PDFKit renders into its own `UIScrollView`, whose pan recognizer is the
/// innermost one under the finger and so wins the touch outright. React Native's
/// gesture system only recognises simultaneously with scrollables it has been
/// told about, and a PDFKit-internal scroll view is not one of them, so without
/// help the sheet never sees a drag that starts over the page.
///
/// The decision has to be made *before* the scroll view's pan recognizes,
/// because once it does, UIKit fails the container's recognizer for the rest of
/// the touch and there is no way to hand the gesture back. `UIScrollView` does
/// not allow its `panGestureRecognizer.delegate` to be replaced - doing so
/// raises an exception - so instead a passive recognizer watches the raw touches
/// and, on the first pixel of a downward drag that starts at the top of the
/// document, turns scrolling off. The scroll view's pan then never begins and
/// the container's recognizer takes the gesture. Scrolling is restored as soon
/// as the touch ends.
final class PDFScrollEdgeGestureCoordinator {

    private weak var scrollView: UIScrollView?
    private let observer = TouchObserverGestureRecognizer()

    /// Slack for comparing against the resting offset, which is not always
    /// exactly the inset because of fractional layout values.
    private static let topEpsilon: CGFloat = 0.5

    /// Travel before a drag counts as directional.
    private static let directionThreshold: CGFloat = 1

    init(scrollView: UIScrollView, observing view: UIView) {
        self.scrollView = scrollView

        observer.onMove = { [weak self] translation in
            self?.handleMove(translation)
        }
        observer.onFinish = { [weak self] in
            self?.restoreScrolling()
        }

        view.addGestureRecognizer(observer)
    }

    deinit {
        observer.view?.removeGestureRecognizer(observer)
        restoreScrolling()
    }

    /// Whether scrolling was turned off for the current touch, so it is only
    /// restored if this actually disabled it.
    private var didYieldToContainer = false

    private func handleMove(_ translation: CGPoint) {
        guard
            !didYieldToContainer,
            let scrollView = scrollView,
            scrollView.isScrollEnabled
        else {
            return
        }

        // Once the scroll view's pan has recognized, UIKit has already failed the
        // container's recognizer for this touch. Disabling scrolling now would
        // only freeze the page with nothing to hand off to, so leave it alone -
        // this matters when a drag scrolls up to the top and then keeps going.
        guard !scrollView.isDragging else { return }

        // Only a predominantly downward drag is a candidate; sideways panning of
        // a zoomed page still belongs to the scroll view.
        guard
            translation.y > Self.directionThreshold,
            abs(translation.y) > abs(translation.x)
        else {
            return
        }

        let topOffset = -scrollView.adjustedContentInset.top
        guard scrollView.contentOffset.y <= topOffset + Self.topEpsilon else {
            return
        }

        didYieldToContainer = true
        scrollView.isScrollEnabled = false
    }

    private func restoreScrolling() {
        guard didYieldToContainer else { return }
        didYieldToContainer = false
        scrollView?.isScrollEnabled = true
    }
}

/// Reports raw touch movement without ever recognizing.
///
/// Staying in `.possible` for the whole sequence means it never competes with
/// the recognizers around it, never swallows touches, and still sees movement
/// from the very first pixel - well before `UIScrollView`'s pan reaches its own
/// slop threshold.
private final class TouchObserverGestureRecognizer: UIGestureRecognizer {

    var onMove: ((CGPoint) -> Void)?
    var onFinish: (() -> Void)?

    private var startLocation: CGPoint?

    override init(target: Any?, action: Selector?) {
        super.init(target: target, action: action)
        cancelsTouchesInView = false
        delaysTouchesBegan = false
        delaysTouchesEnded = false
    }

    convenience init() {
        self.init(target: nil, action: nil)
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent) {
        super.touchesBegan(touches, with: event)
        guard touches.count == 1, let touch = touches.first else {
            startLocation = nil
            return
        }
        startLocation = touch.location(in: view)
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent) {
        super.touchesMoved(touches, with: event)
        guard let start = startLocation, let touch = touches.first else { return }

        let current = touch.location(in: view)
        onMove?(CGPoint(x: current.x - start.x, y: current.y - start.y))
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent) {
        super.touchesEnded(touches, with: event)
        finish()
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent) {
        super.touchesCancelled(touches, with: event)
        finish()
    }

    override func reset() {
        super.reset()
        finish()
    }

    private func finish() {
        startLocation = nil
        onFinish?()
    }
}
