import React from 'react';
import { View, Text, StyleSheet, FlatList, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { containersApi } from '../../api/containers';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { Container } from '../../types/container';

const ContainersScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['containers'],
    queryFn: () => containersApi.getContainers({}, { pageSize: 20 }),
  });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;

  const containers = data?.data || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={containers}
        renderItem={({ item }: { item: Container }) => (
          <Card style={styles.card} pressable>
            <View style={styles.header}>
              <Text style={[styles.number, { color: colors.textPrimary }]}>{item.containerNumber}</Text>
              <Text style={[styles.count, { color: colors.textSecondary }]}>
                {item.currentLoad}/{item.capacity}
              </Text>
            </View>
            <Text style={[styles.type, { color: colors.textSecondary }]}>
              {item.type} - {item.size}
            </Text>
          </Card>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="🚢" title="No Containers" />}
        onRefresh={refetch}
        refreshing={isLoading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.base },
  card: { marginBottom: Spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  number: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold },
  count: { fontSize: Typography.fontSize.base },
  type: { fontSize: Typography.fontSize.sm },
});

export default ContainersScreen;
