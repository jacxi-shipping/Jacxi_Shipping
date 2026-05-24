import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Customer } from '../../types/user';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';

interface CustomerCardProps {
  customer: Customer;
  onPress: () => void;
}

export const CustomerCard: React.FC<CustomerCardProps> = ({ customer, onPress }) => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <Card pressable onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <Avatar name={customer.name} size={48} />
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{customer.name}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{customer.email}</Text>
        </View>
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {customer.totalShipments}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Shipments</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: customer.balance > 0 ? colors.error : colors.success }]}>
            ${Math.abs(customer.balance).toLocaleString()}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Balance</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    marginBottom: Spacing.base,
  },
  info: {
    marginLeft: Spacing.md,
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  email: {
    fontSize: Typography.fontSize.sm,
  },
  stats: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
  },
  statValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
  },
});
