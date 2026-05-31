import React from 'react';
import { ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { AppTopBar } from './AppTopBar';
import { Card } from '../ui/Card';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';

type ModuleStat = {
  label: string;
  value: string;
};

interface ModuleSummaryHeaderProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  stats?: ModuleStat[];
  showBack?: boolean;
}

export const ModuleSummaryHeader: React.FC<ModuleSummaryHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  stats = [],
  showBack = false,
}) => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <View style={styles.wrapper}>
      <AppTopBar section={title} detail={eyebrow} showBack={showBack} />

      <Card style={StyleSheet.flatten([styles.card, { borderColor: `${colors.accent}35` }])}>
        <Text style={[styles.eyebrow, { color: colors.accent }]}>{eyebrow}</Text>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>

        {stats.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
            {stats.map((stat) => (
              <View
                key={stat.label}
                style={StyleSheet.flatten([
                  styles.statChip,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ])}
              >
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.lg,
  },
  card: {
    marginBottom: 0,
  },
  eyebrow: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 1.1,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    lineHeight: 22,
  },
  statsRow: {
    gap: Spacing.sm,
    marginTop: Spacing.base,
    paddingRight: Spacing.base,
  },
  statChip: {
    minWidth: 110,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  statValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});