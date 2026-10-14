export type {
  DecorationStyle,
  Decoration,
  DecorationGroup,
  DecorationActivatedEvent,
} from '../specs';

import type { Decoration } from '../specs';

/**
 * @deprecated Use DecorationGroup[] instead
 */
export type DecorationGroups = {
  [groupName: string]: Decoration[];
};
