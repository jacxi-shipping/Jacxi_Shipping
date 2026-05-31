import React, { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api/finance';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ModuleSummaryHeader } from '../../components/shared/ModuleSummaryHeader';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const BankingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const bankItemsQuery = useQuery({
    queryKey: ['bank-items'],
    queryFn: () => financeApi.getBankItems(),
  });

  const ledgerQuery = useQuery({
    queryKey: ['banking-ledger'],
    queryFn: () => financeApi.getBankingLedger(),
  });

  const refetchAll = () => {
    void bankItemsQuery.refetch();
    void ledgerQuery.refetch();
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const connectUrl = await financeApi.getConnectUrl();
      await Linking.openURL(connectUrl);
    } catch (error: any) {
      Alert.alert('Unable to connect bank', error?.message || 'Bank connection could not be initialized.');
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const result = await financeApi.syncConnectedAccounts();
      const importedCount = (result.results || []).reduce((sum, item) => sum + (item.importedCount || 0), 0);
      refetchAll();
      Alert.alert('Bank sync complete', importedCount > 0 ? `${importedCount} transactions imported.` : 'No new transactions were available.');
    } catch (error: any) {
      Alert.alert('Unable to sync bank accounts', error?.message || 'Bank sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  if (bankItemsQuery.isLoading || ledgerQuery.isLoading) return <LoadingSpinner fullScreen />;
  if (bankItemsQuery.error) return <ErrorState message={(bankItemsQuery.error as any).message} onRetry={refetchAll} />;
  if (ledgerQuery.error) return <ErrorState message={(ledgerQuery.error as any).message} onRetry={refetchAll} />;

  const bankItems = bankItemsQuery.data?.items || [];
  const bankingConfigured = bankItemsQuery.data?.configured !== false;
  const ledger = ledgerQuery.data;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ModuleSummaryHeader
          eyebrow="FINANCE / BANKING"
          title="Banking"
          subtitle="Connected accounts, imported bank activity, and reconciliation entry points from the existing finance backend."
          stats={[
            { label: 'Connections', value: String(bankItems.length) },
            { label: 'Entries', value: String(ledger?.filteredSummary.entryCount || 0) },
            { label: 'Net Change', value: formatCurrency(ledger?.filteredSummary.netChange || 0) },
          ]}
        />

        <View style={styles.actionRow}>
          <Button title="Connect Bank" onPress={handleConnect} loading={connecting} style={styles.actionButton} />
          <Button title="Sync Accounts" onPress={handleSync} loading={syncing} variant="secondary" style={styles.actionButton} />
        </View>

        {!bankingConfigured ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Finicity Not Configured</Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>The backend reported that live bank connectivity is not configured in this environment. Imported ledger history can still appear below when available.</Text>
          </Card>
        ) : null}

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Connected Accounts</Text>
          {bankItems.length === 0 ? (
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>No connected bank accounts yet.</Text>
          ) : (
            bankItems.map((item, index) => (
              <View
                key={item.id}
                style={StyleSheet.flatten([
                  styles.rowItem,
                  index === bankItems.length - 1 ? styles.rowItemLast : null,
                  { borderBottomColor: colors.border },
                ])}
              >
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{item.institutionName || 'Connected Bank'}</Text>
                <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>Last sync: {item.lastSyncAt ? new Date(item.lastSyncAt).toLocaleString() : 'Never'}</Text>
                {(item.selectedAccounts || []).map((account) => (
                  <Text key={account.accountId} style={[styles.rowMeta, { color: colors.textSecondary }]}>
                    {account.name} {account.mask ? `• ${account.mask}` : ''}
                  </Text>
                ))}
              </View>
            ))
          )}
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Imported Ledger Activity</Text>
          <View style={styles.metricRow}>
            <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(ledger?.filteredSummary.totalDebit || 0)}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Debit</Text>
            </View>
            <View style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(ledger?.filteredSummary.totalCredit || 0)}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Credit</Text>
            </View>
          </View>

          {(ledger?.entries || []).slice(0, 8).map((entry, index) => (
            <View
              key={entry.id}
              style={StyleSheet.flatten([
                styles.rowItem,
                index === Math.min(ledger?.entries.length || 0, 8) - 1 ? styles.rowItemLast : null,
                { borderBottomColor: colors.border },
              ])}
            >
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{entry.description}</Text>
              <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>Balance {formatCurrency(entry.balance)} • {new Date(entry.transactionDate).toLocaleDateString()}</Text>
              <View style={StyleSheet.flatten([styles.amountPill, { backgroundColor: `${colors.accent}16`, borderColor: `${colors.accent}32` }])}>
                <Text style={[styles.amountPillText, { color: colors.accent }]}>{entry.type} {formatCurrency(entry.amount)}</Text>
              </View>
            </View>
          ))}
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Related Finance Routes</Text>
          <View style={styles.linkRow}>
            <Button title="Company Ledgers" variant="secondary" onPress={() => navigation.navigate('CompanyLedgers')} style={styles.linkButton} />
            <Button title="Reports" variant="secondary" onPress={() => navigation.navigate('FinanceReports')} style={styles.linkButton} />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  actionButton: {
    flex: 1,
  },
  linkButton: {
    flex: 1,
  },
  sectionCard: { marginBottom: Spacing.base },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.md,
  },
  sectionText: {
    fontSize: Typography.fontSize.base,
    lineHeight: 22,
  },
  metricRow: {
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
    marginBottom: Spacing.xs,
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
  linkRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});

export default BankingScreen;