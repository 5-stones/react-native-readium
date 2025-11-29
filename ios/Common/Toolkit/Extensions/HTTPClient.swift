import Combine
import Foundation
import ReadiumShared

private final class HTTPTaskContainer {
  var task: Task<Void, Never>? = nil
}

extension HTTPClient {

  func fetch(_ request: HTTPRequestConvertible) -> AnyPublisher<HTTPResponse, HTTPError> {
    let container = HTTPTaskContainer()
    return Deferred {
      Future { promise in
        container.task = Task {
          let result = await self.fetch(request)
          promise(result)
        }
      }
    }
    .handleEvents(receiveCancel: { container.task?.cancel() })
    .eraseToAnyPublisher()
  }

  func download(_ request: HTTPRequestConvertible, progress: @escaping (Double) -> Void) -> AnyPublisher<HTTPDownload, HTTPError> {
    let container = HTTPTaskContainer()
    return Deferred {
      Future { promise in
        container.task = Task {
          let result = await self.download(request, onProgress: progress)
          promise(result)
        }
      }
    }
    .handleEvents(receiveCancel: { container.task?.cancel() })
    .eraseToAnyPublisher()
  }
}
