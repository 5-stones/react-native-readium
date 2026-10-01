# react-native-readium

A monorepo for React Native bindings to the [Readium](https://readium.org/) toolkits.

| Package | Description |
| --- | --- |
| [`react-native-readium`](./packages/react-native-readium) | The reader: EPUB and PDF on iOS, Android and web. |

## Example apps

| App | Description |
| --- | --- |
| [`apps/example-native`](./apps/example-native) | iOS and Android example. |
| [`apps/example-nextjs`](./apps/example-nextjs) | Web example. |
| [`apps/common-app`](./apps/common-app) | UI shared by both examples. |

## Development

```sh
yarn                # install all workspaces
yarn typescript     # type-check every package
yarn test           # run every package's tests
yarn lint
yarn nitrogen       # regenerate Nitro bindings after editing a *.nitro.ts spec
yarn example ios    # or: yarn example android
```

Each package is released on its own from its directory with `yarn release`.
