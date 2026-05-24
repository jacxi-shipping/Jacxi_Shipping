import React from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useShipment } from '../../hooks/useShipments';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/shared/ErrorState';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { TrackingTimeline } from '../../components/customer/TrackingTimeline';
import { Divider } from '../../components/ui/Divider';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { format } from 'date-fns';

type RouteProps = RouteProp<AdminStackParamList, 'ShipmentDetail'>;

const ShipmentDetailScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const route = useRoute<RouteProps>();
  const { data: shipment, isLoading, error, refetch } = useShipment(route.params.id);

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;
  if (!shipment) return <ErrorState message="Shipment not found" />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={[styles.vin, { color: colors.textPrimary }]}>{shipment.vehicle.vin}</Text>
              <Text style={[styles.vehicle, { color: colors.textSecondary }]}>
                {shipment.vehicle.year} {shipment.vehicle.make} {shipment.vehicle.model}
              </Text>
              <Text style={[styles.customer, { color: colors.textSecondary }]}>
                Customer: {shipment.customerName}
              </Text>
            </View>
            <StatusBadge status={shipment.status} type="shipment" />
          </View>
          
          <Divider />
          
          <View style={styles.info}>
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Tracking #</Text>
              <Text style={[styles.value, { color: colors.textPrimary }]}>{shipment.trackingNumber}</Text>
            </View>
            
            {shipment.pricing && (
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Total Cost</Text>
                <Text style={[styles.value, { color: colors.textPrimary }]}>
                  ${shipment.pricing.total.toLocaleString()}
                </Text>
              </View>
            )}
            
            {shipment.containerNumber && (
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Container</Text>
                <Text style={[styles.value, { color: colors.textPrimary }]}>{shipment.containerNumber}</Text>
              </View>
            )}
          </View>
        </Card>

        <Card style={styles.timeline}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tracking History</Text>
          <TrackingTimeline tracking={shipment.tracking} currentStatus={shipment.status} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1 },
  vin: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
  vehicle: { fontSize: Typography.fontSize.base, marginBottom: Spacing.xs },
  customer: { fontSize: Typography.fontSize.sm },
  info: { gap: Spacing.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: Typography.fontSize.sm },
  value: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  timeline: { marginTop: Spacing.base },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.base },
});

export default ShipmentDetailScreen;
