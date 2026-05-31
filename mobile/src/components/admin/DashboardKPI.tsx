import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Card } from '../ui/Card';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';

interface DashboardKPIProps {
  title: string;
  value: string | number;
  icon?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onPress?: () => void;
}

export const DashboardKPI: React.FC<DashboardKPIProps> = ({ title, value, icon, trend, onPress }) => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <Card pressable={!!onPress} onPress={onPress} style={styles.card}>
      <View style={styles.content}>
        <View style={styles.left}>
          <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text>
          {trend && (
            <View
              style={[
                styles.trendPill,
                {
                  backgroundColor: trend.isPositive ? `${colors.success}14` : `${colors.error}14`,
                  borderColor: trend.isPositive ? `${colors.success}30` : `${colors.error}30`,
                },
              ]}
            >
              <Text style={[styles.trend, { color: trend.isPositive ? colors.success : colors.error }]}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </Text>
            </View>
          )}
        </View>
        {icon && (
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: `${colors.accent}30`,
              },
            ]}
          >
            <Text style={[styles.icon, { color: colors.accent }]}>{icon}</Text>
          </View>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 132,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  left: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.sm,
  },
  trendPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  trend: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  icon: {
    fontSize: 22,
    fontWeight: Typography.fontWeight.bold,
  },
});
