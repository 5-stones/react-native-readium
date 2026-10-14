import Foundation
import ReadiumShared

/// Where a publication's resources are fetched from, answered when a read
/// happens rather than when the publication opened.
///
/// `HTTPResource` holds its url in a `let` and rebuilds every request from it,
/// so a publication opened at one location can never be moved to another. That
/// is fine until a credential in the location expires. This asks for the
/// location per read instead, so replacing it is enough — no reopening, and the
/// reading position is never disturbed.
public final class RebasingResourceFactory: ResourceFactory {
  private let currentURL: () -> (any AbsoluteURL)?
  private let inner: ResourceFactory
  private let recover: (any AbsoluteURL, ReadError) async -> Bool
  private let noteSuccess: () -> Void

  /// - Parameters:
  ///   - currentURL: Read on every read. Nil falls back to the url the
  ///     resource was made for.
  ///   - inner: Makes the resource actually read from, once a location is
  ///     known.
  ///   - recover: Answers a failed read: moves the location and returns true
  ///     to have the read tried again, or false to let the failure stand.
  ///   - noteSuccess: Called whenever a read succeeds, so `recover` can tell a
  ///     location that works from one that only looked like it might.
  public init(
    currentURL: @escaping () -> (any AbsoluteURL)?,
    inner: ResourceFactory,
    recover: @escaping (any AbsoluteURL, ReadError) async -> Bool = { _, _ in false },
    noteSuccess: @escaping () -> Void = {}
  ) {
    self.currentURL = currentURL
    self.inner = inner
    self.recover = recover
    self.noteSuccess = noteSuccess
  }

  public func make(url: any AbsoluteURL) async -> Result<any Resource, ResourceMakeError> {
    .success(
      RebasingResource(
        openedAt: url,
        currentURL: currentURL,
        inner: inner,
        recover: recover,
        noteSuccess: noteSuccess
      )
    )
  }
}

/// A resource that resolves its location per read. See
/// ``RebasingResourceFactory``.
private final class RebasingResource: Resource {
  private let openedAt: any AbsoluteURL
  private let currentURL: () -> (any AbsoluteURL)?
  private let inner: ResourceFactory
  private let recover: (any AbsoluteURL, ReadError) async -> Bool
  private let noteSuccess: () -> Void

  /// The delegate in use, and the location it was made for. Kept so a read
  /// does not pay to remake it, and dropped when the location moves.
  private var delegate: (url: any AbsoluteURL, resource: any Resource)?

  init(
    openedAt: any AbsoluteURL,
    currentURL: @escaping () -> (any AbsoluteURL)?,
    inner: ResourceFactory,
    recover: @escaping (any AbsoluteURL, ReadError) async -> Bool,
    noteSuccess: @escaping () -> Void
  ) {
    self.openedAt = openedAt
    self.currentURL = currentURL
    self.inner = inner
    self.recover = recover
    self.noteSuccess = noteSuccess
  }

  /// The location now in use. Truthful per read: callers use it to decide
  /// whether they can reach the content more directly.
  var sourceURL: (any AbsoluteURL)? { currentURL() ?? openedAt }

  private func resource() async -> ReadResult<any Resource> {
    let url = currentURL() ?? openedAt

    if let delegate, delegate.url.string == url.string {
      return .success(delegate.resource)
    }
    // Dropped as well as closed: making the next one can fail, and a closed
    // resource must not be handed out if the location moves back.
    delegate?.resource.close()
    delegate = nil

    switch await inner.make(url: url) {
    case let .success(resource):
      delegate = (url: url, resource: resource)
      return .success(resource)
    case let .failure(error):
      // The only way this fails is an unsupported scheme, which is passed
      // through rather than dressed up as something that happened while
      // reading.
      return .failure(.access(.other(error)))
    }
  }

  /// Runs a read, and on failure gives `recover` a chance to move the location
  /// and have it tried once more.
  ///
  /// Retrying here rather than reporting is what keeps the failure invisible:
  /// the navigator does not retry a read of its own, so a failure that escapes
  /// costs the reader the page they were turning to.
  private func attempt<S>(
    _ read: () async -> ReadResult<S>
  ) async -> ReadResult<S> {
    let first = await read()
    guard case let .failure(error) = first else {
      noteSuccess()
      return first
    }

    guard await recover(sourceURL ?? openedAt, error) else { return first }

    // `resource()` picks up the new location, so this reads from it.
    let second = await read()
    if case .success = second { noteSuccess() }
    return second
  }

  func properties() async -> ReadResult<ResourceProperties> {
    await attempt {
      switch await resource() {
      case let .success(resource): return await resource.properties()
      case let .failure(error): return .failure(error)
      }
    }
  }

  func estimatedLength() async -> ReadResult<UInt64?> {
    await attempt {
      switch await resource() {
      case let .success(resource): return await resource.estimatedLength()
      case let .failure(error): return .failure(error)
      }
    }
  }

  func stream(
    range: Range<UInt64>?,
    consume: @escaping (Data) -> Void
  ) async -> ReadResult<Void> {
    // Chunks already handed to `consume` cannot be taken back, so a read that
    // failed part-way through is not retried: the caller would see those bytes
    // twice. An expired credential fails the response itself, before any of it
    // arrives, which is the case worth retrying.
    var consumed = false
    let watched: (Data) -> Void = { data in
      if !data.isEmpty { consumed = true }
      consume(data)
    }

    let first = await streamOnce(range: range, consume: watched)
    guard case let .failure(error) = first else {
      noteSuccess()
      return first
    }

    guard !consumed, await recover(sourceURL ?? openedAt, error) else {
      return first
    }

    // `resource()` picks up the new location, so this reads from it.
    let second = await streamOnce(range: range, consume: watched)
    if case .success = second { noteSuccess() }
    return second
  }

  private func streamOnce(
    range: Range<UInt64>?,
    consume: @escaping (Data) -> Void
  ) async -> ReadResult<Void> {
    switch await resource() {
    case let .success(resource):
      return await resource.stream(range: range, consume: consume)
    case let .failure(error):
      return .failure(error)
    }
  }

  deinit {
    delegate?.resource.close()
  }
}
