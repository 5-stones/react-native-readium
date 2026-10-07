---
title: Supported formats
---

# Supported formats

| Format | Support | Notes                                                            |
| ------ | ------- | ---------------------------------------------------------------- |
| EPUB 2 | ✅      |                                                                  |
| EPUB 3 | ✅      | Reflowable and fixed layout.                                     |
| PDF    | ✅      | Zoom through the [ref methods](./guides/navigation.md#zoom-pdf). |
| CBZ    | ❌      | On the roadmap.                                                  |

Missing a format you need? [Open an issue](https://github.com/5-stones/react-native-readium/issues).

## DRM

| Scheme                                             | Support                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| [Readium LCP](https://www.edrlab.org/readium-lcp/) | iOS and Android, with [`react-native-readium-lcp`](/lcp).                |
| Others                                             | Through a native [content protection](./advanced/content-protection.md). |
