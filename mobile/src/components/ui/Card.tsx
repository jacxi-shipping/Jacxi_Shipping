import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Spacing, BorderRadius } from '../../constants/spacing';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { triggerImpact } from '../../utils/haptics';
import { useAppTheme } from '../../hooks/useAppTheme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  pressable?: boolean;
  onPress?: () => void;
  /** Visual elevation level: 'flat' | 'card' | 'elevated'. Default: 'card' */
  elevation?: 'flat' | 'card' | 'elevated';
  /** Add a 3px left accent border (gold) — mirrors web StatsCard default variant */
  accentBorder?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  pressable = false,
  onPress,
  elevation = 'card',
  accentBorder = false,
}) => {
  const { colors, isDark } = useAppTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (pressable) {
      scale.value = withSpring(0.985, { damping: 20, stiffness: 300 });
      void triggerImpact('light');
    }
  };

  const handlePressOut = () => {
    if (pressable) {
      scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    }
  };

  const shadowByElevation: Record<string, ViewStyle> = {
    flat: {
      shadowOpacity: 0,
      elevation: 0,
    },
    card: {
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.22 : 0.08,
      shadowRadius: 16,
      elevation: 3,
    },
    elevated: {
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.30 : 0.12,
      shadowRadius: 28,
      elevation: 6,
    },
  };

  const cardStyle: ViewStyle = {
    backgroundColor: colors.panel,
    borderRadius: BorderRadius.xl,        // 16px — matches web rounded-2xl cards
    padding: Spacing.base,
    borderWidth: accentBorder ? 0 : 1,
    borderLeftWidth: accentBorder ? 3 : 1,
    borderColor: accentBorder ? colors.accent : colors.border,
    shadowColor: colors.shadow,
    ...shadowByElevation[elevation],
  };

  if (pressable && onPress) {
    return (
      <AnimatedTouchable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[animatedStyle, cardStyle, style]}
        activeOpacity={0.9}
      >
        {children}
      </AnimatedTouchable>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
};
