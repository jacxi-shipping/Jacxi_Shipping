import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInvoices } from '../../hooks/useInvoices';
import { ErrorState } from '../../components/shared/ErrorState';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { InvoiceCard } from '../../components/customer/InvoiceCard';
import { Colors } from '../../constants/colors';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

const statusOptions = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Overdue', value: 'OVERDUE' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Draft', value: 'DRAFT' },
] as const;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const InvoicesScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<(typeof statusOptions)[number]['value']>('all');

  const { data, isLoading, error, refetch } = useInvoices(
    {
      search: search || undefined,
      status: status === 'all' ? undefined : status,
    },
    { pageSize: 50 },
  );

  const invoices = data?.invoices || [];
  const summary = useMemo(
    () => ({
      total: invoices.length,
      dueAmount: invoices.reduce((sum, invoice) => sum + invoice.amountDue, 0),
      overdueCount: invoices.filter((invoice) => invoice.status === 'OVERDUE').length,
      paidAmount: invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0),
    }),
    [invoices],
  );

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppTopBar section="Invoices" detail="Outstanding balances, filters, and billing health" />

        <Text style={[styles.title, { color: colors.textPrimary }]}>Invoices</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Review invoice status, outstanding balances, and customer billing context from the live invoice backend.</Text>
        <Input value={search} onChangeText={setSearch} placeholder="Search by invoice, customer, or shipment" />

        <View style={styles.filterRow}>
          {statusOptions.map((option) => {
            const selected = option.value === status;
            return (
              <TouchableOpacity
                key={option.value}
                activeOpacity={0.85}
                style={StyleSheet.flatten([
                  styles.filterChip,
                  {
                    backgroundColor: selected ? `${colors.accent}18` : colors.panel,
                    borderColor: selected ? `${colors.accent}35` : colors.border,
                  },
                ])}
                onPress={() => setStatus(option.value)}
              >
                <Text style={[styles.filterChipText, { color: selected ? colors.accent : colors.textPrimary }]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.metricRow}>
          <Card style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{summary.total}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Visible</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{summary.overdueCount}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Overdue</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(summary.dueAmount)}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Due</Text>
          </Card>
        </View>

        {invoices.length === 0 ? (
          <Card>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No invoices matched the current filters.</Text>
          </Card>
        ) : (
          invoices.map((invoice) => (
            <Card key={invoice.id} style={styles.invoiceCard}>
              <InvoiceCard invoice={invoice} onPress={() => {}} />
              <Text style={[styles.invoiceMeta, { color: colors.textSecondary }]}>
                {invoice.customerName || invoice.customerEmail || 'Unknown customer'}
                {invoice.shipmentId ? ` • Shipment ${invoice.shipmentId.slice(0, 8)}` : ''}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  title: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
  subtitle: { fontSize: Typography.fontSize.sm, lineHeight: 20, marginBottom: Spacing.base },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.base },
  filterChip: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  filterChipText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
  metricRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.base },
  metricCard: { flex: 1, paddingVertical: Spacing.base },
  metricValue: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, textAlign: 'center' },
  metricLabel: { fontSize: Typography.fontSize.xs, textAlign: 'center', marginTop: Spacing.xs },
  invoiceCard: { marginBottom: Spacing.sm },
  invoiceMeta: { fontSize: Typography.fontSize.xs, marginTop: Spacing.sm },
  emptyText: { fontSize: Typography.fontSize.sm },
});
export default InvoicesScreen;
