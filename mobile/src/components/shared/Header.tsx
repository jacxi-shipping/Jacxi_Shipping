import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';

interface HeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: {
    icon: string;
    onPress: () => void;
  };
  rightAction?: {
    icon: string;
    onPress: () => void;
  };
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, leftAction, rightAction }) => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.panel, borderBottomColor: colors.border }]}
    >
      <View style={styles.content}>
        {leftAction && (
          <TouchableOpacity onPress={leftAction.onPress} style={styles.action}>
            <Text style={[styles.icon, { color: colors.textPrimary }]}>{leftAction.icon}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
          )}
        </View>
        {rightAction && (
          <TouchableOpacity onPress={rightAction.onPress} style={styles.action}>
            <Text style={[styles.icon, { color: colors.textPrimary }]}>{rightAction.icon}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    minHeight: 60,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    marginTop: Spacing.xs,
  },
  action: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
  },
});
