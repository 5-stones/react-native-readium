import Combine
import Foundation
import NitroModules
import ReadiumShared
import ReadiumStreamer
import UIKit
import ReadiumNavigator

class HybridReadiumView: HybridReadiumViewSpec {

  // MARK: - HybridReadiumViewSpec conformance

  var view: UIView { hostView }

  var file: ReadiumFile? = nil {
    didSet {
      guard let file = file else { return }
      pendingFileUrl = file.url
      pendingInitialLocation = file.initialLocation
      tryLoadBook()
    }
  }

  var preferences: Preferences? = nil {
    didSet {
      updatePreferences()
    }
  }

  var decorations: [DecorationGroup]? = nil {
    didSet {
      updateDecorations()
    }
  }

  var selectionActions: [SelectionAction]? = nil {
    didSet {
      selectionActionsReceived = true
      tryLoadBook()
    }
  }

  var onLocationChange: ((Locator) -> Void)? = nil
  var onPublicationReady: ((PublicationReadyEvent) -> Void)? = nil
  var onDecorationActivated: ((DecorationActivatedEvent) -> Void)? = nil
  var onSelectionChange: ((SelectionEvent) -> Void)? = nil
  var onSelectionAction: ((SelectionActionEvent) -> Void)? = nil

  // MARK: - Private state

  private let hostView = UIView()
  private var readerService = ReaderService()
  private var readerViewController: ReaderViewController?
  /// Iterator for the in-flight search, kept alive so results can be paged lazily.
  private var searchIterator: SearchIterator?
  /// Whether the current publication exposes a search service. Assumed `true`
  /// until a search proves otherwise, so a `loadMore` with no active search
  /// doesn't masquerade as "search unsupported".
  private var searchSupported = true
  /// Bumped on each new search / cancel. A task whose `next()` was in flight
  /// when superseded checks this so it can't close or clobber the iterator that
  /// replaced it.
  private var searchGeneration = 0
  private var subscriptions = Set<AnyCancellable>()
  private var pendingFileUrl: String?
  private var pendingInitialLocation: Locator?
  private var hasLoadedBook = false
  private var selectionActionsReceived = false
  private var activeDecorationGroups = Set<String>()

  private var viewController: UIViewController? {
    let vc = sequence(first: hostView, next: { $0.next }).first(where: { $0 is UIViewController })
    return vc as? UIViewController
  }

  // MARK: - Book loading

  private func tryLoadBook() {
    guard let url = pendingFileUrl,
          selectionActionsReceived,
          !hasLoadedBook else {
      return
    }

    hasLoadedBook = true
    let initialLoc = pendingInitialLocation
    pendingFileUrl = nil
    pendingInitialLocation = nil

    loadBook(url: url, location: initialLoc)
  }

  private func loadBook(url: String, location: Locator?) {
    guard let rootViewController = UIApplication.shared.delegate?.window??.rootViewController else { return }

    // Convert Nitro Locator directly to Readium Locator
    let readiumLocator: RLocator? = location.flatMap { nitroLocatorToReadium($0) }

    // Convert selection actions to typed array
    let actionData: [SelectionActionData]? = selectionActions?.isEmpty == false
      ? selectionActions?.map { SelectionActionData(id: $0.id, label: $0.label) }
      : nil

    readerService.buildViewController(
      url: url,
      bookId: url,
      locator: readiumLocator,
      selectionActions: actionData,
      sender: rootViewController,
      completion: { [weak self] vc in
        guard let self = self else { return }

        if let epubVC = vc as? EPUBViewController {
          epubVC.selectionActionDelegate = self
        }

        self.addViewControllerAsSubview(vc)
      }
    )
  }

  // MARK: - Preferences

  private func updatePreferences() {
    guard readerViewController != nil else { return }
    guard let navigator = readerViewController?.navigator as? EPUBNavigatorViewController else { return }
    guard let prefs = preferences else { return }

    let epubPrefs = nitroPreferencesToEPUB(prefs)
    navigator.submitPreferences(epubPrefs)
  }

  // MARK: - Decorations

  private func updateDecorations() {
    guard readerViewController != nil else { return }
    guard let navigator = readerViewController?.navigator as? DecorableNavigator else { return }
    guard let groups = decorations else { return }

    for group in groups {
      let readiumDecorations = group.decorations.compactMap { dec -> RDecoration? in
        return nitroDecorationToReadium(dec)
      }

      navigator.apply(decorations: readiumDecorations, in: group.name)

      if !activeDecorationGroups.contains(group.name) {
        activeDecorationGroups.insert(group.name)

        navigator.observeDecorationInteractions(inGroup: group.name) { [weak self] event in
          guard let self = self else { return }

          let decorationPayload = readiumDecorationToNitro(event.decoration, group: event.group)

          var rect: Rect?
          if let r = event.rect {
            rect = Rect(x: Double(r.origin.x), y: Double(r.origin.y), width: Double(r.size.width), height: Double(r.size.height))
          }

          var point: Point?
          if let p = event.point {
            point = Point(x: Double(p.x), y: Double(p.y))
          }

          let payload = DecorationActivatedEvent(
            decoration: decorationPayload,
            group: event.group,
            rect: rect,
            point: point
          )

          self.onDecorationActivated?(payload)
        }
      }
    }
  }

  // MARK: - Selection Actions

  private func updateSelectionActions() {
    guard let actions = selectionActions, !actions.isEmpty else { return }
    // Selection actions are applied during fragment setup
  }

  // MARK: - View lifecycle

  private func addViewControllerAsSubview(_ vc: ReaderViewController) {
    vc.publisher.sink(receiveValue: { [weak self] locator in
      guard let self = self else { return }
      let nitroLocator = readiumLocatorToNitro(locator)
      self.onLocationChange?(nitroLocator)
    })
    .store(in: &subscriptions)

    readerViewController = vc

    // Apply pending state
    if preferences != nil { updatePreferences() }
    if decorations != nil { updateDecorations() }

    guard
      readerViewController != nil,
      hostView.superview?.frame != nil,
      viewController != nil
    else { return }

    readerViewController!.view.frame = hostView.superview!.frame
    viewController!.addChild(readerViewController!)
    let rootView = readerViewController!.view!
    hostView.addSubview(rootView)
    viewController!.addChild(readerViewController!)
    readerViewController!.didMove(toParent: viewController!)

    rootView.translatesAutoresizingMaskIntoConstraints = false
    rootView.topAnchor.constraint(equalTo: hostView.topAnchor).isActive = true
    rootView.bottomAnchor.constraint(equalTo: hostView.bottomAnchor).isActive = true
    rootView.leftAnchor.constraint(equalTo: hostView.leftAnchor).isActive = true
    rootView.rightAnchor.constraint(equalTo: hostView.rightAnchor).isActive = true

    Task { @MainActor [weak self] in
      guard let self = self else { return }

      let tocResult = await vc.publication.tableOfContents()
      let positionsResult = await vc.publication.positions()

      var tocLinks: [Link] = []
      switch tocResult {
      case .success(let links):
        tocLinks = flattenReadiumLinks(links)
      case .failure:
        tocLinks = []
      }

      var positions: [Locator] = []
      switch positionsResult {
      case .success(let pos):
        positions = pos.map { readiumLocatorToNitro($0) }
      case .failure:
        positions = []
      }

      let metadata = readiumMetadataToNitro(vc.publication.metadata)

      let event = PublicationReadyEvent(
        tableOfContents: tocLinks,
        positions: positions,
        metadata: metadata
      )

      self.onPublicationReady?(event)
    }
  }

  // MARK: - Imperative navigation

  func goTo(locator: Locator) {
    Task { @MainActor [weak self] in
      guard let self else { return }
      guard let navigator = self.readerViewController?.navigator else { return }
      guard let readiumLocator = nitroLocatorToReadium(locator) else { return }
      _ = await navigator.go(to: readiumLocator, options: .animated)
    }
  }

  func goForward() {
    Task { @MainActor in
      guard let navigator = readerViewController?.navigator else { return }
      _ = await navigator.goForward(options: .animated)
    }
  }

  func goBackward() {
    Task { @MainActor in
      guard let navigator = readerViewController?.navigator else { return }
      _ = await navigator.goBackward(options: .animated)
    }
  }

  func destroy() {
    if Thread.isMainThread {
      cleanup()
    } else {
      DispatchQueue.main.async { [weak self] in
        self?.cleanup()
      }
    }
  }

  /// Starts a new search and resolves with the first page of results. Any
  /// previously running search is cancelled and its iterator released.
  func search(query: String, options: SearchOptions?) throws -> Promise<SearchPage> {
    let readiumOptions = options.map { nitroSearchOptionsToReadium($0) }
    return Promise.async { @MainActor [weak self] in
      guard let self else { return SearchPage.unsupported }
      return await self.startSearch(query: query, options: readiumOptions)
    }
  }

  /// Resolves with the next page of results for the in-flight search, or an
  /// empty terminal page when the iterator is exhausted / no search is active.
  func loadMoreSearchResults() throws -> Promise<SearchPage> {
    Promise.async { @MainActor [weak self] in
      guard let self else { return SearchPage.unsupported }
      return await self.nextSearchPage(generation: self.searchGeneration)
    }
  }

  /// Cancels the in-flight search and releases the iterator.
  func cancelSearch() throws {
    Task { @MainActor [weak self] in
      guard let self else { return }
      self.searchGeneration &+= 1
      self.searchIterator?.close()
      self.searchIterator = nil
    }
  }

  @MainActor
  private func startSearch(
    query: String,
    options: ReadiumShared.SearchOptions?
  ) async -> SearchPage {
    // Supersede any prior search and release its iterator.
    searchGeneration &+= 1
    let generation = searchGeneration
    searchIterator?.close()
    searchIterator = nil

    guard
      let publication = readerViewController?.publication,
      publication.findService(SearchService.self) != nil
    else {
      searchSupported = false
      return SearchPage.unsupported
    }
    searchSupported = true

    switch await publication.search(query: query, options: options) {
    case .failure(let error):
      log(.error, "Search failed to start: \(error)")
      return SearchPage(results: [], hasMore: false, totalCount: nil, isSupported: true)
    case .success(let iterator):
      // A newer search (or cancel) ran while we awaited; discard this iterator.
      guard generation == searchGeneration else {
        iterator.close()
        return SearchPage(results: [], hasMore: false, totalCount: nil, isSupported: true)
      }
      searchIterator = iterator
      return await nextSearchPage(generation: generation)
    }
  }

  @MainActor
  private func nextSearchPage(generation: Int) async -> SearchPage {
    guard generation == searchGeneration, let iterator = searchIterator else {
      return SearchPage(results: [], hasMore: false, totalCount: nil, isSupported: searchSupported)
    }

    switch await iterator.next() {
    case .success(let page):
      // Bail if a newer search/cancel superseded us while awaiting `next()`; the
      // superseding task owns (and has already closed) the replaced iterator.
      guard generation == searchGeneration else {
        return SearchPage(results: [], hasMore: false, totalCount: nil, isSupported: true)
      }
      let total = iterator.resultCount.map { Double($0) }
      if let page = page {
        return SearchPage(
          results: page.locators.map { nitroSearchResultFromReadium($0) },
          hasMore: true,
          totalCount: total,
          isSupported: true
        )
      }
      // Exhausted: release the iterator and report the terminal page.
      iterator.close()
      searchIterator = nil
      return SearchPage(results: [], hasMore: false, totalCount: total, isSupported: true)
    case .failure(let error):
      log(.error, "Search iteration error: \(error)")
      guard generation == searchGeneration else {
        return SearchPage(results: [], hasMore: false, totalCount: nil, isSupported: true)
      }
      iterator.close()
      searchIterator = nil
      return SearchPage(results: [], hasMore: false, totalCount: nil, isSupported: true)
    }
  }

  // Cleanup
  func cleanup() {
    searchIterator?.close()
    searchIterator = nil

    guard let vc = readerViewController else { return }
    readerViewController = nil

    vc.willMove(toParent: nil)
    if vc.view.superview != nil {
      vc.view.removeFromSuperview()
    }
    vc.removeFromParent()

    for subscription in subscriptions {
      subscription.cancel()
    }
    subscriptions = Set<AnyCancellable>()
    activeDecorationGroups.removeAll()
  }
}

// MARK: - Loggable

extension HybridReadiumView: Loggable {}

// MARK: - SelectionActionDelegate

extension HybridReadiumView: SelectionActionDelegate {
  func onSelectionAction(actionId: String, locator: RLocator, selectedText: String) {
    let nitroLocator = readiumLocatorToNitro(locator)

    let event = SelectionActionEvent(
      locator: nitroLocator,
      selectedText: selectedText,
      actionId: actionId
    )

    self.onSelectionAction?(event)
  }
}
