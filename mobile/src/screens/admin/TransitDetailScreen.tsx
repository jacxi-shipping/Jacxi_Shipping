import React from 'react';
import { ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { transitsApi } from '../../api/transits';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ModuleSummaryHeader } from '../../components/shared/ModuleSummaryHeader';
import { Colors } from '../../constants/colors';
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
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['transit', route.params.id],
    queryFn: () => transitsApi.getTransit(route.params.id),
  });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;
  if (!data?.transit) return <ErrorState message="Transit not found" />;

  const { transit, totalExpenses } = data;

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
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Route Snapshot</Text>
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
          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Notes</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{transit.notes || 'No notes added'}</Text>
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Events</Text>
          {transit.events.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No transit events recorded yet.</Text>
          ) : (
            transit.events.slice(0, 5).map((event, index) => (
              <View
                key={event.id}
                style={StyleSheet.flatten([
                  styles.itemRow,
                  index === transit.events.slice(0, 5).length - 1 ? styles.detailRowLast : null,
                  { borderBottomColor: colors.border },
                ])}
              >
                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{event.origin} to {event.destination}</Text>
                <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                  {titleCase(event.status)} • {event.company?.name || 'No company'}
                </Text>
              </View>
            ))
          )}
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Linked Shipments</Text>
          {transit.shipments.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No shipments linked to this transit.</Text>
          ) : (
            transit.shipments.slice(0, 6).map((shipment, index) => (
              <View
                key={shipment.id}
                style={StyleSheet.flatten([
                  styles.itemRow,
                  index === transit.shipments.slice(0, 6).length - 1 ? styles.detailRowLast : null,
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

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Expense Activity</Text>
          {transit.expenses.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No transit expenses recorded.</Text>
          ) : (
            transit.expenses.slice(0, 6).map((expense, index) => (
              <View
                key={expense.id}
                style={StyleSheet.flatten([
                  styles.itemRow,
                  index === transit.expenses.slice(0, 6).length - 1 ? styles.detailRowLast : null,
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