## [4.0.1](https://github.com/5-stones/react-native-readium/compare/v4.0.0...v4.0.1) (2025-09-12)


### Bug Fixes

* **android:** ensure we don't reset preferences on updates ([#91](https://github.com/5-stones/react-native-readium/issues/91)) ([ce96f13](https://github.com/5-stones/react-native-readium/commit/ce96f1388987ceda90e7ef9251705d6787b51b3b))



# [4.0.0](https://github.com/5-stones/react-native-readium/compare/v3.0.2...v4.0.0) (2025-09-08)


### Bug Fixes

* **android, ios:** Improve detection of Links when changing navigator location ([#82](https://github.com/5-stones/react-native-readium/issues/82)) ([9bc2e4a](https://github.com/5-stones/react-native-readium/commit/9bc2e4acc59af0c915fbddaad3375daa3f0b017d))
* **ios:** add guards to superview and viewControllers to avoid crash ([#90](https://github.com/5-stones/react-native-readium/issues/90)) ([a85a065](https://github.com/5-stones/react-native-readium/commit/a85a065dc8956c5a03f59f2be379e6ee7f1e02ae))


### Features

* **ios, android, web:** Move from deprecated UserSettings API to the new Preferences API ([#80](https://github.com/5-stones/react-native-readium/issues/80)) ([784f7fe](https://github.com/5-stones/react-native-readium/commit/784f7fe072f12bfdc8ff8e8c2ea1109e007619a0)), closes [#79](https://github.com/5-stones/react-native-readium/issues/79)


### BREAKING CHANGES

* **ios, android, web:** This update moves the library to the newer Preferences API for managing the reader font size, theme, etc.



## [3.0.2](https://github.com/5-stones/react-native-readium/compare/v3.0.1...v3.0.2) (2025-05-20)



## [3.0.1](https://github.com/5-stones/react-native-readium/compare/v3.0.0...v3.0.1) (2025-03-05)


### Bug Fixes

* **android:** fix android build errors in newer versions of react-native ([487febb](https://github.com/5-stones/react-native-readium/commit/487febbb7ef7e16fc39db3594bbef10a61f28b07))



# [3.0.0](https://github.com/5-stones/react-native-readium/compare/v2.0.2...v3.0.0) (2025-02-11)


### Bug Fixes

* **android:** remove tap toggles ui visibility ([81ca01a](https://github.com/5-stones/react-native-readium/commit/81ca01a4f38e2fb451023ce4aae31985f3613eb1))


### BREAKING CHANGES

* **android:** Tapping will no longer toggle the system ui visibility.



## [2.0.2](https://github.com/5-stones/react-native-readium/compare/v2.0.1...v2.0.2) (2024-10-08)


### Bug Fixes

* **web:** Handle location not defined in reading order ([080b4a9](https://github.com/5-stones/react-native-readium/commit/080b4a911bea77ae174face2cf24b90ae0d58b32))



## [2.0.1](https://github.com/5-stones/react-native-readium/compare/v2.0.0...v2.0.1) (2024-10-03)


### Bug Fixes

* **web:** estimate the totalProgression if it is not provided ([3d849dc](https://github.com/5-stones/react-native-readium/commit/3d849dc01cb23298acdfbfecead84c084bd4b1b2))



# [2.0.0](https://github.com/5-stones/react-native-readium/compare/v2.0.0-rc.2...v2.0.0) (2024-09-10)


### Bug Fixes

* **web:** update reader when file url changes ([21eda29](https://github.com/5-stones/react-native-readium/commit/21eda2950ba01469220549387bbfc9f74b2e9047))



# [2.0.0-rc.2](https://github.com/5-stones/react-native-readium/compare/v2.0.0-rc.1...v2.0.0-rc.2) (2024-07-29)


### Bug Fixes

* **android:** don't set the brightness of the activity. instead rely on device/app settings ([8af916b](https://github.com/5-stones/react-native-readium/commit/8af916b86a3c42a9abc02a63aa239fa6e8c4e8a5))
* **readiumview:** fix an issue when no forwardRef is passed on Android ([bbc1967](https://github.com/5-stones/react-native-readium/commit/bbc1967d0278db6ba1af4948f5afd67d2a4d12b5))
* **ReadiumView:** fix react warning regarding forwardRefs ([45792e6](https://github.com/5-stones/react-native-readium/commit/45792e6f92e9526282c1fc2e6d5f8f57e199ecd7))



# [2.0.0-rc.0](https://github.com/5-stones/react-native-readium/compare/v1.2.1...v2.0.0-rc.0) (2024-07-26)


### Features

* **android, example:** upgrade react-native support to 0.74.3 and android to kotlin-toolkit@2.4.1 ([1479382](https://github.com/5-stones/react-native-readium/commit/1479382214d1acd59d7f76690d933459c745c5c7))



## [1.2.1](https://github.com/5-stones/react-native-readium/compare/v1.2.0...v1.2.1) (2023-05-10)


### Bug Fixes

* **web:** restructure reader imports in order to fix SSR ([37a2e6a](https://github.com/5-stones/react-native-readium/commit/37a2e6ae8380b902f8e2b38b46e027b1965bfde6))



# [1.2.0](https://github.com/5-stones/react-native-readium/compare/v1.1.0...v1.2.0) (2022-12-14)


### Features

* **web:** remove next and previous buttons in favor of a ref api ([0e03366](https://github.com/5-stones/react-native-readium/commit/0e033667eef2abf06dfb949ef831b68f9dc51d2c))



# [1.1.0](https://github.com/5-stones/react-native-readium/compare/v1.0.4...v1.1.0) (2022-12-10)


### Features

* **web:** add basic web implementation and example ([d55a457](https://github.com/5-stones/react-native-readium/commit/d55a457b71213de4536294709788b50b74076622))



## [1.0.4](https://github.com/5-stones/react-native-readium/compare/v1.0.3...v1.0.4) (2022-12-06)


### Bug Fixes

* **android:** fix an issue resulting in initial android settings not being applied correctly ([9f48874](https://github.com/5-stones/react-native-readium/commit/9f488746759f51effdbf62b3da1ffe036369bffd))



## [1.0.3](https://github.com/5-stones/react-native-readium/compare/v1.0.2...v1.0.3) (2022-12-05)


### Bug Fixes

* **android, ios:** allow location and initialLocation to be either Link or Locator objects ([ebc1030](https://github.com/5-stones/react-native-readium/commit/ebc103075d305bcdf8db263d7455d5b07536288b))



## [1.0.2](https://github.com/5-stones/react-native-readium/compare/v1.0.1...v1.0.2) (2022-12-01)


### Bug Fixes

* **android:** fix android release builds by adding networking security config ([f9b0ff8](https://github.com/5-stones/react-native-readium/commit/f9b0ff80676f9e673352546857faab2163e8a1bb))



## [1.0.1](https://github.com/5-stones/react-native-readium/compare/v1.0.0...v1.0.1) (2022-12-01)


### Bug Fixes

* **android:** update readium dependencies to deal with removed nanohttpd dependency ([764f6eb](https://github.com/5-stones/react-native-readium/commit/764f6ebc1de0ddd509b7ca89dd736eace4348d3d))



# [1.0.0](https://github.com/5-stones/react-native-readium/compare/v1.0.0-alpha.10...v1.0.0) (2022-08-22)



# [1.0.0-alpha.10](https://github.com/5-stones/react-native-readium/compare/v1.0.0-alpha.9...v1.0.0-alpha.10) (2022-04-05)


### Bug Fixes

* **android, ios:** fix an issue with background color not staying in sync with appearance setting ([fca2f8e](https://github.com/5-stones/react-native-readium/commit/fca2f8e20e3ed0b5558caf1b3f2abd5f4f8bb3d5))



# [1.0.0-alpha.9](https://github.com/5-stones/react-native-readium/compare/v1.0.0-alpha.8...v1.0.0-alpha.9) (2022-04-01)


### Bug Fixes

* **locator:** update the Locator interface to represent the minimum data required ([61c8be1](https://github.com/5-stones/react-native-readium/commit/61c8be1073e92a9c408ecde995e764502f2a5538))


### Features

* **android, ios, example:** add the ability to register to receive the table of contents ([94ef6ae](https://github.com/5-stones/react-native-readium/commit/94ef6ae790efe53cce8b3b945bfc4f0bd712e178))



# [1.0.0-alpha.8](https://github.com/5-stones/react-native-readium/compare/v1.0.0-alpha.7...v1.0.0-alpha.8) (2022-03-31)


### Bug Fixes

* **android:** fix an issue with android crashing due to a "no view found for id" exception ([5440662](https://github.com/5-stones/react-native-readium/commit/54406625dfbca5c1dcfa23030df8325d53d2ddbb))



# [1.0.0-alpha.7](https://github.com/5-stones/react-native-readium/compare/v1.0.0-alpha.6...v1.0.0-alpha.7) (2022-03-31)


### Bug Fixes

* **android:** fix a race-condition with the settings prop causing crashes ([11ebde3](https://github.com/5-stones/react-native-readium/commit/11ebde35184622ff045a41e8f971b46a389c0dc0))



# [1.0.0-alpha.6](https://github.com/5-stones/react-native-readium/compare/v1.0.0-alpha.5...v1.0.0-alpha.6) (2022-03-29)


### Features

* **android:** strip the 'file://' prefix from the path if it's passed ([1171f1e](https://github.com/5-stones/react-native-readium/commit/1171f1e2ec553f51c7be1aa1b3973433f3bd6939))



# [1.0.0-alpha.5](https://github.com/5-stones/react-native-readium/compare/v1.0.0-alpha.4...v1.0.0-alpha.5) (2022-03-28)


### Bug Fixes

* **android:** remove unused exoplayer deps to prevent conflicts with other projects ([96086b4](https://github.com/5-stones/react-native-readium/commit/96086b4cf0305b9799b6c632c4c6e57422375479))



# [1.0.0-alpha.4](https://github.com/5-stones/react-native-readium/compare/v1.0.0-alpha.3...v1.0.0-alpha.4) (2022-03-24)


### Bug Fixes

* **ios:** fix an issue causing crash when used in conjunction with react-native-screens ([d250bf8](https://github.com/5-stones/react-native-readium/commit/d250bf8294e133a7fd29d3eb92e68f9682f46f63))



# [1.0.0-alpha.3](https://github.com/5-stones/react-native-readium/compare/v1.0.0-alpha.2...v1.0.0-alpha.3) (2022-03-24)


### Bug Fixes

* **ios:** add ios.deployment_target of 13.0 ([ca1b199](https://github.com/5-stones/react-native-readium/commit/ca1b199bae3dea3347aed26135f1e1de61c61fff))



# [1.0.0-alpha.2](https://github.com/5-stones/react-native-readium/compare/v1.0.0-alpha.1...v1.0.0-alpha.2) (2022-03-24)


### Bug Fixes

* **podspec:** specify swift version in podspec ([cc7d7cd](https://github.com/5-stones/react-native-readium/commit/cc7d7cd8ae7fc65623b06825f0431b7b79612ec1))


### Features

* **ios, android:** remove unused dependencies and code ([1d35cdd](https://github.com/5-stones/react-native-readium/commit/1d35cdd6ba9bfda33f72381bb880cb4a401e4154))



# [1.0.0-alpha.1](https://github.com/5-stones/react-native-readium/compare/v1.0.0-alpha.0...v1.0.0-alpha.1) (2022-03-23)


### Bug Fixes

* **ios:** fix view sizing on iOS ([5e6e451](https://github.com/5-stones/react-native-readium/commit/5e6e451e6c4c75dcf35a11a1b348f8911660247f))


### Features

* **android:** implement a basic ebook reader view for android ([63e3d70](https://github.com/5-stones/react-native-readium/commit/63e3d70016675bbf3b2d2dea1acb47c32824dc7c))
* **example:** react-native upgrade ([74997a2](https://github.com/5-stones/react-native-readium/commit/74997a20d0821dbd80493d5051a45e1ba9cec9b1))



# [1.0.0-alpha.0](https://github.com/5-stones/react-native-readium/compare/47d18e28b8ee9a7e6cb83eb93837fbe6169d9180...v1.0.0-alpha.0) (2022-03-11)


### Features

* **src, ios:** Basic functional implementation of epub reader for iOS ([47d18e2](https://github.com/5-stones/react-native-readium/commit/47d18e28b8ee9a7e6cb83eb93837fbe6169d9180))



