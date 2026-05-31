import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api/finance';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ModuleSummaryHeader } from '../../components/shared/ModuleSummaryHeader';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { FinancialReportType } from '../../types/admin';

const reportOptions: Array<{ label: string; value: FinancialReportType }> = [
  { label: 'Summary', value: 'summary' },
  { label: 'User Wise', value: 'user-wise' },
  { label: 'Shipment Wise', value: 'shipment-wise' },
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const titleCase = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

const FinanceReportsScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const [reportType, setReportType] = useState<FinancialReportType>('summary');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['finance-report', reportType],
    queryFn: () => financeApi.getFinancialReport({ type: reportType }),
  });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;

  const summaryStats = data?.reportType === 'summary'
    ? [
        { label: 'Net Balance', value: formatCurrency(data.ledgerSummary?.netBalance || 0) },
        { label: 'Active Dispatches', value: String(data.dispatchSummary?.activeCount || 0) },
        { label: 'Tracked Users', value: String(data.userBalances?.length || 0) },
      ]
    : data?.reportType === 'user-wise'
    ? [
        { label: 'Users', value: String(data.users?.length || 0) },
        { label: 'Scope', value: 'User Ledger' },
      ]
    : [
        { label: 'Shipments', value: String(data?.summary?.shipmentCount || 0) },
        { label: 'Revenue', value: formatCurrency(data?.summary?.totalRevenue || 0) },
        { label: 'Profit', value: formatCurrency(data?.summary?.totalProfit || 0) },
      ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ModuleSummaryHeader
          eyebrow="FINANCE / REPORTS"
          title="Financial Reports"
          subtitle="Mobile access to the web financial report feeds for summary, user-wise, and shipment-wise reporting."
          stats={summaryStats}
        />

        <View style={styles.switcherRow}>
          {reportOptions.map((option) => {
            const selected = option.value === reportType;
            return (
              <TouchableOpacity
                key={option.value}
                activeOpacity={0.85}
                style={StyleSheet.flatten([
                  styles.switcherChip,
                  {
                    backgroundColor: selected ? `${colors.accent}18` : colors.panel,
                    borderColor: selected ? `${colors.accent}35` : colors.border,
                  },
                ])}
                onPress={() => setReportType(option.value)}
              >
                <Text style={[styles.switcherChipText, { color: selected ? colors.accent : colors.textPrimary }]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {data?.reportType === 'summary' ? (
          <>
            <Card style={styles.sectionCard}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Ledger Summary</Text>
              <View style={styles.metricRow}>
                <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
                  <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(data.ledgerSummary?.totalDebit || 0)}</Text>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Debit</Text>
                </View>
                <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
                  <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(data.ledgerSummary?.totalCredit || 0)}</Text>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Credit</Text>
                </View>
              </View>
            </Card>

            <Card style={styles.sectionCard}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Shipment Summary</Text>
              {(data.shipmentSummary || []).map((item, index) => (
                <View
                  key={`${item.status}-${index}`}
                  style={StyleSheet.flatten([
                    styles.rowItem,
                    index === (data.shipmentSummary || []).length - 1 ? styles.rowItemLast : null,
                    { borderBottomColor: colors.border },
                  ])}
                >
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{titleCase(item.status)}</Text>
                  <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>{item.count} shipments • {formatCurrency(item.totalAmount)}</Text>
                </View>
              ))}
            </Card>

            <Card>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>User Balances</Text>
              {(data.userBalances || []).slice(0, 8).map((item, index) => (
                <View
                  key={item.userId}
                  style={StyleSheet.flatten([
                    styles.rowItem,
                    index === Math.min((data.userBalances || []).length, 8) - 1 ? styles.rowItemLast : null,
                    { borderBottomColor: colors.border },
                  ])}
                >
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{item.userName}</Text>
                  <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>{formatCurrency(item.currentBalance)}</Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {data?.reportType === 'user-wise' ? (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Users</Text>
            {(data.users || []).map((item, index) => (
              <View
                key={item.userId}
                style={StyleSheet.flatten([
                  styles.rowItem,
                  index === (data.users || []).length - 1 ? styles.rowItemLast : null,
                  { borderBottomColor: colors.border },
                ])}
              >
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{item.userName}</Text>
                <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                  {formatCurrency(item.currentBalance)} • {item.shipmentStats.total} shipments
                </Text>
              </View>
            ))}
          </Card>
        ) : null}

        {data?.reportType === 'shipment-wise' ? (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Shipments</Text>
            {(data.shipments || []).slice(0, 10).map((item, index) => (
              <View
                key={item.shipmentId}
                style={StyleSheet.flatten([
                  styles.rowItem,
                  index === Math.min((data.shipments || []).length, 10) - 1 ? styles.rowItemLast : null,
                  { borderBottomColor: colors.border },
                ])}
              >
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{item.vehicle}</Text>
                <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                  {titleCase(item.paymentStatus)} • Revenue {formatCurrency(item.revenue)} • Profit {formatCurrency(item.profit)}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  switcherRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  switcherChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  switcherChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  sectionCard: { marginBottom: Spacing.base },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.md,
  },
  metricRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
  },
  metricValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  metricLabel: {
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  rowItem: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  rowItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  rowTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  rowMeta: {
    fontSize: Typography.fontSize.sm,
  },
});

export default FinanceReportsScreen;