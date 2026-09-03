import type {
  Capabilities,
  PublicationReadyEvent as SpecPublicationReadyEvent,
} from '../specs/ReadiumView.nitro';
import type { PublicationMetadata } from './PublicationMetadata';
import type { Link } from './Link';

export interface PublicationReadyEvent
  extends Omit<SpecPublicationReadyEvent, 'tableOfContents' | 'metadata'> {
  metadata: PublicationMetadata;
  tableOfContents: Link[];
  capabilities: Capabilities;
}
