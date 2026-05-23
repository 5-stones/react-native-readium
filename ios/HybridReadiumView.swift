import Combine
import Foundation
import NitroModules
import ReadiumShared
import ReadiumStreamer
import UIKit
import ReadiumNavigator

private func makeNSError(_ message: String) -> NSError {
  return NSError(
    domain: "react-native-readium",
    code: 1,
    userInfo: [NSLocalizedDescriptionKey: message]
  )
}

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
  var onReady: ((PublicationInfo) -> Void)? = nil
  var onError: ((ReadiumError) -> Void)? = nil
  var onUnsupportedCapability: ((UnsupportedCapabilityEvent) -> Void)? = nil
  var onSearchProgress: ((SearchProgressEvent) -> Void)? = nil
  var onDecorationActivated: ((DecorationActivatedEvent) -> Void)? = nil
  var onSelectionChange: ((SelectionEvent) -> Void)? = nil
  var onSelectionAction: ((SelectionActionEvent) -> Void)? = nil
  var onMediaStateChange: ((MediaState) -> Void)? = nil
  var onMediaError: ((ReadiumError) -> Void)? = nil

  // MARK: - Private state

  private let hostView = UIView()
  private var readerService = ReaderService()
  private var readerViewController: ReaderViewController?
  private var subscriptions = Set<AnyCancellable>()
  private var searchTask: Task<Void, Never>?
  private var pendingFileUrl: String?
  private var pendingInitialLocation: Locator?
  private var hasLoadedBook = false
  private var selectionActionsReceived = false
  private var activeDecorationGroups = Set<String>()
  private var currentPublicationInfo: PublicationInfo?
  private var currentLocation: Locator?
  private var currentSelection = SelectionEvent(locator: nil, selectedText: nil)
  private var currentMediaState = MediaState(
    state: "unsupported",
    resourceIndex: 0,
    position: 0,
    duration: nil,
    totalDuration: nil,
    playbackRate: 1,
    track: nil
  )

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
    guard let rootViewController = UIApplication.shared.delegate?.window??.rootViewController else {
      emitError(code: "NO_ROOT_VIEW_CONTROLLER", message: "Unable to locate the root view controller")
      return
    }

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
      failure: { [weak self] error in
        self?.emitError(code: "OPEN_PUBLICATION_FAILED", message: "\(error)")
      },
      completion: { [weak self] vc in
        guard let self = self else { return }

        if let epubVC = vc as? EPUBViewController {
          epubVC.selectionActionDelegate = self
        }

        if let audioVC = vc as? AudioReaderViewController {
          audioVC.onPlaybackChange = { [weak self] _ in
            Task { @MainActor in self?.refreshMediaState() }
          }
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

  // MARK: - Error / capability helpers

  private func makeError(code: String, message: String, capability: String? = nil, details: String? = nil) -> ReadiumError {
    return ReadiumError(
      code: code,
      message: message,
      capability: capability,
      format: currentPublicationInfo?.format,
      details: details
    )
  }

  private func emitError(code: String, message: String, capability: String? = nil, details: String? = nil) {
    onError?(makeError(code: code, message: message, capability: capability, details: details))
  }

  private func emitUnsupported(_ capability: String, message: String) {
    onUnsupportedCapability?(
      UnsupportedCapabilityEvent(
        capability: capability,
        format: currentPublicationInfo?.format,
        message: message
      )
    )
  }

  private func emitMediaUnsupported(_ capability: String = "mediaPlayback") {
    let error = makeError(
      code: "UNSUPPORTED_CAPABILITY",
      message: "Media playback is not available for this publication",
      capability: capability
    )
    onMediaError?(error)
    emitUnsupported(capability, message: error.message)
  }

  // MARK: - View lifecycle

  private func addViewControllerAsSubview(_ vc: ReaderViewController) {
    vc.publisher.sink(receiveValue: { [weak self] locator in
      guard let self = self else { return }
      let nitroLocator = readiumLocatorToNitro(locator)
      self.currentLocation = nitroLocator
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

      let positionsResult = await vc.publication.positions()

      let readiumPositions: [RLocator]
      switch positionsResult {
      case .success(let pos):
        readiumPositions = pos
      case .failure:
        readiumPositions = []
      }

      let info = await readiumPublicationInfo(vc.publication, positions: readiumPositions)
      self.currentPublicationInfo = info

      let event = PublicationReadyEvent(
        tableOfContents: info.tableOfContents,
        positions: info.positions,
        metadata: info.metadata,
        format: info.format,
        capabilities: info.capabilities,
        readingOrder: info.readingOrder,
        resources: info.resources
      )

      self.onPublicationReady?(event)
      self.onReady?(info)
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

  func getPublication() -> Promise<PublicationInfo> {
    guard let info = currentPublicationInfo else {
      return Promise.rejected(withError: makeNSError("Publication is not ready"))
    }
    return Promise.resolved(withResult: info)
  }

  func getCurrentLocation() -> Promise<Locator> {
    guard let location = currentLocation else {
      return Promise.rejected(withError: makeNSError("Current location is not available"))
    }
    return Promise.resolved(withResult: location)
  }

  func getCurrentSelection() -> Promise<SelectionEvent> {
    if let navigator = readerViewController?.navigator as? SelectableNavigator,
       let selection = navigator.currentSelection {
      currentSelection = SelectionEvent(
        locator: readiumLocatorToNitro(selection.locator),
        selectedText: selection.locator.text.highlight
      )
    }
    return Promise.resolved(withResult: currentSelection)
  }

  func clearSelection() {
    (readerViewController?.navigator as? SelectableNavigator)?.clearSelection()
    currentSelection = SelectionEvent(locator: nil, selectedText: nil)
    onSelectionChange?(currentSelection)
  }

  func setSelection(locator: Locator) -> Promise<Bool> {
    return Promise.async { [weak self] in
      guard let self else { return false }
      guard let navigator = await self.readerViewController?.navigator as? EPUBNavigatorViewController else {
        return false
      }
      guard let readiumLocator = nitroLocatorToReadium(locator) else {
        return false
      }

      // 1. Navigate to the locator first.
      _ = await navigator.go(to: readiumLocator, options: .animated)

      // Give the spread a brief moment to fully load before evaluating.
      try? await Task.sleep(nanoseconds: 250_000_000)

      // 2. Build the JS selection script using the locator's text context.
      let highlight = readiumLocator.text.highlight ?? ""
      let before = readiumLocator.text.before ?? ""
      let after = readiumLocator.text.after ?? ""

      guard !highlight.isEmpty else { return false }

      let highlightJS = Self.jsString(highlight)
      let beforeJS = Self.jsString(before)
      let afterJS = Self.jsString(after)

      let script = """
      (function(highlight, before, after) {
        try {
          var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
          var nodes = [];
          var combined = "";
          var node;
          while ((node = walker.nextNode())) {
            nodes.push({ node: node, start: combined.length });
            combined += node.nodeValue;
          }

          var needle = before + highlight + after;
          var pos = -1;
          if (needle.length > 0) {
            pos = combined.indexOf(needle);
            if (pos >= 0) pos += before.length;
          }
          if (pos < 0) {
            pos = combined.indexOf(highlight);
          }
          if (pos < 0) return 'not-found';

          var startPos = pos;
          var endPos = pos + highlight.length;

          var startNode = null, startOffset = 0;
          var endNode = null, endOffset = 0;
          for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];
            var len = n.node.nodeValue.length;
            if (!startNode && startPos >= n.start && startPos < n.start + len) {
              startNode = n.node;
              startOffset = startPos - n.start;
            }
            if (endPos > n.start && endPos <= n.start + len) {
              endNode = n.node;
              endOffset = endPos - n.start;
              break;
            }
          }
          if (!startNode || !endNode) return 'no-node';

          var range = document.createRange();
          range.setStart(startNode, startOffset);
          range.setEnd(endNode, endOffset);

          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);

          // Scroll the match into view if it's off-screen.
          try {
            var rect = range.getBoundingClientRect();
            if (rect.top < 0 || rect.bottom > window.innerHeight) {
              (startNode.parentElement || document.body).scrollIntoView({ block: 'center' });
            }
          } catch (e) {}

          return 'ok';
        } catch (e) {
          return 'error: ' + (e && e.message ? e.message : String(e));
        }
      })(\(highlightJS), \(beforeJS), \(afterJS));
      """

      let result = await navigator.evaluateJavaScript(script)
      switch result {
      case .success(let value):
        return (value as? String) == "ok"
      case .failure:
        return false
      }
    }
  }

  /// Escapes a string for safe embedding inside a JS source literal.
  private static func jsString(_ s: String) -> String {
    if let data = try? JSONSerialization.data(withJSONObject: [s], options: []),
       let json = String(data: data, encoding: .utf8) {
      // json is `["..."]` — strip the brackets.
      let trimmed = json.dropFirst().dropLast()
      return String(trimmed)
    }
    return "\"\""
  }

  func search(query: String, options: SearchOptions?) -> Promise<[SearchResult]> {
    guard let publication = readerViewController?.publication else {
      return Promise.rejected(withError: makeNSError("Publication is not ready"))
    }

    searchTask?.cancel()

    return Promise.async { [weak self] in
      guard let self else { return [] }

      let readiumOptions = ReadiumShared.SearchOptions(
        caseSensitive: options?.caseSensitive,
        diacriticSensitive: options?.diacriticSensitive,
        wholeWord: options?.wholeWord,
        exact: options?.exact,
        language: options?.language.map { Language(code: .bcp47($0)) },
        regularExpression: options?.regularExpression
      )

      let iteratorResult = await publication.search(query: query, options: readiumOptions)
      let iterator: SearchIterator
      switch iteratorResult {
      case .success(let value):
        iterator = value
      case .failure(let error):
        await MainActor.run {
          self.emitError(code: "SEARCH_FAILED", message: "\(error)", capability: "search")
        }
        throw makeNSError("Search failed: \(error)")
      }

      var results: [SearchResult] = []
      let limit = Int(options?.limit ?? 100)

      while !Task.isCancelled && results.count < limit {
        let next = await iterator.next()
        switch next {
        case .success(let collection):
          guard let collection else {
            await MainActor.run {
              self.onSearchProgress?(
                SearchProgressEvent(query: query, resultCount: Double(results.count), isComplete: true)
              )
            }
            return results
          }

          for locator in collection.locators {
            let nitroLocator = readiumLocatorToNitro(locator)
            results.append(
              SearchResult(
                locator: nitroLocator,
                title: nitroLocator.title,
                snippet: nitroLocator.text?.highlight,
                index: Double(results.count)
              )
            )
            if results.count >= limit { break }
          }

          await MainActor.run {
            self.onSearchProgress?(
              SearchProgressEvent(query: query, resultCount: Double(results.count), isComplete: false)
            )
          }

        case .failure(let error):
          await MainActor.run {
            self.emitError(code: "SEARCH_FAILED", message: "\(error)", capability: "search")
          }
          throw makeNSError("Search failed: \(error)")
        }
      }

      return results
    }
  }

  func cancelSearch() {
    searchTask?.cancel()
    searchTask = nil
    onSearchProgress?(SearchProgressEvent(query: "", resultCount: nil, isComplete: true))
  }

  func getResource(href: String) -> Promise<ResourceResponse> {
    guard let publication = readerViewController?.publication else {
      return Promise.rejected(withError: makeNSError("Publication is not ready"))
    }

    return Promise.async {
      guard let resource = publication.get(ReadiumShared.Link(href: href)) else {
        throw makeNSError("Resource not found: \(href)")
      }

      let dataResult = await resource.read()
      let data: Data
      switch dataResult {
      case .success(let value):
        data = value
      case .failure(let error):
        throw makeNSError("Resource read failed: \(error)")
      }

      let propsResult = await resource.properties()
      let mediaType: String?
      switch propsResult {
      case .success(let props):
        mediaType = props.mediaType?.string
      case .failure:
        mediaType = (publication.readingOrder + publication.resources + publication.links)
          .first { $0.href == href }?
          .mediaType?
          .string
      }

      return ResourceResponse(
        href: href,
        mediaType: mediaType,
        length: Double(data.count),
        base64: data.base64EncodedString()
      )
    }
  }

  func getPositions() -> Promise<[Locator]> {
    if let info = currentPublicationInfo {
      return Promise.resolved(withResult: info.positions)
    }

    guard let publication = readerViewController?.publication else {
      return Promise.resolved(withResult: [])
    }

    return Promise.async {
      switch await publication.positions() {
      case .success(let positions):
        return positions.map { readiumLocatorToNitro($0) }
      case .failure:
        return []
      }
    }
  }

  func getTableOfContents() -> Promise<[Link]> {
    if let info = currentPublicationInfo {
      return Promise.resolved(withResult: info.tableOfContents)
    }

    guard let publication = readerViewController?.publication else {
      return Promise.resolved(withResult: [])
    }

    return Promise.async {
      switch await publication.tableOfContents() {
      case .success(let links):
        return flattenReadiumLinks(links)
      case .failure:
        return []
      }
    }
  }

  func applyPreferences(preferences: Preferences) {
    self.preferences = preferences
    updatePreferences()
  }

  func setPdfPreferences(preferences: PdfPreferences) {
    emitUnsupported("pdfPreferences", message: "PDF preferences are not implemented yet")
  }

  func setComicPreferences(preferences: ComicPreferences) {
    emitUnsupported("comicPreferences", message: "Comic preferences are not implemented yet")
  }

  func setAudioPreferences(preferences: AudioPreferences) {
    guard let nav = audioNavigator else {
      emitMediaUnsupported()
      return
    }
    let prefs = ReadiumNavigator.AudioPreferences(
      speed: preferences.speed.map { Double($0) }
    )
    nav.submitPreferences(prefs)
    if let rate = preferences.speed {
      updateMediaPlaybackRate(Double(rate))
    }
  }

  func play() {
    guard let nav = audioNavigator else { emitMediaUnsupported(); return }
    nav.play()
    Task { @MainActor in refreshMediaState() }
  }

  func pause() {
    guard let nav = audioNavigator else { emitMediaUnsupported(); return }
    nav.pause()
    Task { @MainActor in refreshMediaState() }
  }

  func stop() {
    guard let nav = audioNavigator else { emitMediaUnsupported(); return }
    nav.pause()
    Task { @MainActor in
      await nav.seek(to: 0)
      refreshMediaState()
    }
  }

  func seekTo(position: Double) {
    guard let nav = audioNavigator else { emitMediaUnsupported(); return }
    Task { @MainActor in
      await nav.seek(to: position)
      refreshMediaState()
    }
  }

  func skipToNext() {
    guard let nav = audioNavigator else { emitMediaUnsupported(); return }
    Task { @MainActor in
      _ = await nav.goForward(options: .init(animated: false))
      refreshMediaState()
    }
  }

  func skipToPrevious() {
    guard let nav = audioNavigator else { emitMediaUnsupported(); return }
    Task { @MainActor in
      _ = await nav.goBackward(options: .init(animated: false))
      refreshMediaState()
    }
  }

  func setPlaybackRate(rate: Double) {
    guard let nav = audioNavigator else {
      // Still keep the requested rate in state so JS can read it back.
      updateMediaPlaybackRate(rate)
      emitMediaUnsupported()
      return
    }
    nav.submitPreferences(ReadiumNavigator.AudioPreferences(speed: rate))
    updateMediaPlaybackRate(rate)
  }

  func getMediaState() -> Promise<MediaState> {
    if audioNavigator != nil {
      Task { @MainActor in refreshMediaState() }
    }
    return Promise.resolved(withResult: currentMediaState)
  }

  // MARK: - Audio helpers

  private var audioNavigator: AudioNavigator? {
    return (readerViewController as? AudioReaderViewController)?.audioNavigator
  }

  /// Pulls the current playback info from the audio navigator and pushes a
  /// MediaState to JS via `onMediaStateChange`.
  @MainActor
  private func refreshMediaState() {
    guard let nav = audioNavigator else { return }
    let info = nav.playbackInfo
    let state: String
    switch info.state {
    case .playing: state = "playing"
    case .paused: state = "paused"
    case .loading: state = "loading"
    @unknown default: state = "paused"
    }
    let resource = nav.publication.readingOrder.indices.contains(info.resourceIndex)
      ? nav.publication.readingOrder[info.resourceIndex]
      : nil
    let track: MediaTrack? = resource.map { link in
      MediaTrack(
        index: Double(info.resourceIndex),
        href: link.href,
        title: link.title,
        duration: link.duration,
        mediaType: link.mediaType?.string
      )
    }
    currentMediaState = MediaState(
      state: state,
      resourceIndex: Double(info.resourceIndex),
      position: info.time,
      duration: info.duration,
      totalDuration: nav.totalDuration,
      playbackRate: currentMediaState.playbackRate,
      track: track
    )
    onMediaStateChange?(currentMediaState)
  }

  private func updateMediaPlaybackRate(_ rate: Double) {
    currentMediaState = MediaState(
      state: currentMediaState.state,
      resourceIndex: currentMediaState.resourceIndex,
      position: currentMediaState.position,
      duration: currentMediaState.duration,
      totalDuration: currentMediaState.totalDuration,
      playbackRate: rate,
      track: currentMediaState.track
    )
    onMediaStateChange?(currentMediaState)
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

  // Cleanup
  func cleanup() {
    guard let vc = readerViewController else { return }
    readerViewController = nil
    searchTask?.cancel()
    searchTask = nil
    currentPublicationInfo = nil
    currentLocation = nil
    currentSelection = SelectionEvent(locator: nil, selectedText: nil)

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
