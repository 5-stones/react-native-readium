import { Platform, Alert } from 'react-native';

/**
 * Shows a platform-appropriate confirmation dialog
 * @param title - Dialog title (native only)
 * @param message - Confirmation message
 * @param onConfirm - Callback when user confirms
 * @param onCancel - Optional callback when user cancels
 */
export const showConfirmDialog = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
) => {
  if (Platform.OS === 'web') {
    if (confirm(message)) {
      onConfirm();
    } else if (onCancel) {
      onCancel();
    }
  } else {
    Alert.alert(title, message, [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: onConfirm,
      },
    ]);
  }
};

/**
 * Shows a platform-appropriate alert dialog
 * @param title - Dialog title (native only)
 * @param message - Alert message
 */
export const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    alert(message);
  } else {
    Alert.alert(title, message);
  }
};
