/**
 * The reader's text selection, and the menu items offered for it.
 */

import type { Locator } from './locator.nitro';

// ── Selection ────────────────────────────────────────────────────────────────

/** An item added to the text-selection menu. */
export interface SelectionAction {
  /** Reported as `actionId` when the user picks it. */
  id: string;
  /** The menu item's text. */
  label: string;
}

/** Reported by `onSelectionChange` as the user adjusts a selection. */
export interface SelectionEvent {
  /** Where the selection is; undefined once it's cleared. */
  locator?: Locator;
  selectedText?: string;
}

/** Reported by `onSelectionAction` when the user picks one of the `selectionActions`. */
export interface SelectionActionEvent {
  /** Where the selection is, e.g. to create a highlight there. */
  locator: Locator;
  selectedText: string;
  /** The `id` of the action picked. */
  actionId: string;
}
