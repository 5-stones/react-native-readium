---
title: Guarded sources
---

# Guarded sources

A publication you serve over the internet is rarely addressed by a URL anyone may fetch. It sits
behind an endpoint that answers only with a credential, or behind a signed URL that stops working
after a few minutes — often both, the credential buying the signature. That is true whether the
file is an EPUB, a PDF, or anything else the library opens, and whether the reader streams it or
downloads it first.

Two things follow, and they are what this guide is about:

- **The URL you can fetch is not the URL that identifies the publication.** A signed URL is a
  different string every time it is issued, so it cannot be what tells one book from another.
- **It expires while someone is reading.** A credential that was fresh when the book opened is
  refused an hour later, mid-chapter, with the reader holding a page that will not turn.

`resolveSource` answers both. You keep the stable URL as the publication's identity, and hand the
library a fetchable location whenever it needs one:

```tsx
<ReadiumView
  // The publication's identity. Never fetched while `resolveSource` is set.
  file={{ url: `https://api.example.com/publications/${id}`, initialLocation }}
  resolveSource={async ({ url }) => {
    // Your own exchange: a guarded endpoint that redirects to a signed URL.
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      cache: 'no-store',
      headers: { Authorization: `Bearer ${await getToken()}` },
    });

    if (!response.ok) throw new Error(`Couldn't resolve (${response.status})`);

    return { url: response.url };
  }}
/>
```

The library asks before it opens the publication, and again whenever a request for the
publication's bytes fails. You never have to notice an expiry, and you never have to hold a
location that might be stale.

Streaming is one of two ways to read a publication you serve; the other is to download it yourself
and open the file. [Streaming or downloading](./opening-publications.md#streaming-or-downloading)
compares them. `resolveSource` is for the streaming case — a downloaded file has no location to
expire, though the request that fetched it is still yours to authenticate.

## Identity and location

`file.url` keeps doing what it always did: it decides when a different publication has been
opened, and it keys the positions you save. It is **not** fetched while `resolveSource` is set.

So don't put the signed URL in `file.url`. If you do, every refresh looks like a different book:
saved locators stop matching, and the reader is reopened rather than kept where they were.

|                 |                                                                               |
| --------------- | ----------------------------------------------------------------------------- |
| `file.url`      | which publication this is — stable, yours to choose, never fetched            |
| `resolveSource` | where its bytes are, right now — volatile, asked for again whenever one fails |

The request tells you which publication and why:

```ts
resolveSource={async ({ url, reason }) => {
  // `url` is `file.url`. `reason` is 'open' for the first location, and
  // 'refresh' for a replacement after one stopped working.
}}
```

Resolving with an empty `url`, or rejecting, declines. An `'open'` that declines is reported as a
failure to open; a `'refresh'` that declines leaves the failure standing, reported as described
under [when it gives up](#when-it-gives-up).

## What happens when a location expires

Nothing you have to write. A request fails, the library decides the failure is worth a new
location, asks `resolveSource` for one, and retries the request against it. On iOS and Android
the open publication is re-pointed in place — no reopen, and the reading position is untouched.
On web the manifest's base URL moves and the chapter is fetched again.

The default policy is the shape a credential that expired or was refused takes: a **401** or
**403** on every platform, and on web also an `unreadable` failure, which exists because a
cross-origin error response withholds its status — the browser reports a bare network error, so
`status` is absent and `kind` is `'unreadable'`. Native always has the status.

## Deciding for yourself

Override the policy with `shouldRefreshSource` when those statuses mean something else in your
system:

```tsx
<ReadiumView
  file={file}
  resolveSource={resolveSource}
  shouldRefreshSource={async (failure) => {
    // This host answers 403 for "not permitted", which a new location
    // won't fix, and signals expiry with 440.
    if (failure.status === 403) return false;
    if (failure.status === 440) return true;

    return failure.kind === 'unreadable';
  }}
/>
```

It takes a [`SourceRequestFailure`](../api/interfaces/SourceRequestFailure.md) and is always
asynchronous. Return `false` to let the failure stand.

Worth overriding where a 403 means "you may never read this" rather than "your credential is
stale", or where expiry arrives as a 404 or a 400 — which the default would never refresh for.

On iOS and Android, leaving it unset keeps the decision native, so an ordinary expiry is handled
without crossing into JavaScript at all; setting it costs a round trip per failed request.

## Limits

A location that keeps failing is not asked about forever:

- **Two relocations** without a request succeeding in between. A request that succeeds restores
  the budget, so a location is worth replacing however often it expires — but replacing it
  repeatedly while nothing ever loads is a loop, not an expiry.
- **Ten seconds** for `shouldRefreshSource` and `resolveSource` together to answer one failure.
  Past that the failure stands. Only one failure is answered at a time, so a callback that never
  settles would otherwise hold every later one behind it.
- **A request that stalls** is given up on: fifteen seconds without data on iOS and Android,
  thirty seconds in total on web, which has no notion of a stall to measure. Without this a host
  that accepts a connection and then stops answering would leave the reader on a blank page
  indefinitely — on Android, forever. A request given up on this way is reported like any other
  read failure, below.

## When it gives up

You're told through `onPublicationError`, with `stage: 'read'` and `code: 'readFailed'`:

```tsx
<ReadiumView
  file={{ ...file, initialLocation: lastLocator }}
  key={reloadAttempt}
  resolveSource={resolveSource}
  onLocationChange={setLastLocator}
  onPublicationError={(event) => {
    if (event.stage === 'read') {
      // The publication is open and the page on screen is intact. One request
      // for its bytes was lost: offer a retry, don't tear the reader down.
      setBanner(event.message);
      return;
    }

    setFatal(event);
  }}
/>
```

A `'read'` failure is not fatal. To retry, reopen the publication by remounting the view with the
locator you last saw — which is what the `key` and `initialLocation` above are for. See
[Handling errors](./errors.md) for the whole event.

You hear about it at most once per location until a request succeeds, so a credential that
expires across thirty resources is reported once, and only where `resolveSource` is set.

## Downloading a guarded asset

Downloading is your app's job, so the credential is yours to present — the library isn't making
that request. The exchange is the same one `resolveSource` makes, which means the same function
usually serves both:

```tsx
// Reading it over the network: the library asks when it needs a location.
<ReadiumView file={{ url: identity }} resolveSource={resolveSource} />;

// Downloading it: you ask, once, and fetch what comes back.
const { url } = await resolveSource({ url: identity, reason: 'open' });
await RNFS.downloadFile({ fromUrl: url, toFile: path }).promise;
```

Afterwards point `file.url` at the path. Nothing expires on disk, so a downloaded publication
needs no `resolveSource` at all — which is also why a reader who has downloaded a book keeps
reading it when their session expires.

## Platform notes

**iOS and Android** read a publication through its own resources, so every failure is visible and
every one can be answered. Two things follow from how the toolkits read:

- An archive under **5 MB** is read once when the publication opens and cached whole, so a short
  book never gets the chance to expire mid-read.
- Above that it streams, and iOS reads ahead in **6 MB** windows. A page turn inside the window
  it already holds never touches the network, which is why an expiry can pass unnoticed for a
  while on iOS and be seen immediately on Android, whose window is 8 kB.

**Web** sees the manifest and every chapter it fetches, so those are answered. What it cannot see
are the images, stylesheets and fonts a _rendered_ chapter asks the browser for: they're fetched
from the blob the chapter was built into, where nothing can observe them. A reader parked on one
chapter past the expiry may find a lazily loaded image missing, and the next chapter turn fixes it
by rebuilding against a fresh location.
