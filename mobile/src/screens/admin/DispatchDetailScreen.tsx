import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { dispatchesApi } from '../../api/dispatches';
import { DetailTabOption, DetailTabStrip } from '../../components/shared/DetailTabs';
import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorState } from '../../components/shared/ErrorState';
import { ModuleSummaryHeader } from '../../components/shared/ModuleSummaryHeader';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { useAppTheme } from '../../hooks/useAppTheme';
import { AdminStackParamList } from '../../navigation/AdminNavigator';

type RouteProps = RouteProp<AdminStackParamList, 'DispatchDetail'>;

const formatCurrency = (amount?: number | null) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const formatDate = (value?: string | null) => {
  if (!value) {
    return 'Not set';
  }

  return new Date(value).toLocaleDateString();
};

const titleCase = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

const buildShipmentLabel = (shipment: { vehicleYear?: number | null; vehicleMake?: string | null; vehicleModel?: string | null; vehicleVIN?: string | null }) => {
  const label = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ').trim();
  return label || shipment.vehicleVIN || 'Shipment';
};

const DispatchDetailScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const { colors } = useAppTheme();
  const [activeTab, setActiveTab] = useState<string>('shipments');

  const { data: dispatch, isLoading, error, refetch } = useQuery({
    queryKey: ['dispatch', route.params.id],
    queryFn: () => dispatchesApi.getDispatch(route.params.id),
  });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;
  if (!dispatch) return <ErrorState message="Dispatch not found" onRetry={refetch} />;

  const totalExpenses = dispatch.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const tabs: DetailTabOption[] = [
    { key: 'shipments', label: `Shipments (${dispatch._count.shipments})` },
    { key: 'events', label: `Events (${dispatch._count.events})` },
    { key: 'expenses', label: `Expenses (${dispatch._count.expenses})` },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ModuleSummaryHeader
          eyebrow="OPERATIONS / DISPATCHES"
          title={dispatch.referenceNumber}
          subtitle={`${dispatch.origin} to ${dispatch.destination}`}
          showBack
          stats={[
            { label: 'Status', value: titleCase(dispatch.status) },
            { label: 'Shipments', value: String(dispatch._count.shipments) },
            { label: 'Expenses', value: formatCurrency(totalExpenses) },
          ]}
        />

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Dispatch Snapshot</Text>
          <View style={styles.metricsRow}>
            <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{dispatch.company?.name || 'Pending'}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Company</Text>
            </View>
            <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(dispatch.cost)}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Agreed Cost</Text>
            </View>
          </View>
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Dispatch date: {formatDate(dispatch.dispatchDate)}</Text>
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Estimated arrival: {formatDate(dispatch.estimatedArrival)}</Text>
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Actual arrival: {formatDate(dispatch.actualArrival)}</Text>
          {dispatch.notes ? <Text style={[styles.summaryText, { color: colors.textSecondary }]}>{dispatch.notes}</Text> : null}
        </Card>

        <DetailTabStrip tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'shipments' ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Assigned Shipments</Text>
            {dispatch.shipments.length === 0 ? (
              <EmptyState icon="shipment" title="No Shipments Assigned" description="This dispatch does not have any assigned shipments yet." />
            ) : (
              dispatch.shipments.map((shipment, index) => (
                <View
                  key={shipment.id}
                  style={StyleSheet.flatten([
                    styles.itemRow,
                    index === dispatch.shipments.length - 1 ? styles.itemRowLast : null,
                    { borderBottomColor: colors.border },
                  ])}
                >
                  <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{buildShipmentLabel(shipment)}</Text>
                  <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>{titleCase(shipment.status)} • {shipment.user?.name || shipment.user?.email || 'No customer'}</Text>
                </View>
              ))
            )}
          </Card>
        ) : null}

        {activeTab === 'events' ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Dispatch Events</Text>
            {dispatch.events.length === 0 ? (
              <EmptyState icon="timeline" title="No Dispatch Events" description="Dispatch milestones will appear here once they are recorded." />
            ) : (
              dispatch.events.map((event, index) => (
                <View
                  key={event.id}
                  style={StyleSheet.flatten([
                    styles.itemRow,
                    index === dispatch.events.length - 1 ? styles.itemRowLast : null,
                    { borderBottomColor: colors.border },
                  ])}
                >
                  <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{titleCase(event.status)}</Text>
                  <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>{event.location || 'Location pending'} • {formatDate(event.eventDate || event.createdAt)}</Text>
                  {event.description ? <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>{event.description}</Text> : null}
                </View>
              ))
            )}
          </Card>
        ) : null}

        {activeTab === 'expenses' ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Dispatch Expenses</Text>
            {dispatch.expenses.length === 0 ? (
              <EmptyState icon="finance" title="No Dispatch Expenses" description="Shared dispatch costs will appear here when they are recorded." />
            ) : (
              dispatch.expenses.map((expense, index) => (
                <View
                  key={expense.id}
                  style={StyleSheet.flatten([
                    styles.itemRow,
                    index === dispatch.expenses.length - 1 ? styles.itemRowLast : null,
                    { borderBottomColor: colors.border },
                  ])}
                >
                  <View style={styles.expenseInfo}>
                    <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{expense.description}</Text>
                    <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>{titleCase(expense.type)} • {formatDate(expense.date)}</Text>
                    <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>{expense.shipment ? buildShipmentLabel(expense.shipment) : 'General dispatch expense'}</Text>
                  </View>
                  <View style={StyleSheet.flatten([styles.amountPill, { backgroundColor: `${colors.accent}16`, borderColor: `${colors.accent}32` }])}>
                    <Text style={[styles.amountPillText, { color: colors.accent }]}>{formatCurrency(expense.amount)}</Text>
                  </View>
                </View>
              ))
            )}
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  sectionCard: { marginBottom: Spacing.base },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
  },
  metricValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  metricLabel: {
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  summaryText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
  itemRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  itemRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  itemTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  itemMeta: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  expenseInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  amountPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
  amountPillText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
});

export default DispatchDetailScreen;