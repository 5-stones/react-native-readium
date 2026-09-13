# Bookent fork maintenance

This branch is a staged compatibility refactor, not a minimal upstream-only
replacement. Upstream baseline: `9ecb2d9` (v5.1.1). Do not force-push upstream
over this branch or hand-edit files under `nitrogen/generated`.

## Current boundary

- `ios/Reader/EPUB/BookentScripts.swift`: isolated Bookent typography, vocabulary
  matching and translation interaction scripts. These are still custom code;
  extraction reduces edits in the upstream controller, not total maintenance.
- `EPUBViewController.swift`: navigator integration, script injection and native
  event delivery. The official Decoration experiment remains opt-in.
- `ReaderViewController.swift`: retained reading interaction customizations.
- Locator/bookmark bridge: thin access to Readium APIs, generated from the spec.

The extraction preserves both JavaScript payloads byte-for-byte against backup
commit `920cbbd`. Keep the existing renderer until the official Decoration path
passes device tests for label activation, wrapping, clipping and pagination.
Moving the business scripts into the consuming app is a later boundary change,
not an accomplished result of this extraction.

## Supported Bookent workflow

Use the consuming Bookent checkout and its npm lockfile. Nitrogen and Nitro
runtime are pinned to 0.36.5 there. Run from the Bookent root:

```sh
npm run readium:generate
npm run readium:pods
npm run readium:verify
```

The inherited Yarn workspace lockfile has not been aligned to this Bookent
toolchain; standalone Yarn installation and Android builds are not certified.
Never mix an independently installed fork node_modules into the app workflow.

Local recovery checkpoint: `920cbbd`. Inspect or branch from it to compare;
do not reset a dirty worktree. Publish review branches to
`Velunce/react-native-readium`, never to `5-stones/react-native-readium`.

2026-09-13 validation: Pods refresh and the Bookent readium:verify command
completed successfully (48 focused tests, both TypeScript checks, Swift parsing,
WebKit fixture and unsigned iOS Simulator build). Seven additional vocabulary
reuse tests passed. Device QA and Android validation are still pending.
