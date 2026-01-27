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
    do {
      self.app = try AppModule()
    } catch {
      print("TODO: An error occurred instantiating the ReaderService")
      print(error)
    }

    let httpClient = DefaultHTTPClient()
    let assetRetriever = AssetRetriever(httpClient: httpClient)
    let parser = DefaultPublicationParser(
      httpClient: httpClient,
      assetRetriever: assetRetriever,
      pdfFactory: DefaultPDFDocumentFactory()
    )

    self.assetRetriever = assetRetriever
    self.publicationOpener = PublicationOpener(parser: parser)
  }
  
  /// Normalizes a location dictionary by removing leading slashes from its href for consistency across platforms.
  ///
  /// The Readium toolkit expects hrefs in relative format (e.g., "OPS/main3.xml")
  /// rather than absolute format (e.g., "/OPS/main3.xml").
  private static func normalizeLocation(_ location: NSDictionary) -> NSDictionary {
    guard let href = location["href"] as? String else {
      return location
    }

    // Check if href has a leading slash
    guard href.hasPrefix("/") else {
      return location
    }

    // Create a mutable copy and normalize the href
    let normalized = NSMutableDictionary(dictionary: location)
    let normalizedHref = String(href.dropFirst())
    normalized["href"] = normalizedHref

    return normalized
  }

  static func locatorFromLocation(
    _ location: NSDictionary?,
    _ publication: Publication?
  ) async -> Locator? {
    guard location != nil else {
      return nil
    }

    // Normalize the location by removing leading slashes from href
    let normalizedDict = normalizeLocation(location!)

    let hasLocations = normalizedDict["locations"] != nil
    let hasType = (normalizedDict["type"] as? String)?.isEmpty == false
    let hasChildren = normalizedDict["children"] != nil
    let hasHashHref = (normalizedDict["href"] as? String)?.contains("#") == true
    let hasTemplated = normalizedDict["templated"] != nil

    // check that we're not dealing with a Link
    if ((!hasType || hasChildren || hasHashHref || hasTemplated) && !hasLocations) {
      guard let publication = publication else {
        return nil
      }
      guard let link = try? Link(json: normalizedDict) else {
        return nil
      }

      let locator = await publication.locate(link)
      return locator
    } else {
      let locator = try? Locator(json: normalizedDict)
      return locator
    }
  }

  func buildViewController(
    url: String,
    bookId: String,
    location: NSDictionary?,
    selectionActions: String?,
    sender: UIViewController?,
    completion: @escaping (ReaderViewController) -> Void
  ) {
    guard let reader = self.app?.reader else { return }
    self.url(path: url)
      .flatMap { self.openPublication(at: $0, allowUserInteraction: true, sender: sender ) }
      .flatMap { (pub, _) in self.checkIsReadable(publication: pub) }
      .sink(
        receiveCompletion: { error in
          print(">>>>>>>>>>> TODO: handle me", error)
        },
        receiveValue: { pub in
          Task { @MainActor in
            let locator = await ReaderService.locatorFromLocation(location, pub)
            guard let viewController = reader.getViewController(
              for: pub,
              bookId: bookId,
              locator: locator,
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

    return .fail(ReaderError.fileNotFound(fatalError("Unable to locate file: " + path)))
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
}
