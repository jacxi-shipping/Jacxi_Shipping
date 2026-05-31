import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Typography } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/spacing';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { useAppTheme } from '../../hooks/useAppTheme';
import { AppIcon } from '../shared/AppIcon';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
}) => {
  const { colors, colorScheme } = useAppTheme();

  return (
    <RNModal
      key={colorScheme}
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={[styles.overlay, { backgroundColor: colors.overlay }]}
      >
        <TouchableOpacity style={styles.overlayTouch} onPress={onClose} activeOpacity={1} />
        <Animated.View
          entering={SlideInDown.duration(300).springify()}
          exiting={SlideOutDown.duration(200)}
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.panel,
              borderColor: colors.border,
            },
          ]}
        >
          {(title || showCloseButton) && (
            <View style={styles.header}>
              {title && (
                <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
              )}
              {showCloseButton && (
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <AppIcon name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          )}
          <View style={styles.body}>{children}</View>
        </Animated.View>
      </Animated.View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayTouch: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    maxHeight: Dimensions.get('window').height * 0.9,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    flex: 1,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  closeText: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },
  body: {
    padding: Spacing.base,
  },
});
