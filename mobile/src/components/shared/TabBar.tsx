import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/spacing';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const tabIcons: Record<string, string> = {
  Dashboard: '[]',
  Shipments: '<>',
  Customers: 'OO',
  Tracking: '>>',
  Invoices: '$$',
  Workspace: '::',
};

export const TabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.container, { backgroundColor: colors.panel, borderTopColor: colors.border }]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined
          ? options.tabBarLabel
          : options.title !== undefined
          ? options.title
          : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={styles.tab}
          >
            <Animated.View
              style={[
                styles.tabContent,
                isFocused && [
                  styles.tabContentActive,
                  { backgroundColor: `${colors.accent}16`, borderColor: `${colors.accent}35` },
                ],
              ]}
            >
              <View style={[styles.iconBadge, isFocused && { backgroundColor: colors.accent }]}> 
                <Text style={[styles.iconText, { color: isFocused ? '#111111' : colors.textSecondary }]}>
                  {tabIcons[route.name] || '::'}
                </Text>
              </View>
              <Text style={[styles.label, { color: isFocused ? colors.accent : colors.textSecondary }]}>
                {typeof label === 'string' ? label : ''}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: Spacing.xs,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 70,
  },
  tabContentActive: {
    borderRadius: BorderRadius.full,
  },
  iconBadge: {
    minWidth: 28,
    paddingHorizontal: Spacing.xs,
    height: 24,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  iconText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.8,
  },
  label: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
});
