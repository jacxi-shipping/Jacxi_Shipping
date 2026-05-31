import React, { useState } from 'react';
import { View, StyleSheet, FlatList, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShipments } from '../../hooks/useShipments';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { SectionHeader } from '../../components/shared/SectionHeader';
import { ShipmentCard } from '../../components/shared/ShipmentCard';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../../navigation/AdminNavigator';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList>;

const ShipmentsScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const navigation = useNavigation<NavigationProp>();
  const [search, setSearch] = useState('');
  
  const { data, isLoading, error, refetch } = useShipments({ search }, { pageSize: 20 });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;

  const shipments = data?.data || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.content}>
        <AppTopBar section="Shipments" detail="Search, create, and manage shipment records" />

        <SectionHeader
          title="Shipments"
          description="Search, filter, and manage all shipment records"
          meta={[{ label: 'Results', value: shipments.length }]}
          action={
            <Button
              title="+ New"
              size="sm"
              onPress={() => navigation.navigate('ShipmentCreate')}
            />
          }
        />

        <Input
          placeholder="Search by VIN, vehicle, or customer…"
          value={search}
          onChangeText={setSearch}
          containerStyle={styles.search}
        />
        
        <FlatList
          data={shipments}
          renderItem={({ item }) => (
            <ShipmentCard
              shipment={item}
              onPress={() => navigation.navigate('ShipmentDetail', { id: item.id })}
              showCustomer
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="📦" title="No Shipments Found" />}
          onRefresh={refetch}
          refreshing={isLoading}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: Spacing.base },
  search: { marginBottom: Spacing.sm },
  list: { paddingBottom: Spacing.xl },
});

export default ShipmentsScreen;
