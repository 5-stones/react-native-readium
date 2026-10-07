---
slug: /
title: Introduction
sidebar_label: Introduction
---

# React Native Readium

An ebook reader for React Native, built on the [Readium](https://readium.org/) toolkits, on iOS,
Android and web.

- Render EPUB 2, EPUB 3 and PDF publications in a `ReadiumView`.
- Track the reading position, and jump to any location, chapter or bookmark.
- Read the table of contents, positions and metadata.
- Control the reader: themes (light, dark, sepia), font size, margins and more.
- Highlights and notes, with custom text-selection actions.
- Full-text search.
- DRM: [Readium LCP](/lcp) through a companion package.

| Dark mode                             | Light mode                              |
| ------------------------------------- | --------------------------------------- |
| ![Dark mode](/img/demo-dark-mode.gif) | ![Light mode](/img/demo-light-mode.gif) |

## Packages

| Package                                                                              | What it does                                                                                                          |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| [`react-native-readium`](https://www.npmjs.com/package/react-native-readium)         | The reader: EPUB and PDF on iOS, Android and web.                                                                     |
| [`react-native-readium-lcp`](https://www.npmjs.com/package/react-native-readium-lcp) | [Readium LCP](https://www.edrlab.org/readium-lcp/) DRM for iOS and Android, as a companion to `react-native-readium`. |

## Where to start

- [Installation](./getting-started/installation.md), then the [quick start](./getting-started/quick-start.md).
- Upgrading from v4? See [Migrating to v5](./migration/v5.md).
- Reading DRM-protected books? See [Readium LCP](/lcp).
- The [example apps](https://github.com/5-stones/react-native-readium/tree/main/apps) show every
  feature in a working app.
