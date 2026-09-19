import { EpubPreferencesEditor } from '@readium/navigator';
import { EpubNavigator, EpubPreferences } from '@readium/navigator';

import { PdfNavigator } from '../classes';
import { Preferences, Capabilities } from '../../src/interfaces';
/**
 * Evaluates what the web EPUB reader can do with the publication it opened.
 */
const epubCapabilities = (
  navigator: EpubNavigator,
  preferences?: Preferences
): Capabilities => {
  const current = (preferences ?? {}) as unknown as EpubPreferences;
  const editor = new EpubPreferencesEditor(
    current,
    navigator.settings,
    navigator.publication.metadata
  );

  return {
    // EPUB Preferences
    // Values mareked false are present in other toolkits, but are not present in the ts-toolkit
    backgroundColor: editor.backgroundColor.isEffective,
    columnCount: editor.columnCount.isEffective,
    fontFamily: editor.fontFamily.isEffective,
    fontSize: editor.fontSize.isEffective,
    fontWeight: editor.fontWeight.isEffective,
    hyphens: editor.hyphens.isEffective,
    imageFilter: false,
    language: false,
    letterSpacing: editor.letterSpacing.isEffective,
    ligatures: editor.ligatures.isEffective,
    lineHeight: editor.lineHeight.isEffective,
    pageMargins: editor.pageGutter.isEffective,
    paragraphIndent: editor.paragraphIndent.isEffective,
    paragraphSpacing: editor.paragraphSpacing.isEffective,
    publisherStyles: false,
    readingProgression: false,
    scroll: editor.scroll.isEffective,
    spread: false,
    textAlign: editor.textAlign.isEffective,
    textColor: editor.textColor.isEffective,
    textNormalization: editor.textNormalization.isEffective,
    theme: editor.backgroundColor.isEffective,
    typeScale: false,
    verticalText: false,
    wordSpacing: editor.wordSpacing.isEffective,

    // PDF Preferences
    fit: false,
    offsetFirstPage: false,
    pageSpacing: false,
    scrollAxis: false,
    visibleScrollbar: false,

    // Web / Fixed Features
    zoom: false,
    search: false,
    decorations: true,
    selection: true,
  };
};

/**
 * Evaluates capabilities for the web PDF reader.
 * The web PDF reader uses ref-driven zoom methods rather than preference editors.
 */
export const pdfCapabilities = (preferences?: Preferences): Capabilities => {
  const current = (preferences ?? {}) as unknown as Preferences;
  return {
    backgroundColor: false,
    columnCount: false,
    fontFamily: false,
    fontSize: false,
    fontWeight: false,
    hyphens: false,
    imageFilter: false,
    language: false,
    letterSpacing: false,
    ligatures: false,
    lineHeight: false,
    pageMargins: false,
    paragraphIndent: false,
    paragraphSpacing: false,
    publisherStyles: false,
    readingProgression: false,
    // TODO: it would be nice to have scroll vs facing pages for PDFs
    scroll: false,
    spread: false,
    textAlign: false,
    textColor: false,
    textNormalization: false,
    theme: false,
    typeScale: false,
    verticalText: false,
    wordSpacing: false,

    fit: true,
    offsetFirstPage: false,
    pageSpacing: false,
    scrollAxis: false,
    visibleScrollbar: false,

    zoom: true, // Driven via Web PDF Ref methods
    search: false,
    decorations: false,
    selection: false,
  };
};

export const assessCapabilities = (
  navigator: EpubNavigator | PdfNavigator,
  preferences: Preferences
): Capabilities => {
  if (navigator instanceof PdfNavigator) {
    return pdfCapabilities(preferences);
  }
  return epubCapabilities(navigator, preferences);
};
