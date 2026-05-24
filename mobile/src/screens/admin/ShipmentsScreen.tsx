import React, { useState } from 'react';
import { View, StyleSheet, FlatList, useColorScheme, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShipments } from '../../hooks/useShipments';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { ShipmentCard } from '../../components/shared/ShipmentCard';
import { Input } from '../../components/ui/Input';
import { Colors } from '../../constants/colors';
import { Spacing, Typography } from '../../constants/spacing';
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
        <View style={styles.header}>
          <Input placeholder="Search shipments..." value={search} onChangeText={setSearch} containerStyle={styles.search} />
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.accent }]}
            onPress={() => navigation.navigate('ShipmentCreate')}
          >
            <Text style={styles.addButtonText}>+ New</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={shipments}
          renderItem={({ item }) => (
            <ShipmentCard shipment={item} onPress={() => navigation.navigate('ShipmentDetail', { id: item.id })} showCustomer />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="📦" title="No Shipments Found" />}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: Spacing.base },
  header: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.base },
  search: { flex: 1, marginBottom: 0 },
  addButton: { paddingHorizontal: Spacing.base, borderRadius: 8, justifyContent: 'center' },
  addButtonText: { color: '#1C1C1E', fontWeight: '600' },
  list: { paddingBottom: Spacing.xl },
});

export default ShipmentsScreen;
