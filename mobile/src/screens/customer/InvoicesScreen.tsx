import React from 'react';
import { View, StyleSheet, FlatList, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInvoices } from '../../hooks/useInvoices';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { InvoiceCard } from '../../components/customer/InvoiceCard';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';

const InvoicesScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const { data, isLoading, error, refetch } = useInvoices({}, { pageSize: 20 });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;

  const invoices = data?.invoices || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={invoices}
        renderItem={({ item }) => <InvoiceCard invoice={item} onPress={() => {}} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState icon="💵" title="No Invoices" description="Your invoices will appear here" />
        }
        onRefresh={refetch}
        refreshing={isLoading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.base },
});

export default InvoicesScreen;
