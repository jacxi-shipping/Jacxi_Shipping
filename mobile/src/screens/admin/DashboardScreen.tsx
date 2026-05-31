import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, useColorScheme, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useShipments } from '../../hooks/useShipments';
import { DashboardKPI } from '../../components/admin/DashboardKPI';
import { ShipmentRow } from '../../components/admin/ShipmentRow';
import { StatsChart } from '../../components/admin/StatsChart';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/shared/ErrorState';
import { Colors, ShipmentStatusColors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../../navigation/AdminNavigator';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList>;

const DashboardScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  
  const { data: shipmentsData, isLoading, error, refetch, isRefetching } = useShipments({}, { pageSize: 10 });

  const openTab = (screen: 'Shipments') => {
    navigation.navigate('Home', { screen });
  };

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;

  const shipments = shipmentsData?.data || [];
  const activeShipments = shipments.filter(s => 
    !['DELIVERED', 'CANCELLED'].includes(s.status)
  ).length;

  const statusDistribution = [
    { label: 'On Hand', value: shipments.filter(s => s.status === 'ON_HAND').length, color: ShipmentStatusColors.ON_HAND },
    { label: 'In Transit', value: shipments.filter(s => s.status.includes('TRANSIT')).length, color: ShipmentStatusColors.IN_TRANSIT },
    { label: 'At Port', value: shipments.filter(s => s.status === 'AT_PORT').length, color: ShipmentStatusColors.AT_PORT },
    { label: 'Delivered', value: shipments.filter(s => s.status === 'DELIVERED').length, color: ShipmentStatusColors.DELIVERED },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />
        }
      >
        <AppTopBar section="Admin Dashboard" detail="Operations, shipment volume, and quick actions" />

        <Text style={[styles.greeting, { color: colors.textPrimary }]}>
          Welcome back, {user?.name}
        </Text>

        <View style={styles.kpis}>
          <DashboardKPI title="Active Shipments" value={activeShipments} icon="📦" />
          <DashboardKPI title="Total Shipments" value={shipmentsData?.total || 0} icon="📊" />
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.accent }]}
            onPress={() => navigation.navigate('ShipmentCreate')}
          >
            <Text style={styles.actionIcon}>+</Text>
            <Text style={styles.actionText}>New Shipment</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Containers')}
          >
            <Text style={[styles.actionIcon, { color: colors.textPrimary }]}>🚢</Text>
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>Containers</Text>
          </TouchableOpacity>
        </View>

        <StatsChart title="Status Distribution" data={statusDistribution} />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Shipments</Text>
          {shipments.slice(0, 5).map((shipment) => (
            <ShipmentRow
              key={shipment.id}
              shipment={shipment}
              onPress={() => navigation.navigate('ShipmentDetail', { id: shipment.id })}
            />
          ))}
          <TouchableOpacity onPress={() => openTab('Shipments')}>
            <Text style={[styles.viewAll, { color: colors.accent }]}>View All →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base },
  greeting: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xl },
  kpis: { flexDirection: 'row', marginBottom: Spacing.base, gap: Spacing.sm },
  quickActions: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.base, borderRadius: 12 },
  actionIcon: { fontSize: 24, marginRight: Spacing.sm, color: '#1C1C1E' },
  actionText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: '#1C1C1E' },
  section: { marginTop: Spacing.base },
  sectionTitle: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.base },
  viewAll: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium, textAlign: 'center', marginTop: Spacing.base },
});

export default DashboardScreen;
