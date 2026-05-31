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
  Dashboard: 'DS',
  Shipments: 'SH',
  Customers: 'CU',
  Tracking: 'TR',
  Invoices: 'IV',
  Workspace: 'WK',
};

export const TabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <View style={[styles.container, { backgroundColor: colors.panel, borderColor: colors.border }]}> 
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
                  { backgroundColor: colors.accentSoft, borderColor: `${colors.accent}45` },
                ],
              ]}
            >
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: isFocused ? colors.accent : colors.surfaceMuted,
                    borderColor: isFocused ? `${colors.accentDark}55` : colors.border,
                  },
                ]}
              > 
                <Text style={[styles.iconText, { color: isFocused ? '#111111' : colors.textSecondary }]}>
                  {tabIcons[route.name] || 'WK'}
                </Text>
              </View>
              <Text style={[styles.label, { color: isFocused ? colors.accent : colors.textSecondary }]}>
                {typeof label === 'string' ? label : ''}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        );
      })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
  },
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: BorderRadius['2xl'],
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 68,
    width: '100%',
  },
  tabContentActive: {
    borderRadius: BorderRadius.xl,
  },
  iconBadge: {
    minWidth: 30,
    paddingHorizontal: Spacing.xs,
    height: 24,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
    borderWidth: 1,
  },
  iconText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.6,
  },
  label: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.2,
  },
});
