import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { containersApi } from '../../api/containers';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { Input } from '../../components/ui/Input';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { Container } from '../../types/container';

const titleCase = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString() : 'Not scheduled');

const ContainersScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState('');
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['containers', search],
    queryFn: () => containersApi.getContainers(search ? { search } : {}, { pageSize: 20 }),
  });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;

  const containers = data?.containers || [];
  const summary = useMemo(
    () => ({
      total: data?.pagination.totalCount || 0,
      inTransit: containers.filter((container) => container.status === 'IN_TRANSIT').length,
      withDocuments: containers.filter((container) => (container._count?.documents || 0) > 0).length,
    }),
    [containers, data?.pagination.totalCount],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.pageHeader}>
        <AppTopBar section="Containers" detail="Capacity, movement status, and linked shipments" showBack />
        <Input value={search} onChangeText={setSearch} placeholder="Search by container, tracking, vessel, or booking" />
        <View style={styles.metricRow}>
          <Card style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{summary.total}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Visible</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{summary.inTransit}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>In Transit</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{summary.withDocuments}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>With Docs</Text>
          </Card>
        </View>
      </View>
      <FlatList
        data={containers}
        renderItem={({ item }: { item: Container }) => (
          <Card pressable onPress={() => navigation.navigate('ContainerDetail', { id: item.id })} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[styles.number, { color: colors.textPrimary }]}>{item.containerNumber}</Text>
              <View style={StyleSheet.flatten([styles.statusPill, { backgroundColor: `${colors.accent}12`, borderColor: `${colors.accent}30` }])}>
                <Text style={[styles.statusPillText, { color: colors.accent }]}>{titleCase(item.status)}</Text>
              </View>
            </View>
            <Text style={[styles.type, { color: colors.textSecondary }]}>
              {item.shippingLine || 'Shipping line pending'} • {item.destinationPort || 'Destination pending'}
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              Capacity {item.currentCount}/{item.maxCapacity} • ETA {formatDate(item.estimatedArrival)}
            </Text>
            <View style={styles.footerRow}>
              <Text style={[styles.footerMeta, { color: colors.textSecondary }]}>Tracking {item.trackingNumber || 'Not connected'}</Text>
              <Text style={[styles.footerMeta, { color: colors.textSecondary }]}>{item._count?.shipments || 0} shipments</Text>
            </View>
            {(item._count?.documents || 0) > 0 ? (
              <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('ContainerDetail', { id: item.id })}>
                <Text style={[styles.documentsHint, { color: colors.accent }]}>{item._count?.documents} linked documents available</Text>
              </TouchableOpacity>
            ) : null}
          </Card>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="🚢" title="No Containers" description="Containers tied to your shipments will appear here." />}
        onRefresh={refetch}
        refreshing={isLoading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { padding: Spacing.base, paddingBottom: 0 },
  title: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
  subtitle: { fontSize: Typography.fontSize.sm, marginBottom: Spacing.base },
  list: { padding: Spacing.base, paddingTop: Spacing.sm },
  metricRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  metricCard: { flex: 1, paddingVertical: Spacing.base },
  metricValue: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, textAlign: 'center' },
  metricLabel: { fontSize: Typography.fontSize.xs, textAlign: 'center', marginTop: Spacing.xs },
  card: { marginBottom: Spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  number: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold },
  type: { fontSize: Typography.fontSize.sm },
  meta: { fontSize: Typography.fontSize.sm, marginTop: Spacing.xs },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm, gap: Spacing.sm },
  footerMeta: { flex: 1, fontSize: Typography.fontSize.xs },
  statusPill: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  statusPillText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.bold },
  documentsHint: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, marginTop: Spacing.sm },
});

export default ContainersScreen;
