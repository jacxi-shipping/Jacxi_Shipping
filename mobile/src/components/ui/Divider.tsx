import React from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';

interface DividerProps {
  spacing?: number;
}

export const Divider: React.FC<DividerProps> = ({ spacing = Spacing.base }) => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <View
      style={[
        styles.divider,
        {
          marginVertical: spacing,
          backgroundColor: colors.border,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  divider: {
    height: 1,
  },
});
