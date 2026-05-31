import React from 'react';
import { FlatList, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { partnerPortalsApi } from '../../api/partnerPortals';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ModuleSummaryHeader } from '../../components/shared/ModuleSummaryHeader';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { PartnerPortalSummary } from '../../types/admin';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList>;

const PartnerPortalsScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const navigation = useNavigation<NavigationProp>();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['partner-portals'],
    queryFn: () => partnerPortalsApi.getPortals(),
  });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;

  const portals = data?.portals || [];
  const totalCustomers = portals.reduce((sum, portal) => sum + (portal._count?.customers || 0), 0);
  const totalAssignments = portals.reduce((sum, portal) => sum + (portal._count?.shipmentAssignments || 0), 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={portals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: PartnerPortalSummary }) => (
          <Card style={styles.card} pressable onPress={() => navigation.navigate('PartnerPortalDetail', { id: item.id })}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={[styles.name, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.code, { color: colors.textSecondary }]}>{item.code || 'No code'} • {item.companyLabel || 'No company label'}</Text>
              </View>
              <View style={StyleSheet.flatten([styles.statePill, { backgroundColor: `${colors.accent}16`, borderColor: `${colors.accent}32` }])}>
                <Text style={[styles.statePillText, { color: colors.accent }]}>{item.isActive ? 'Active' : 'Paused'}</Text>
              </View>
            </View>
            <View style={styles.metricsRow}>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>Members: {item._count?.memberships || 0}</Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>Customers: {item._count?.customers || 0}</Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>Shipments: {item._count?.shipmentAssignments || 0}</Text>
            </View>
          </Card>
        )}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <ModuleSummaryHeader
              eyebrow="ADMIN / PARTNER PORTALS"
              title="Partner Portals"
              subtitle="Real mobile list parity for partner workspaces, with direct access to portal settings and activity detail."
              showBack
              stats={[
                { label: 'Portals', value: String(portals.length) },
                { label: 'Customers', value: String(totalCustomers) },
                { label: 'Assignments', value: String(totalAssignments) },
              ]}
            />
            <Button title="Create Portal" onPress={() => navigation.navigate('PartnerPortalCreate')} fullWidth />
          </View>
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="PP" title="No Partner Portals" description="Create the first portal to begin partner workspace handoffs." />}
        onRefresh={refetch}
        refreshing={isLoading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  headerWrap: { marginBottom: Spacing.base },
  card: { marginBottom: Spacing.sm },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cardInfo: { flex: 1 },
  name: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  code: {
    fontSize: Typography.fontSize.sm,
  },
  statePill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  statePillText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  metricsRow: {
    gap: Spacing.xs,
  },
  meta: {
    fontSize: Typography.fontSize.sm,
  },
});

export default PartnerPortalsScreen;