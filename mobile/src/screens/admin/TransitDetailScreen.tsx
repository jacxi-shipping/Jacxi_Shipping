import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { transitsApi } from '../../api/transits';
import { Card } from '../../components/ui/Card';
import { DetailTabOption, DetailTabStrip } from '../../components/shared/DetailTabs';
import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ModuleSummaryHeader } from '../../components/shared/ModuleSummaryHeader';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { AdminStackParamList } from '../../navigation/AdminNavigator';

type RouteProps = RouteProp<AdminStackParamList, 'TransitDetail'>;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const formatDate = (value?: string | null) => {
  if (!value) {
    return 'Not set';
  }

  return new Date(value).toLocaleDateString();
};

const titleCase = (value: string) =>
  value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

const buildShipmentLabel = (shipment: { vehicleMake: string | null; vehicleModel: string | null; vehicleVIN: string | null }) => {
  const label = [shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ').trim();
  return label || shipment.vehicleVIN || 'Shipment';
};

const TransitDetailScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const { colors } = useAppTheme();
  const [activeTab, setActiveTab] = useState<string>('shipments');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['transit', route.params.id],
    queryFn: () => transitsApi.getTransit(route.params.id),
  });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;
  if (!data?.transit) return <ErrorState message="Transit not found" />;

  const { transit, totalExpenses } = data;
  const tabs: DetailTabOption[] = [
    { key: 'shipments', label: `Shipments (${transit._count.shipments})` },
    { key: 'events', label: `Events (${transit._count.events})` },
    { key: 'expenses', label: `Expenses (${transit._count.expenses})` },
    { key: 'company', label: 'Company Info' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ModuleSummaryHeader
          eyebrow="OPERATIONS / TRANSITS"
          title={transit.referenceNumber}
          subtitle={`${transit.origin} to ${transit.destination}`}
          showBack
          stats={[
            { label: 'Status', value: titleCase(transit.status) },
            { label: 'Shipments', value: String(transit._count.shipments) },
            { label: 'Expenses', value: formatCurrency(totalExpenses) },
          ]}
        />

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Transit Snapshot</Text>
          <View style={styles.metricsRow}>
            <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{titleCase(transit.status)}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Status</Text>
            </View>
            <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{transit.currentCompany?.name || 'Pending'}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Current Company</Text>
            </View>
          </View>
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Current leg: {transit.currentEvent ? `${transit.currentEvent.origin} to ${transit.currentEvent.destination}` : `${transit.origin} to ${transit.destination}`}</Text>
          {transit.actualDelivery ? (
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Delivered on {formatDate(transit.actualDelivery)}</Text>
          ) : null}
        </Card>

        <DetailTabStrip tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'shipments' ? (
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Linked Shipments</Text>
          {transit.shipments.length === 0 ? (
            <EmptyState icon="shipment" title="No Shipments Linked" description="This transit does not have any linked shipments yet." />
          ) : (
            transit.shipments.map((shipment, index) => (
              <View
                key={shipment.id}
                style={StyleSheet.flatten([
                  styles.itemRow,
                  index === transit.shipments.length - 1 ? styles.detailRowLast : null,
                  { borderBottomColor: colors.border },
                ])}
              >
                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{buildShipmentLabel(shipment)}</Text>
                <Text style={[styles.itemMeta, { color: colors.textSecondary }]}> 
                  {titleCase(shipment.status)} • {shipment.user?.name || shipment.user?.email || 'No customer'}
                </Text>
              </View>
            ))
          )}
        </Card>
        ) : null}

        {activeTab === 'events' ? (
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Events</Text>
          {transit.events.length === 0 ? (
            <EmptyState icon="timeline" title="No Transit Events" description="Transit events will appear here once movement updates are recorded." />
          ) : (
            transit.events.map((event, index) => (
              <View
                key={event.id}
                style={StyleSheet.flatten([
                  styles.itemRow,
                  index === transit.events.length - 1 ? styles.detailRowLast : null,
                  { borderBottomColor: colors.border },
                ])}
              >
                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{event.origin} to {event.destination}</Text>
                <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                  {titleCase(event.status)} • {event.company?.name || 'No company'}
                </Text>
                <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>{formatDate(event.eventDate || event.createdAt)}</Text>
              </View>
            ))
          )}
        </Card>
        ) : null}

        {activeTab === 'expenses' ? (
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Expense Activity</Text>
          {transit.expenses.length === 0 ? (
            <EmptyState icon="finance" title="No Transit Expenses" description="Transit and shipment expense entries will appear here when they are recorded." />
          ) : (
            transit.expenses.map((expense, index) => (
              <View
                key={expense.id}
                style={StyleSheet.flatten([
                  styles.itemRow,
                  index === transit.expenses.length - 1 ? styles.detailRowLast : null,
                  { borderBottomColor: colors.border },
                ])}
              >
                <View style={styles.expenseInfo}>
                  <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{expense.description}</Text>
                  <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                    {expense.source === 'TRANSIT_EXPENSE' ? 'Transit expense' : 'Shipment expense'} • {formatDate(expense.date)}
                  </Text>
                </View>
                <View style={StyleSheet.flatten([styles.amountPill, { backgroundColor: `${colors.accent}16`, borderColor: `${colors.accent}32` }])}>
                  <Text style={[styles.amountPillText, { color: colors.accent }]}>{formatCurrency(expense.amount)}</Text>
                </View>
              </View>
            ))
          )}
        </Card>
        ) : null}

        {activeTab === 'company' ? (
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Company Info</Text>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Current Company</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{transit.currentCompany?.name || 'No current company'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Dispatch Date</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatDate(transit.dispatchDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Estimated Delivery</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatDate(transit.estimatedDelivery)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Actual Delivery</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatDate(transit.actualDelivery)}</Text>
          </View>
          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Notes</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{transit.notes || 'No notes added'}</Text>
          </View>
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
  detailRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  detailRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  detailLabel: {
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  detailValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
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
  emptyText: {
    fontSize: Typography.fontSize.base,
    lineHeight: 22,
  },
  itemRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  itemTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  itemMeta: {
    fontSize: Typography.fontSize.sm,
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

export default TransitDetailScreen;