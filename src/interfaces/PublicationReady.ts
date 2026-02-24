import type { PublicationReadyEvent as SpecPublicationReadyEvent } from '../specs/ReadiumView.nitro';
import type { Link } from './Link';

export interface PublicationReadyEvent
  extends Omit<SpecPublicationReadyEvent, 'tableOfContents'> {
  tableOfContents: Link[];
}
