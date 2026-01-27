/**
 * Defines a custom action that appears in the native text selection menu
 */
export interface SelectionAction {
  /**
   * Unique identifier for this action (e.g., "highlight", "note", "share")
   */
  id: string;

  /**
   * Display label for the action in the native menu
   */
  label: string;
}

/**
 * Event emitted when a custom selection action is triggered
 */
export interface SelectionActionEvent {
  /**
   * The locator for the selected text, includes:
   * - href: Resource location
   * - locations: Position in the document
   * - text.highlight: The selected text
   * - text.before: Context before the selection
   * - text.after: Context after the selection
   */
  locator: import('./Locator').Locator;

  /**
   * The selected text string
   */
  selectedText: string;

  /**
   * The ID of the action that was triggered
   */
  actionId: string;
}
