import React from 'react';
import { FlatList, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { customersApi } from '../../api/customers';
import { CustomerCard } from '../../components/admin/CustomerCard';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { SectionHeader } from '../../components/shared/SectionHeader';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../../navigation/AdminNavigator';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList>;

const CustomersScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const navigation = useNavigation<NavigationProp>();
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getCustomers({}, { pageSize: 20 }),
  });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;

  const customers = data?.data || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={customers}
        renderItem={({ item }) => (
          <CustomerCard customer={item} onPress={() => navigation.navigate('CustomerDetail', { id: item.id })} />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <AppTopBar section="Customers" detail="Customer accounts and shipment relationships" />
            <SectionHeader
              title="Customers"
              description="Customer accounts and shipment relationships"
              meta={[{ label: 'Total', value: customers.length }]}
            />
          </>
        }
        ListEmptyComponent={<EmptyState icon="👥" title="No Customers" />}
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

export default CustomersScreen;
