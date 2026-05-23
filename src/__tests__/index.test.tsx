import type { PublicationReadyEvent } from '../specs/ReadiumView.nitro';
import {
  createReadiumError,
  createUnsupportedCapabilityError,
  publicationCapabilitiesFor,
  toLegacyPublicationReadyEvent,
} from '../utils/readerParity';

describe('reader parity helpers', () => {
  it('maps common format capabilities', () => {
    expect(publicationCapabilitiesFor('epub')).toMatchObject({
      decorations: true,
      selection: true,
      search: true,
      mediaPlayback: false,
    });

    expect(publicationCapabilitiesFor('pdf')).toMatchObject({
      decorations: false,
      selection: true,
      search: true,
      mediaPlayback: false,
    });

    expect(publicationCapabilitiesFor('audiobook')).toMatchObject({
      resources: true,
      mediaPlayback: true,
      mediaOverlays: false,
    });
  });

  it('normalizes unsupported capability errors', async () => {
    const error = createUnsupportedCapabilityError('search', 'web');

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      code: 'UNSUPPORTED_CAPABILITY',
      capability: 'search',
      format: 'web',
      message: 'search is not supported by the web reader',
    });
  });

  it('normalizes native-style readium errors', () => {
    expect(
      createReadiumError({
        code: 'OPEN_PUBLICATION_FAILED',
        message: 'Could not open publication',
        capability: 'open',
        format: 'epub',
      })
    ).toEqual({
      code: 'OPEN_PUBLICATION_FAILED',
      message: 'Could not open publication',
      capability: 'open',
      format: 'epub',
    });
  });

  it('keeps onPublicationReady backwards compatible with nested TOC', () => {
    const event: PublicationReadyEvent = {
      tableOfContents: [
        { href: 'chapter-2', title: 'Chapter 2', parentHref: 'root', position: 1 },
        { href: 'root', title: 'Root', position: 0 },
        { href: 'chapter-1', title: 'Chapter 1', parentHref: 'root', position: 0 },
      ],
      positions: [],
      metadata: { title: 'Fixture' },
      format: 'epub',
      capabilities: publicationCapabilitiesFor('epub'),
      readingOrder: [],
      resources: [],
    };

    expect(toLegacyPublicationReadyEvent(event).tableOfContents).toEqual([
      {
        href: 'root',
        title: 'Root',
        children: [
          { href: 'chapter-1', title: 'Chapter 1' },
          { href: 'chapter-2', title: 'Chapter 2' },
        ],
      },
    ]);
  });
});
