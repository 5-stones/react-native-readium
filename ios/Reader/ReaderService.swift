import Combine
import Foundation
import R2Shared
import R2Streamer
import UIKit

final class ReaderService: Loggable {
  var app: AppModule?
  var streamer = Streamer()
  private var subscriptions = Set<AnyCancellable>()

  init() {
    do {
      self.app = try AppModule()
    } catch {
      print("TODO: An error occurred instantiating the ReaderService")
      print(error)
    }
  }
  
  static func locatorFromLocation(
    _ location: NSDictionary?,
    _ publication: Publication?
  ) -> Locator? {
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

      return publication.locate(link)
    } else {
      return try? Locator(json: location)
    }
    
    return nil
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
          let locator: Locator? = ReaderService.locatorFromLocation(location, pub)
          let vc = reader.getViewController(
            for: pub,
            bookId: bookId,
            locator: locator
          )

          if (vc != nil) {
            completion(vc!)
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
    let openFuture = Future<(Publication, MediaType), ReaderError>(
      on: .global(),
      { promise in
        let asset = FileAsset(url: url)
        guard let mediaType = asset.mediaType() else {
          promise(.failure(.openFailed(Publication.OpeningError.unsupportedFormat)))
          return
        }

        self.streamer.open(
          asset: asset,
          allowUserInteraction: allowUserInteraction,
          sender: sender
        ) { result in
          switch result {
          case .success(let publication):
            promise(.success((publication, mediaType)))
          case .failure(let error):
            promise(.failure(.openFailed(error)))
          case .cancelled:
            promise(.failure(.cancelled))
          }
        }
      }
    )

    return openFuture.eraseToAnyPublisher()
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
