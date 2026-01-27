import { StyleSheet } from 'react-native';

/**
 * Shared styles for modal components
 * Used to maintain consistent styling across all modals
 */
export const modalStyles = StyleSheet.create({
  // Card-style item container used in lists
  cardItem: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },

  // Last item in a list (no bottom margin)
  cardItemLast: {
    marginBottom: 0,
  },

  // Section title text
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },

  // Empty state text
  emptyText: {
    fontSize: 14,
    color: '#999999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },

  // Standard action button
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },

  // Destructive action button (delete, etc)
  destructiveButton: {
    backgroundColor: '#FF3B30',
  },

  // Action button text
  actionButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Text input field
  textInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333333',
    backgroundColor: '#FAFAFA',
  },

  // Section container
  section: {
    marginBottom: 16,
  },

  // Selected text display box
  selectedText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
    padding: 8,
    backgroundColor: '#FAFAFA',
    borderRadius: 4,
  },

  // Button row container
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },

  // Standard button
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },

  // Cancel button styling
  cancelButton: {
    backgroundColor: '#999999',
  },

  // Confirm/Save button styling
  confirmButton: {
    backgroundColor: '#007AFF',
  },

  // Success button (e.g., Save)
  saveButton: {
    backgroundColor: '#007AFF',
  },

  // Destructive button (e.g., Delete) for button rows
  deleteButton: {
    backgroundColor: '#FF3B30',
  },

  // Button text
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

/**
 * Color constants used across the app
 */
export const colors = {
  primary: '#007AFF',
  destructive: '#FF3B30',
  success: '#34C759',
  text: {
    primary: '#333333',
    secondary: '#666666',
    tertiary: '#999999',
  },
  background: {
    card: '#F9F9F9',
    input: '#FAFAFA',
  },
  border: {
    primary: '#EEEEEE',
    secondary: '#DDDDDD',
    tertiary: '#CCCCCC',
  },
};

/**
 * Highlight color options
 */
export const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#FFFF00' },
  { name: 'Green', value: '#00FF00' },
  { name: 'Blue', value: '#00BFFF' },
  { name: 'Pink', value: '#FFB6C1' },
  { name: 'Orange', value: '#FFA500' },
  { name: 'Purple', value: '#DDA0DD' },
];
