import React from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useShipment } from '../../hooks/useShipments';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/shared/ErrorState';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { Card } from '../../components/ui/Card';
import { ShipmentDocumentsCard } from '../../components/shared/ShipmentDocumentsCard';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { TrackingTimeline } from '../../components/customer/TrackingTimeline';
import { Divider } from '../../components/ui/Divider';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { format } from 'date-fns';

type RouteProps = RouteProp<CustomerStackParamList, 'ShipmentDetail'>;

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
        <AppTopBar section="Shipment Details" detail={shipment.trackingNumber} showBack />

        <Card>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={[styles.vin, { color: colors.textPrimary }]}>{shipment.vehicle.vin}</Text>
              <Text style={[styles.vehicle, { color: colors.textSecondary }]}>
                {shipment.vehicle.year} {shipment.vehicle.make} {shipment.vehicle.model}
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
            
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>From</Text>
              <Text style={[styles.value, { color: colors.textPrimary }]}>
                {shipment.origin.city}, {shipment.origin.state}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>To</Text>
              <Text style={[styles.value, { color: colors.textPrimary }]}>
                {shipment.destination.city}, {shipment.destination.country}
              </Text>
            </View>
            
            {shipment.estimatedDelivery && (
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Est. Delivery</Text>
                <Text style={[styles.value, { color: colors.textPrimary }]}>
                  {format(new Date(shipment.estimatedDelivery), 'MMM d, yyyy')}
                </Text>
              </View>
            )}
          </View>
        </Card>

        <Card style={styles.timeline}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tracking History</Text>
          <TrackingTimeline tracking={shipment.tracking} currentStatus={shipment.status} />
        </Card>

        <ShipmentDocumentsCard shipmentId={shipment.id} />
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
  vehicle: { fontSize: Typography.fontSize.base },
  info: { gap: Spacing.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: Typography.fontSize.sm },
  value: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  timeline: { marginTop: Spacing.base },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.base },
});

export default ShipmentDetailScreen;
