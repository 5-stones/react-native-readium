import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { palette, radii, space, typography, shadow } from '../styles/theme';

interface BaseModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /**
   * Optional sticky footer rendered below the scrollable content (e.g. Save/Cancel).
   * Stays anchored at the bottom of the sheet so the user always has access to the
   * primary actions without scrolling.
   */
  footer?: React.ReactNode;
}

/**
 * Bottom-sheet-styled modal — rounded top, drag handle, soft surface.
 * Lifts above the keyboard on focus.
 */
export const BaseModal: React.FC<BaseModalProps> = ({
  visible,
  title,
  onClose,
  children,
  footer,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.dismissArea}
          onPress={onClose}
        />
        <View style={styles.modalContent}>
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityLabel="Close"
              style={styles.closeButton}
            >
              <MaterialIcons
                name="close"
                size={20}
                color={palette.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {children}
          </ScrollView>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 20, 16, 0.45)',
    justifyContent: 'flex-end',
    ...Platform.select({
      web: {
        alignItems: 'center',
        justifyContent: 'center',
      },
    }),
  },
  dismissArea: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: palette.bg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    flexShrink: 1,
    maxHeight: '85%',
    ...shadow.lg,
    ...Platform.select({
      web: {
        borderRadius: radii.xl,
        width: '90%',
        maxWidth: 600,
        maxHeight: '85%',
      },
    }),
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: space.sm,
    paddingBottom: space.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.borderStrong,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.lg,
  },
  modalTitle: {
    ...typography.title,
    fontSize: 20,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flexShrink: 1,
    paddingHorizontal: space.xl,
  },
  scrollContent: {
    paddingBottom: space.xl,
  },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    paddingBottom: space.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    backgroundColor: palette.bg,
  },
});
