import Combine
import Foundation
import ReadiumShared
import ReadiumStreamer
import UIKit

final class ReaderService: Loggable {
  var app: AppModule?
  private var subscriptions = Set<AnyCancellable>()

  /// Where the open publication's resources are fetched from, when that is not
  /// where it was opened from. Read on every read, so replacing it moves the
  /// publication without reopening it.
  private let sourceLocationLock = NSLock()
  private var _sourceLocation: (any AbsoluteURL)?

  var sourceLocation: (any AbsoluteURL)? {
    sourceLocationLock.lock()
    defer { sourceLocationLock.unlock() }
    return _sourceLocation
  }

  func setSourceLocation(_ url: (any AbsoluteURL)?) {
    sourceLocationLock.lock()
    defer { sourceLocationLock.unlock() }
    _sourceLocation = url
  }

  /// Answers a failed read: moves the location and returns true to have the
  /// read tried again. Set by the view, which owns the policy.
  var recoverRead: ((any AbsoluteURL, ReadError) async -> Bool)?

  /// A read succeeded, which is what makes the location trustworthy again.
  var onReadSucceeded: (() -> Void)?

  /**
   How long a request for a publication's bytes may stall before it fails.

   `URLSessionConfiguration.default` allows 60 seconds, which is a minute of
   blank page on a CDN that has stopped answering: the navigator cannot paint a
   page until the read behind it returns, and nothing cancels it. Bounding the
   stall turns that into a `readFailed` the consumer can act on.

   The resource timeout is deliberately left alone. It caps a whole transfer
   rather than a stall, so any value short enough to help here would also kill
   a large read that is making honest progress on a slow connection.

   Mirrors `READ_TIMEOUT` in `ReaderService.kt`. Web caps a whole request
   instead, for want of a stall to measure; see `SOURCE_REQUEST_TIMEOUT_MS` in
   `web/utils/publicationFetch.ts`.
   */
  private static let requestTimeout: TimeInterval = 15

  private let httpClient = DefaultHTTPClient(
    requestTimeout: ReaderService.requestTimeout
  )

  // Lazy because the resource factory asks this service for the location, and
  // for a decision, on every read.
  private lazy var assetRetriever: AssetRetriever = AssetRetriever(
    formatSniffer: DefaultFormatSniffer(),
    resourceFactory: RebasingResourceFactory(
      currentURL: { [weak self] in self?.sourceLocation },
      inner: DefaultResourceFactory(httpClient: self.httpClient),
      recover: { [weak self] url, error in
        guard let recover = self?.recoverRead else { return false }
        return await recover(url, error)
      },
      noteSuccess: { [weak self] in self?.onReadSucceeded?() }
    ),
    archiveOpener: DefaultArchiveOpener()
  )

  private lazy var parser: PublicationParser = DefaultPublicationParser(
    httpClient: self.httpClient,
    assetRetriever: self.assetRetriever,
    pdfFactory: DefaultPDFDocumentFactory()
  )

  init() {
    do {
      self.app = try AppModule()
    } catch {
      log(.error, "Failed to instantiate AppModule: \(error)")
    }
  }

  /// A publication is about to open, so anything held about the last one is stale.
  var onPublicationOpening: (() -> Void)?

  func buildViewController(
    url: String,
    bookId: String,
    locator: ReadiumShared.Locator?,
    selectionActions: [SelectionActionData]?,
    credentials: String?,
    sender: UIViewController?,
    completion: @escaping (ReaderViewController) -> Void,
    onError: @escaping (ReaderError) -> Void
  ) {
    // A location belongs to the publication it was resolved for. Carrying one
    // into the next open would have that publication's resources read from the
    // previous one's location — the wrong book, under the right title.
    setSourceLocation(nil)
    onPublicationOpening?()

    guard let reader = self.app?.reader else { return }
    self.url(path: url)
      .flatMap { self.openPublication(at: $0, credentials: credentials, allowUserInteraction: true, sender: sender) }
      .flatMap { (pub, _) in self.checkIsReadable(publication: pub) }
      .sink(
        receiveCompletion: { [weak self] completion in
          if case .failure(let error) = completion {
            self?.log(.error, "Failed to open publication: \(error)")
            onError(error)
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

  /// Drops in-flight opens, so a view switching files never hears back from the previous one.
  func cancelPendingOpens() {
    subscriptions.removeAll()
  }

  func url(path: String) -> AnyPublisher<URL, ReaderError> {
    let url: URL
    if let absoluteURL = URL(string: path), absoluteURL.scheme != nil {
      url = absoluteURL
    } else if path.hasPrefix("/") {
      url = URL(fileURLWithPath: path)
    } else {
      return .fail(.fileNotFound(Self.fileNotFound(path)))
    }

    // Reported as fileNotFound, as on Android, rather than as a failure to read.
    if url.isFileURL && !FileManager.default.fileExists(atPath: url.path) {
      return .fail(.fileNotFound(Self.fileNotFound(path)))
    }
    return .just(url)
  }

  private static func fileNotFound(_ path: String) -> Error {
    CocoaError(.fileNoSuchFile, userInfo: [
      NSFilePathErrorKey: path,
      NSLocalizedDescriptionKey: "File does not exist: \(path)",
    ])
  }

  private func openPublication(
    at url: URL,
    credentials: String?,
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

          // Built per open so a protection registered after this view mounted still applies.
          let publicationOpener = PublicationOpener(
            parser: self.parser,
            contentProtections: ReaderContentProtectionRegistry.protections
          )
          let openResult = await publicationOpener.open(
            asset: asset,
            allowUserInteraction: allowUserInteraction,
            credentials: credentials,
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
        return .fail(.restricted(scheme: publication.protectionScheme, error: error))
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
