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
  
  static func locatorFromLocation(
    _ location: NSDictionary?,
    _ publication: Publication?
  ) async -> Locator? {
    guard location != nil else {
      return nil
    }

    let hasLocations = location?["locations"] != nil
    let hasType = (location?["type"] as? String)?.isEmpty == false
    let hasChildren = location?["children"] != nil
    let hasHashHref = (location?["href"] as? String)?.contains("#") == true
    let hasTemplated = location?["templated"] != nil

    // check that we're not dealing with a Link
    if ((!hasType || hasChildren || hasHashHref || hasTemplated) && !hasLocations) {
      guard let publication = publication else {
        return nil
      }
      guard let link = try? Link(json: location) else {
        return nil
      }

      return await publication.locate(link)
    } else {
      return try? Locator(json: location)
    }
  }

  func buildViewController(
    url: String,
    bookId: String,
    location: NSDictionary?,
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
              locator: locator
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
