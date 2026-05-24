import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Card } from '../ui/Card';
import { StatusBadge } from './StatusBadge';
import { Shipment } from '../../types/shipment';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { format } from 'date-fns';

interface ShipmentCardProps {
  shipment: Shipment;
  onPress: () => void;
  showCustomer?: boolean;
}

export const ShipmentCard: React.FC<ShipmentCardProps> = ({
  shipment,
  onPress,
  showCustomer = false,
}) => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <Card pressable onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.vin, { color: colors.textPrimary }]}>
            {shipment.vehicle.vin}
          </Text>
          <Text style={[styles.vehicle, { color: colors.textSecondary }]}>
            {shipment.vehicle.year} {shipment.vehicle.make} {shipment.vehicle.model}
          </Text>
        </View>
        <StatusBadge status={shipment.status} type="shipment" />
      </View>

      {showCustomer && shipment.customerName && (
        <Text style={[styles.customer, { color: colors.textSecondary }]}>
          {shipment.customerName}
        </Text>
      )}

      <View style={styles.route}>
        <View style={styles.location}>
          <Text style={[styles.locationLabel, { color: colors.textSecondary }]}>From</Text>
          <Text style={[styles.locationText, { color: colors.textPrimary }]} numberOfLines={1}>
            {shipment.origin.city}, {shipment.origin.state}
          </Text>
        </View>
        <Text style={[styles.arrow, { color: colors.accent }]}>→</Text>
        <View style={styles.location}>
          <Text style={[styles.locationLabel, { color: colors.textSecondary }]}>To</Text>
          <Text style={[styles.locationText, { color: colors.textPrimary }]} numberOfLines={1}>
            {shipment.destination.city}, {shipment.destination.country}
          </Text>
        </View>
      </View>

      <Text style={[styles.updated, { color: colors.textTertiary }]}>
        Updated {format(new Date(shipment.updatedAt), 'MMM d, yyyy')}
      </Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  vin: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  vehicle: {
    fontSize: Typography.fontSize.sm,
  },
  customer: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.sm,
  },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  location: {
    flex: 1,
  },
  locationLabel: {
    fontSize: Typography.fontSize.xs,
    marginBottom: Spacing.xs,
  },
  locationText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  arrow: {
    fontSize: Typography.fontSize['2xl'],
    marginHorizontal: Spacing.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  updated: {
    fontSize: Typography.fontSize.xs,
    marginTop: Spacing.xs,
  },
});
