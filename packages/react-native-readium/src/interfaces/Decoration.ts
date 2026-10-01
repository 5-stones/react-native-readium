export type {
  DecorationStyle,
  Decoration,
  DecorationGroup,
  DecorationActivatedEvent,
} from '../specs/ReadiumView.nitro';

import type { Decoration } from '../specs/ReadiumView.nitro';

/**
 * @deprecated Use DecorationGroup[] instead
 */
export type DecorationGroups = {
  [groupName: string]: Decoration[];
};
