import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Badge } from '../ui/Badge';
import { ShipmentStatus } from '../../types/shipment';
import { InvoiceStatus } from '../../types/invoice';
import { Colors, ShipmentStatusColors, InvoiceStatusColors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/spacing';

interface StatusBadgeProps {
  status: ShipmentStatus | InvoiceStatus;
  type: 'shipment' | 'invoice';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type }) => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const getStatusLabel = () => {
    return status.replace(/_/g, ' ');
  };

  const getStatusColor = () => {
    if (type === 'shipment') {
      return ShipmentStatusColors[status as ShipmentStatus];
    }
    return InvoiceStatusColors[status as InvoiceStatus];
  };

  const color = getStatusColor();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: `${color}20`,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text
        style={[
          styles.label,
          {
            color,
          },
        ]}
      >
        {getStatusLabel()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  label: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
  },
});
