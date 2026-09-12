import Combine
import Foundation
import ReadiumShared
import ReadiumStreamer
import UIKit

final class ReaderService: Loggable {
  var app: AppModule?
  private let assetRetriever: AssetRetriever
  private let publicationOpener: PublicationOpener
  private var subscriptions = Set<AnyCancellable>()

  init() {
    let httpClient = DefaultHTTPClient()
    let assetRetriever = AssetRetriever(httpClient: httpClient)
    let parser = DefaultPublicationParser(
      httpClient: httpClient,
      assetRetriever: assetRetriever,
      pdfFactory: DefaultPDFDocumentFactory()
    )

    self.assetRetriever = assetRetriever
    self.publicationOpener = PublicationOpener(parser: parser, onCreatePublication: { manifest, container, _ in
      // Readium's HTML injector searches for </head> when appending its CSS.
      // Legal XHTML <head/> otherwise loses ReadiumCSS-after (pagination).
      // Normalize the served resource, never rewrite the imported EPUB.
      let htmlHrefs = Set((manifest.readingOrder + manifest.resources)
        .filter { $0.mediaType?.isHTML == true }
        .map { $0.url().string })
      container = container.map { href, resource in
        guard htmlHrefs.contains(href.string) else { return resource }
        return resource.map { data in
          guard let html = String(data: data, encoding: .utf8) else { return data }
          return Data(BookentHTMLCompatibility.expandEmptyHead(in: html).utf8)
        }
      }
    })

    do {
      self.app = try AppModule()
    } catch {
      log(.error, "Failed to instantiate AppModule: \(error)")
    }
  }

  func buildViewController(
    url: String,
    bookId: String,
    locator: ReadiumShared.Locator?,
    selectionActions: [SelectionActionData]?,
    sender: UIViewController?,
    completion: @escaping (ReaderViewController) -> Void
  ) {
    guard let reader = self.app?.reader else { return }
    self.url(path: url)
      .flatMap { self.openPublication(at: $0, allowUserInteraction: true, sender: sender ) }
      .flatMap { (pub, _) in self.checkIsReadable(publication: pub) }
      .sink(
        receiveCompletion: { [weak self] completion in
          if case .failure(let error) = completion {
            self?.log(.error, "Failed to open publication: \(error)")
          }
        },
        receiveValue: { pub in
          Task { @MainActor in
            guard let viewController = reader.getViewController(
              for: pub,
              bookId: bookId,
              locator: Self.resolve(locator, in: pub),
              selectionActions: selectionActions
            ) else {
              return
            }

            completion(viewController)
          }
        }
      )
      .store(in: &subscriptions)
  }

  func url(path: String) -> AnyPublisher<URL, ReaderError> {
    // Absolute URL.
    if let url = URL(string: path), url.scheme != nil {
      return .just(url)
    }

    // Absolute file path.
    if path.hasPrefix("/") {
      return .just(URL(fileURLWithPath: path))
    }

    let error = NSError(
      domain: NSCocoaErrorDomain,
      code: NSFileNoSuchFileError,
      userInfo: [
        NSFilePathErrorKey: path,
        NSLocalizedDescriptionKey: "Unable to locate file: \(path)",
      ]
    )
    return .fail(.fileNotFound(error))
  }

  private func openPublication(
    at url: URL,
    allowUserInteraction: Bool,
    sender: UIViewController?
  ) -> AnyPublisher<(Publication, MediaType), ReaderError> {
    Deferred {
      Future<(Publication, MediaType), ReaderError> { promise in
        Task {
          let absoluteURLCandidate = AnyURL(url: url)
          guard let absoluteURL = absoluteURLCandidate.absoluteURL else {
            promise(.failure(.fileNotFound(URLError(.badURL))))
            return
          }

          let assetResult = await self.assetRetriever.retrieve(url: absoluteURL)

          let asset: Asset
          switch assetResult {
          case .success(let retrievedAsset):
            asset = retrievedAsset
          case .failure(let error):
            switch error {
            case .schemeNotSupported:
              promise(.failure(.openFailed(error)))
            case .formatNotSupported:
              promise(.failure(.formatNotSupported))
            case .reading(let readError):
              promise(.failure(.openFailed(readError)))
            }
            return
          }

          let mediaType = asset.format.mediaType ?? .binary

          let openResult = await self.publicationOpener.open(
            asset: asset,
            allowUserInteraction: allowUserInteraction,
            sender: sender
          )

          switch openResult {
          case .success(let publication):
            promise(.success((publication, mediaType)))
          case .failure(let error):
            switch error {
            case .formatNotSupported:
              promise(.failure(.formatNotSupported))
            case .reading(let readError):
              promise(.failure(.openFailed(readError)))
            }
          }
        }
      }
    }
    .eraseToAnyPublisher()
  }

  private func checkIsReadable(publication: Publication) -> AnyPublisher<Publication, ReaderError> {
    guard !publication.isRestricted else {
      if let error = publication.protectionError {
        return .fail(.openFailed(error))
      } else {
        return .fail(.cancelled)
      }
    }
    return .just(publication)
  }

  /// Realigns an initial locator against the publication that was actually opened.
  ///
  /// A stored locator can name a resource this publication doesn't have -- a PDF
  /// locator persisted by an older web build carries no resource at all, and the
  /// Readium toolkits name a standalone file `publication.<ext>` rather than using
  /// its on-disk filename. In both cases the reading position itself is still good,
  /// so rebase the locator onto the first reading-order resource instead of letting
  /// the navigator discard it and reopen at the beginning.
  static func resolve(
    _ locator: ReadiumShared.Locator?,
    in publication: Publication
  ) -> ReadiumShared.Locator? {
    guard let locator = locator else { return nil }
    guard publication.readingOrder.firstWithHREF(locator.href) == nil else { return locator }
    guard let first = publication.readingOrder.first else { return locator }

    return ReadiumShared.Locator(
      href: first.url(),
      mediaType: first.mediaType ?? locator.mediaType,
      title: locator.title,
      locations: locator.locations,
      text: locator.text
    )
  }
}

// Kept separate from the UIKit service so the exact normalization can be tested
// on macOS together with Readium's own HTML injector and WebKit pagination.
enum BookentHTMLCompatibility {
  static func expandEmptyHead(in html: String) -> String {
    guard let regex = try? NSRegularExpression(
      pattern: #"<head\b((?:[^<>"']|"[^"]*"|'[^']*')*?)/\s*>"#,
      options: [.caseInsensitive]
    ) else { return html }
    return regex.stringByReplacingMatches(
      in: html, range: NSRange(html.startIndex..., in: html), withTemplate: "<head$1></head>"
    )
  }
}
