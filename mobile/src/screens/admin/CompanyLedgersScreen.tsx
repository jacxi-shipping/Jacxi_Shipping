import React from 'react';
import { FlatList, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api/finance';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ModuleSummaryHeader } from '../../components/shared/ModuleSummaryHeader';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { FinanceCompanySummary } from '../../types/admin';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList>;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const titleCase = (value: string) => value.toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

const CompanyLedgersScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const navigation = useNavigation<NavigationProp>();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['finance-companies'],
    queryFn: () => financeApi.getCompanies(),
  });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;

  const companies = data?.companies || [];
  const totalBalance = companies.reduce((sum, company) => sum + company.currentBalance, 0);
  const totalDebit = companies.reduce((sum, company) => sum + company.totalDebit, 0);
  const totalCredit = companies.reduce((sum, company) => sum + company.totalCredit, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={companies}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: FinanceCompanySummary }) => (
          <Card style={styles.card} pressable onPress={() => navigation.navigate('CompanyLedgerDetail', { id: item.id })}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={[styles.name, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>{titleCase(item.companyType)} • {item.code || 'No code'}</Text>
              </View>
              <View style={StyleSheet.flatten([styles.statePill, { backgroundColor: `${colors.accent}16`, borderColor: `${colors.accent}32` }])}>
                <Text style={[styles.statePillText, { color: colors.accent }]}>{item.isActive ? 'Active' : 'Inactive'}</Text>
              </View>
            </View>
            <Text style={[styles.balance, { color: colors.textPrimary }]}>{formatCurrency(item.currentBalance)}</Text>
            <View style={styles.footerRow}>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>Debit {formatCurrency(item.totalDebit)}</Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>Credit {formatCurrency(item.totalCredit)}</Text>
            </View>
          </Card>
        )}
        ListHeaderComponent={
          <ModuleSummaryHeader
            eyebrow="FINANCE / COMPANY LEDGERS"
            title="Company Ledgers"
            subtitle="Company-specific finance drill-down entry points, backed by the same finance company APIs used on web."
            showBack
            stats={[
              { label: 'Companies', value: String(companies.length) },
              { label: 'Net Balance', value: formatCurrency(totalBalance) },
              { label: 'Debit / Credit', value: `${formatCurrency(totalDebit)} / ${formatCurrency(totalCredit)}` },
            ]}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="CL" title="No Companies" description="No finance companies are available for ledger drill-down yet." />}
        onRefresh={refetch}
        refreshing={isLoading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
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
  balance: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.sm,
  },
  footerRow: {
    gap: Spacing.xs,
  },
  meta: {
    fontSize: Typography.fontSize.sm,
  },
});

export default CompanyLedgersScreen;