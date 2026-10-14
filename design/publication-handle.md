# Proposal: a publication handle for v6

Today every publication concern is a prop on a mounted view. `ReadiumView` resolves the source,
answers failed reads, reports errors, and is the only way to learn a publication's metadata or
table of contents. That is fine for a reader on screen and wrong for everything else.

## The proposal

Open a publication, then render it:

```ts
const pub = await Readium.open({ url, resolveSource, shouldRefreshSource });

pub.metadata; // without rendering anything
pub.tableOfContents;
<ReadiumView publication={pub} />;
```

The handle owns the source policy; the view becomes one of its renderers. This is the shape the
Readium toolkits already have — a `Publication`, then navigators over it.

## What it fixes

- **Metadata and the table of contents need a view today.** You mount `ReadiumView`, wait for
  `onPublicationReady`, and throw the reader away if all you wanted was a title.
- **Source policy dies with the view.** Anything that outlives the screen cannot use it. Audio is
  the obvious case: both toolkits route playback through the publication's own resource layer, so
  recovery would work unchanged for a packaged audiobook — but playback continues when the screen
  is gone, and on Android it belongs to a media session service.
- **Downloading repeats the exchange by hand.** The handle could do it: `pub.download(path)` is the
  same `resolveSource` call the reader makes.
- **Remote manifests bypass recovery.** Both parsers build their container straight from the HTTP
  client (`HTTPContainer` / `HttpContainer`), so per-resource requests never reach our
  `RebasingResourceFactory`. A handle that owns the client can install
  `willStartRequest`/`recoverRequest` and cover every container. Open question: one resolved URL
  cannot sign many track URLs, so either we rewrite a path prefix (works for Bunny and CloudFront
  signed paths, not per-file signing) or `ResolveSourceRequest` grows a field naming the resource
  that failed.
- **A loading signal would have somewhere to live.** We built one on the view and withdrew it; see
  below.

## Deprecations to clear in the same release

- **`columnCount: '1' | '2'`** — replaced by `'one'` and `'two'`, both accepted
  today. The numerals exist because the preference predates the view's own
  definition carrying its vocabulary; they cannot move into it while they are
  numerals, since nitrogen names the generated Swift case `.1`, which does not
  compile (`toLowerCamelCase('_1')` returns `'1'`; the C++ identifier is escaped
  but the Swift one is not). Dropping them lets `columnCount` be a named union
  in the spec like every other preference, and lets both platforms parse it with
  an exhaustive switch instead of by hand.

## Cost

A breaking change to the whole public API, plus lifetimes we don't currently have to answer: who
closes a publication, what a reload means, what happens to a handle whose view unmounted. Worth
doing deliberately in a major, not drifting into.

## Note: the withdrawn loading event

Built and removed before release (2026-10-14), to be redesigned with user feedback. Reporting
_outstanding reads_ was the wrong proxy for _the reader has nothing to show_, and the reasons will
outlive the attempt:

- The navigator reads ahead — six spreads forward and two back by default on iOS — so reads are
  outstanding while a perfectly good page is on screen, and the event arrives after the page is
  readable.
- It cannot be filtered where the reads are: in a packaged publication every read is a byte range
  of the same archive, so the visible spread and a preloaded one are indistinguishable.
- Every platform does expose the _end_ of a load — `locationDidChange` on iOS, `onPageLoaded` on
  Android, `frameLoaded` on web — and we already consume it; it drives `onLocationChange`. None
  exposes the start on native, so a presentability signal can cover the open, an imperative
  navigation and a recovery, but not a swipe into a slow spread.
