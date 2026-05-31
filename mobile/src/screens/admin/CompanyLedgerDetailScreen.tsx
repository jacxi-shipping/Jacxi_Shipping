import React from 'react';
import { ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
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
import { AdminStackParamList } from '../../navigation/AdminNavigator';

type RouteProps = RouteProp<AdminStackParamList, 'CompanyLedgerDetail'>;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const formatDate = (value?: string | null) => {
  if (!value) {
    return 'Not set';
  }

  return new Date(value).toLocaleDateString();
};

const titleCase = (value: string) =>
  value.toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

const CompanyLedgerDetailScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<any>();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const companyQuery = useQuery({
    queryKey: ['finance-company', route.params.id],
    queryFn: () => financeApi.getCompany(route.params.id),
  });

  const ledgerQuery = useQuery({
    queryKey: ['finance-company-ledger', route.params.id],
    queryFn: () => financeApi.getCompanyLedger(route.params.id),
  });

  const refetchAll = () => {
    void companyQuery.refetch();
    void ledgerQuery.refetch();
  };

  if (companyQuery.isLoading || ledgerQuery.isLoading) return <LoadingSpinner fullScreen />;
  if (companyQuery.error) return <ErrorState message={(companyQuery.error as any).message} onRetry={refetchAll} />;
  if (ledgerQuery.error) return <ErrorState message={(ledgerQuery.error as any).message} onRetry={refetchAll} />;
  if (!companyQuery.data?.company) return <ErrorState message="Company not found" />;

  const { company, summary } = companyQuery.data;
  const entries = ledgerQuery.data?.entries || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ModuleSummaryHeader
          eyebrow="FINANCE / COMPANY LEDGERS"
          title={company.name}
          subtitle={`${titleCase(company.companyType)} company finance drill-down and recent ledger activity.`}
          stats={[
            { label: 'Balance', value: formatCurrency(summary.currentBalance) },
            { label: 'Debit', value: formatCurrency(summary.totalDebit) },
            { label: 'Credit', value: formatCurrency(summary.totalCredit) },
          ]}
        />

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Company Profile</Text>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Code</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{company.code || 'Not set'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Contact</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{company.email || company.phone || 'No contact saved'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Country</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{company.country || 'Not set'}</Text>
          </View>
          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Expense Recovery</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatCurrency(summary.totalExpenseCharges)}</Text>
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Operational Links</Text>
          <View style={styles.metricsRow}>
            <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{company._count.transits}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Transits</Text>
            </View>
            <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{company._count.dispatches}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Dispatches</Text>
            </View>
            <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{company._count.containers}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Containers</Text>
            </View>
          </View>

          {company.transits && company.transits.length > 0 ? (
            <View style={styles.linkedList}>
              {company.transits.slice(0, 4).map((transit) => (
                <Card
                  key={transit.id}
                  style={styles.linkedCard}
                  pressable
                  onPress={() => navigation.navigate('TransitDetail', { id: transit.id })}
                >
                  <Text style={[styles.linkedTitle, { color: colors.textPrimary }]}>{transit.referenceNumber}</Text>
                  <Text style={[styles.linkedMeta, { color: colors.textSecondary }]}>
                    {transit.origin} to {transit.destination} • {transit._count.shipments} shipments
                  </Text>
                </Card>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No linked transits for this company yet.</Text>
          )}
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Ledger Entries</Text>
          {entries.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No ledger entries recorded yet.</Text>
          ) : (
            entries.slice(0, 8).map((entry, index) => (
              <View
                key={entry.id}
                style={StyleSheet.flatten([
                  styles.entryRow,
                  index === entries.slice(0, 8).length - 1 ? styles.detailRowLast : null,
                  { borderBottomColor: colors.border },
                ])}
              >
                <View style={styles.entryInfo}>
                  <Text style={[styles.entryTitle, { color: colors.textPrimary }]}>{entry.description}</Text>
                  <Text style={[styles.entryMeta, { color: colors.textSecondary }]}>
                    {entry.type} • {formatDate(entry.transactionDate)} • Balance {formatCurrency(entry.balance)}
                  </Text>
                </View>
                <View style={StyleSheet.flatten([styles.amountPill, { backgroundColor: `${colors.accent}16`, borderColor: `${colors.accent}32` }])}>
                  <Text style={[styles.amountPillText, { color: colors.accent }]}>{formatCurrency(entry.amount)}</Text>
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
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
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
  linkedList: {
    gap: Spacing.sm,
  },
  linkedCard: {
    marginBottom: Spacing.sm,
  },
  linkedTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  linkedMeta: {
    fontSize: Typography.fontSize.sm,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    lineHeight: 22,
  },
  entryRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  entryInfo: {
    flex: 1,
  },
  entryTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  entryMeta: {
    fontSize: Typography.fontSize.sm,
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

export default CompanyLedgerDetailScreen;