import Foundation
import NitroModules
import ReadiumShared
import ReadiumNavigator
import UIKit

// Nitro-generated types shadow Readium SDK types of the same name.
// Use these aliases when referring to the Readium SDK types explicitly.
typealias RDecoration = ReadiumNavigator.Decoration
typealias RLocator = ReadiumShared.Locator
typealias RLink = ReadiumShared.Link

// MARK: - Nitro → Readium converters

func nitroPreferencesToEPUB(_ prefs: Preferences) -> EPUBPreferences {
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

func nitroLocatorToReadium(_ loc: Locator) -> RLocator? {
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

func nitroDecorationToReadium(_ dec: Decoration) -> RDecoration? {
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

// MARK: - Readium → Nitro converters

func readiumDecorationToNitro(_ dec: RDecoration, group: String) -> Decoration {
  let locator = readiumLocatorToNitro(dec.locator)

  var styleType = "highlight"
  var tint: String?
  var isActive: Bool?

  if let highlightConfig = dec.style.config as? RDecoration.Style.HighlightConfig {
    styleType = "highlight"
    tint = highlightConfig.tint.map { $0.cssHex }
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

func readiumLocatorToNitro(_ loc: RLocator) -> Locator {
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

func readiumLinkToNitro(_ link: RLink) -> Link {
  return Link(
    href: link.href,
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

func readiumMetadataToNitro(_ meta: ReadiumShared.Metadata) -> PublicationMetadata {
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
