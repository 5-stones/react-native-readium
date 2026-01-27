import type { Locator } from './Locator';

/**
 * Event emitted when text selection changes in the reader
 */
export interface SelectionEvent {
  /**
   * The locator for the selected text, includes:
   * - href: Resource location
   * - locations: Position in the document
   * - text.highlight: The selected text
   * - text.before: Context before the selection
   * - text.after: Context after the selection
   *
   * Null when selection is cleared
   */
  locator: Locator | null;

  /**
   * The selected text string
   * Null when selection is cleared
   */
  selectedText: string | null;
}
