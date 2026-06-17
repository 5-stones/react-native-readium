import UIKit
import ReadiumShared
import ReadiumNavigator
import PDFKit

class PDFViewController: ReaderViewController {

    private var isPDFViewConfigured = false

    init(
        publication: Publication,
        locator: ReadiumShared.Locator?,
        bookId: String,
        navigator: PDFNavigatorViewController
    ) throws {
        super.init(
            navigator: navigator,
            publication: publication,
            bookId: bookId
        )
        navigator.delegate = self
    }

    var pdfNavigator: PDFNavigatorViewController {
        return navigator as! PDFNavigatorViewController
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupNavigatorConstraints()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        if !isPDFViewConfigured {
            configureNativePDFView()
        }
    }

    private func setupNavigatorConstraints() {
        let navigatorView = pdfNavigator.view!
        navigatorView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(navigatorView)
        NSLayoutConstraint.activate([
            navigatorView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            navigatorView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            navigatorView.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
            navigatorView.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor)
        ])
    }

    private func configureNativePDFView() {
        guard let pdfView = findNativePDFView(in: pdfNavigator.view) else { return }

        isPDFViewConfigured = true
        pdfView.displaysAsBook = false
        pdfView.displayMode = .singlePageContinuous
        pdfView.autoScales = false
        pdfView.minScaleFactor = pdfView.scaleFactorForSizeToFit
        pdfView.scaleFactor = pdfView.scaleFactorForSizeToFit
        pdfView.layoutDocumentView()

        if let scrollView = pdfView.subviews.first(where: { $0 is UIScrollView }) as? UIScrollView {
            scrollView.isScrollEnabled = true
            scrollView.alwaysBounceVertical = true
            scrollView.alwaysBounceHorizontal = false
        }
    }

    private func findNativePDFView(in view: UIView) -> PDFView? {
        if let pdfView = view as? PDFView {
            return pdfView
        }
        for subview in view.subviews {
            if let found = findNativePDFView(in: subview) {
                return found
            }
        }
        return nil
    }
}

extension PDFViewController: PDFNavigatorDelegate {}

extension PDFViewController: UIGestureRecognizerDelegate {
    func gestureRecognizer(
        _ gestureRecognizer: UIGestureRecognizer,
        shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
    ) -> Bool {
        return true
    }
}
