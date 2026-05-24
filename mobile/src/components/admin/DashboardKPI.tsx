import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Card } from '../ui/Card';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';

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
            <Text
              style={[
                styles.trend,
                { color: trend.isPositive ? colors.success : colors.error },
              ]}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </Text>
          )}
        </View>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: `${colors.accent}20` }]}>
            <Text style={styles.icon}>{icon}</Text>
          </View>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    marginRight: Spacing.md,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  left: {
    flex: 1,
  },
  title: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.xs,
  },
  value: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  trend: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
  },
});
