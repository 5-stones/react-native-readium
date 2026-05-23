import type {
  PublicationCapabilities,
  PublicationReadyEvent as SpecPublicationReadyEvent,
  ReadiumError,
} from '../specs/ReadiumView.nitro';
import type { PublicationReadyEvent } from '../interfaces';
import { buildLinkTree } from './buildLinkTree';

export type PublicationFormat =
  | 'epub'
  | 'pdf'
  | 'cbz'
  | 'divina'
  | 'audiobook'
  | 'audio'
  | 'web'
  | 'unknown';

const baseCapabilities: PublicationCapabilities = {
  locations: true,
  tableOfContents: true,
  positions: true,
  preferences: true,
  decorations: false,
  selection: false,
  search: false,
  resources: true,
  mediaPlayback: false,
  mediaOverlays: false,
  tts: false,
};

export const publicationCapabilitiesFor = (
  format: PublicationFormat
): PublicationCapabilities => {
  switch (format) {
    case 'epub':
    case 'web':
      return {
        ...baseCapabilities,
        decorations: true,
        selection: true,
        search: true,
      };
    case 'pdf':
      return {
        ...baseCapabilities,
        selection: true,
        search: true,
      };
    case 'audiobook':
    case 'audio':
      return {
        ...baseCapabilities,
        mediaPlayback: true,
      };
    case 'cbz':
    case 'divina':
    case 'unknown':
      return { ...baseCapabilities };
  }
};

export const createReadiumError = ({
  code,
  message,
  capability,
  format,
}: {
  code: string;
  message: string;
  capability?: string;
  format?: string;
}): ReadiumError => ({
  code,
  message,
  capability,
  format,
});

export const createUnsupportedCapabilityError = (
  capability: string,
  format = 'unknown'
) =>
  Object.assign(
    new Error(`${capability} is not supported by the ${format} reader`),
    createReadiumError({
      code: 'UNSUPPORTED_CAPABILITY',
      message: `${capability} is not supported by the ${format} reader`,
      capability,
      format,
    })
  );

export const toLegacyPublicationReadyEvent = (
  event: SpecPublicationReadyEvent
): PublicationReadyEvent => ({
  ...event,
  tableOfContents: buildLinkTree(event.tableOfContents),
});
