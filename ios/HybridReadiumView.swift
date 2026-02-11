import Combine
import Foundation
import NitroModules
import ReadiumShared
import ReadiumStreamer
import UIKit
import ReadiumNavigator

// Nitro-generated types shadow Readium SDK types of the same name.
// Use these aliases when referring to the Readium SDK types explicitly.
typealias RDecoration = ReadiumNavigator.Decoration
typealias RLocator = ReadiumShared.Locator
typealias RLink = ReadiumShared.Link

class HybridReadiumView: HybridReadiumViewSpec {

  // MARK: - HybridReadiumViewSpec conformance

  var view: UIView { hostView }

  var file: ReadiumFile = ReadiumFile(url: "", initialLocation: nil) {
    didSet {
      pendingFileUrl = file.url
      pendingInitialLocation = file.initialLocation
      tryLoadBook()
    }
  }

  var location: Locator? = nil {
    didSet {
      updateLocation()
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

  var onLocationChange: (Locator) -> Void = { _ in }
  var onPublicationReady: (PublicationReadyEvent) -> Void = { _ in }
  var onDecorationActivated: (DecorationActivatedEvent) -> Void = { _ in }
  var onSelectionChange: (SelectionEvent) -> Void = { _ in }
  var onSelectionAction: (SelectionActionEvent) -> Void = { _ in }

  // MARK: - Private state

  private let hostView = UIView()
  private var readerService = ReaderService()
  private var readerViewController: ReaderViewController?
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

  // MARK: - Location

  private func updateLocation() {
    Task { @MainActor [weak self] in
      guard let self = self else { return }
      guard let navigator = self.readerViewController?.navigator else { return }
      guard let loc = self.location else { return }
      guard let locator = self.nitroLocatorToReadium(loc) else { return }

      let currentLocation = navigator.currentLocation
      if let currentLocation, locator.hashValue == currentLocation.hashValue {
        return
      }

      _ = await navigator.go(to: locator, options: .animated)
    }
  }

  // MARK: - Preferences

  private func updatePreferences() {
    guard readerViewController != nil else { return }
    guard let navigator = readerViewController?.navigator as? EPUBNavigatorViewController else { return }
    guard let prefs = preferences else { return }

    let epubPrefs = nitroPreferencesToEPUB(prefs)
    navigator.submitPreferences(epubPrefs)
  }

  private func nitroPreferencesToEPUB(_ prefs: Preferences) -> EPUBPreferences {
    return EPUBPreferences(
      backgroundColor: prefs.backgroundColor.flatMap { ReadiumNavigator.Color(hex: $0) },
      columnCount: prefs.columnCount.flatMap { ColumnCount(rawValue: $0) },
      fontFamily: prefs.fontFamily.map { FontFamily(rawValue: $0) },
      fontSize: prefs.fontSize,
      fontWeight: prefs.fontWeight,
      hyphens: prefs.hyphens,
      imageFilter: prefs.imageFilter.flatMap { ImageFilter(rawValue: $0) },
      language: prefs.language.map { Language(code: .bcp47($0)) },
      letterSpacing: prefs.letterSpacing,
      ligatures: prefs.ligatures,
      lineHeight: prefs.lineHeight,
      pageMargins: prefs.pageMargins,
      paragraphIndent: prefs.paragraphIndent,
      paragraphSpacing: prefs.paragraphSpacing,
      publisherStyles: prefs.publisherStyles,
      readingProgression: prefs.readingProgression.flatMap { ReadiumNavigator.ReadingProgression(rawValue: $0) },
      scroll: prefs.scroll,
      spread: prefs.spread.flatMap { Spread(rawValue: $0) },
      textAlign: prefs.textAlign.flatMap { TextAlignment(rawValue: $0) },
      textColor: prefs.textColor.flatMap { ReadiumNavigator.Color(hex: $0) },
      textNormalization: prefs.textNormalization,
      theme: prefs.theme.flatMap { Theme(rawValue: $0) },
      typeScale: prefs.typeScale,
      verticalText: prefs.verticalText,
      wordSpacing: prefs.wordSpacing
    )
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

          let decorationPayload = self.readiumDecorationToNitro(event.decoration, group: event.group)

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

          self.onDecorationActivated(payload)
        }
      }
    }
  }

  // MARK: - Conversion helpers

  private func nitroLocatorToReadium(_ loc: Locator) -> RLocator? {
    let locatorData = LocatorData(
      href: loc.href,
      type: loc.type,
      title: loc.title,
      locations: loc.locations.map {
        LocationsData(progression: $0.progression, position: $0.position.map { Int($0) }, totalProgression: $0.totalProgression)
      },
      text: loc.text.map {
        TextData(before: $0.before, highlight: $0.highlight, after: $0.after)
      }
    )
    return locatorData.toLocator()
  }

  private func nitroDecorationToReadium(_ dec: Decoration) -> RDecoration? {
    guard let readiumLocator = nitroLocatorToReadium(dec.locator) else { return nil }

    let styleData = StyleData(type: dec.style.type, tint: dec.style.tint, isActive: dec.style.isActive)
    guard let readiumStyle = styleData.toDecorationStyle() else { return nil }

    var userInfo: [AnyHashable: AnyHashable] = [:]
    if let extras = dec.extras {
      for (key, value) in extras {
        userInfo[key] = value
      }
    }

    return RDecoration(
      id: dec.id,
      locator: readiumLocator,
      style: readiumStyle,
      userInfo: userInfo
    )
  }

  private func readiumDecorationToNitro(_ dec: RDecoration, group: String) -> Decoration {
    let locator = readiumLocatorToNitro(dec.locator)

    var styleType = "highlight"
    var tint: String?
    var isActive: Bool?

    if let highlightConfig = dec.style.config as? RDecoration.Style.HighlightConfig {
      styleType = "highlight"
      tint = highlightConfig.tint.map { colorToHex($0) }
      isActive = highlightConfig.isActive
    }

    let style = DecorationStyle(type: styleType, tint: tint, isActive: isActive, id: nil, html: nil, css: nil, layout: nil, width: nil)

    var extras: [String: String]?
    if !dec.userInfo.isEmpty {
      var dict: [String: String] = [:]
      for (key, value) in dec.userInfo {
        if let k = key as? String {
          dict[k] = "\(value)"
        }
      }
      extras = dict
    }

    return Decoration(id: dec.id, locator: locator, style: style, extras: extras)
  }

  private func readiumLocatorToNitro(_ loc: RLocator) -> Locator {
    let locations = LocatorLocations(
      progression: loc.locations.progression ?? 0,
      position: loc.locations.position.map { Double($0) },
      totalProgression: loc.locations.totalProgression
    )

    let text: LocatorText? = {
      let t = loc.text
      if t.after == nil && t.before == nil && t.highlight == nil { return nil }
      return LocatorText(before: t.before, highlight: t.highlight, after: t.after)
    }()

    return Locator(
      href: loc.href.string,
      type: loc.mediaType.string,
      target: nil,
      title: loc.title,
      locations: locations,
      text: text
    )
  }

  private func colorToHex(_ color: UIColor) -> String {
    var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
    color.getRed(&r, green: &g, blue: &b, alpha: &a)
    if a < 1.0 {
      return String(format: "#%02X%02X%02X%02X", Int(a * 255), Int(r * 255), Int(g * 255), Int(b * 255))
    }
    return String(format: "#%02X%02X%02X", Int(r * 255), Int(g * 255), Int(b * 255))
  }

  // MARK: - View lifecycle

  private func addViewControllerAsSubview(_ vc: ReaderViewController) {
    vc.publisher.sink(receiveValue: { [weak self] locator in
      guard let self = self else { return }
      let nitroLocator = self.readiumLocatorToNitro(locator)
      self.onLocationChange(nitroLocator)
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
        tocLinks = links.map { self.readiumLinkToNitro($0) }
      case .failure:
        tocLinks = []
      }

      var positions: [Locator] = []
      switch positionsResult {
      case .success(let pos):
        positions = pos.map { self.readiumLocatorToNitro($0) }
      case .failure:
        positions = []
      }

      let metadata = self.readiumMetadataToNitro(vc.publication.metadata)

      let event = PublicationReadyEvent(
        tableOfContents: tocLinks,
        positions: positions,
        metadata: metadata
      )

      self.onPublicationReady(event)
    }
  }

  private func readiumLinkToNitro(_ link: RLink) -> Link {
    return Link(
      href: link.href.description,
      templated: link.templated,
      type: link.mediaType?.string,
      title: link.title,
      rels: link.rels.map { "\($0)" },
      height: nil,
      width: nil,
      bitrate: nil,
      duration: nil,
      languages: link.languages
    )
  }

  private func readiumMetadataToNitro(_ meta: ReadiumShared.Metadata) -> PublicationMetadata {
    func contributors(_ list: [ReadiumShared.Contributor]) -> [margelo.nitro.readium.Contributor]? {
      guard !list.isEmpty else { return nil }
      return list.map { Contributor(name: $0.name, sortAs: $0.sortAs, identifier: $0.identifier, role: nil, position: nil) }
    }

    func subjects(_ list: [ReadiumShared.Subject]) -> [margelo.nitro.readium.Subject]? {
      guard !list.isEmpty else { return nil }
      return list.map { Subject(name: $0.name, sortAs: $0.sortAs, code: $0.code, scheme: $0.scheme) }
    }

    return PublicationMetadata(
      title: meta.title ?? "Untitled",
      sortAs: meta.sortAs,
      subtitle: meta.subtitle,
      identifier: meta.identifier,
      accessibility: nil,
      modified: meta.modified?.description,
      published: meta.published?.description,
      language: meta.languages.isEmpty ? nil : meta.languages,
      author: contributors(meta.authors),
      translator: contributors(meta.translators),
      editor: contributors(meta.editors),
      artist: contributors(meta.artists),
      illustrator: contributors(meta.illustrators),
      letterer: contributors(meta.letterers),
      penciler: contributors(meta.pencilers),
      colorist: contributors(meta.colorists),
      inker: contributors(meta.inkers),
      narrator: contributors(meta.narrators),
      contributor: contributors(meta.contributors),
      publisher: contributors(meta.publishers),
      imprint: contributors(meta.imprints),
      subject: subjects(meta.subjects),
      layout: nil,
      readingProgression: meta.readingProgression.rawValue,
      description: meta.description,
      duration: meta.duration,
      numberOfPages: meta.numberOfPages.map { Double($0) },
      belongsTo: nil
    )
  }

  // MARK: - Imperative navigation

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

  // Cleanup
  func cleanup() {
    readerViewController?.willMove(toParent: nil)
    readerViewController?.view.removeFromSuperview()
    readerViewController?.removeFromParent()

    for subscription in subscriptions {
      subscription.cancel()
    }
    subscriptions = Set<AnyCancellable>()
    activeDecorationGroups.removeAll()
    readerViewController = nil
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

    self.onSelectionAction(event)
  }
}
