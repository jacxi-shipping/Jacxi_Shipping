import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, useColorScheme } from 'react-native';
import { Colors } from '../../constants/colors';
import { Spacing, BorderRadius } from '../../constants/spacing';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  pressable?: boolean;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, style, pressable = false, onPress }) => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (pressable) {
      scale.value = withSpring(0.97);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    if (pressable) {
      scale.value = withSpring(1);
    }
  };

  const cardStyle: ViewStyle = {
    backgroundColor: colors.panel,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
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
