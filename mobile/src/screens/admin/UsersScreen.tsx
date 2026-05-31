import React from 'react';
import { FlatList, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../../api/users';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ModuleSummaryHeader } from '../../components/shared/ModuleSummaryHeader';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { AdminUserSummary } from '../../types/admin';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList>;

const titleCase = (value: string) =>
  value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

const UsersScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const navigation = useNavigation<NavigationProp>();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => usersApi.getUsers({ roleType: 'users' }, { pageSize: 20 }),
  });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;

  const users = data?.users || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: AdminUserSummary }) => (
          <Card style={styles.card} pressable onPress={() => navigation.navigate('UserDetail', { id: item.id })}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={[styles.name, { color: colors.textPrimary }]}>{item.name || 'Unnamed User'}</Text>
                <Text style={[styles.email, { color: colors.textSecondary }]}>{item.email}</Text>
              </View>
              <View style={StyleSheet.flatten([styles.rolePill, { backgroundColor: `${colors.accent}16`, borderColor: `${colors.accent}32` }])}>
                <Text style={[styles.rolePillText, { color: colors.accent }]}>{titleCase(item.role)}</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <View style={[styles.metaChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Shipments</Text>
                <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{item._count?.shipments ?? 0}</Text>
              </View>
              <View style={[styles.metaChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Created</Text>
                <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Unknown'}</Text>
              </View>
            </View>
          </Card>
        )}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <ModuleSummaryHeader
              eyebrow="ADMIN / USERS"
              title="Users"
              subtitle="Real internal-user list parity for the web Users module, with direct mobile access to role and account detail."
              showBack
              stats={[
                { label: 'Total Users', value: String(data?.total || 0) },
                { label: 'Admins', value: String(data?.admins || 0) },
                { label: 'Other Roles', value: String(data?.regularUsers || 0) },
              ]}
            />
            <Button title="Create User" onPress={() => navigation.navigate('UserCreate')} fullWidth />
          </View>
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="US" title="No Users" description="No internal users matched this module yet." />}
        onRefresh={refetch}
        refreshing={isLoading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  headerWrap: { marginBottom: Spacing.base },
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
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  email: {
    fontSize: Typography.fontSize.sm,
  },
  rolePill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  rolePillText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metaChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
  },
  metaLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  metaValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default UsersScreen;