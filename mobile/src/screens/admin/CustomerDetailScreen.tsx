import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { customersApi } from '../../api/customers';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/shared/ErrorState';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Divider } from '../../components/ui/Divider';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { AdminStackParamList } from '../../navigation/AdminNavigator';

type RouteProps = RouteProp<AdminStackParamList, 'CustomerDetail'>;

const CustomerDetailScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const route = useRoute<RouteProps>();
  
  const { data: customer, isLoading, error, refetch } = useQuery({
    queryKey: ['customer', route.params.id],
    queryFn: () => customersApi.getCustomer(route.params.id),
  });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;
  if (!customer) return <ErrorState message="Customer not found" />;

  const addressLines = [
    customer.address?.street,
    [customer.address?.city, customer.address?.state, customer.address?.zipCode].filter(Boolean).join(' ').trim(),
    customer.address?.country,
  ].filter(Boolean) as string[];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppTopBar section="Customer Details" detail={customer.email} showBack />

        <Card style={styles.profileCard}>
          <Avatar name={customer.name} size={80} />
          <Text style={[styles.name, { color: colors.textPrimary }]}>{customer.name}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{customer.email}</Text>
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Statistics</Text>
          <Divider />
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{customer.totalShipments}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Shipments</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{customer.activeShipments}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: customer.balance > 0 ? colors.error : colors.success }]}>
                ${Math.abs(customer.balance).toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Balance</Text>
            </View>
          </View>
        </Card>

        {customer.address && (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Address</Text>
            <Divider />
            <Text style={[styles.addressText, { color: colors.textSecondary }]}>{addressLines.join('\n')}</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base },
  profileCard: { alignItems: 'center' },
  name: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, marginTop: Spacing.base, marginBottom: Spacing.xs },
  email: { fontSize: Typography.fontSize.base },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.md },
  stats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
  statLabel: { fontSize: Typography.fontSize.sm },
  addressText: { fontSize: Typography.fontSize.base, lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base },
});

export default CustomerDetailScreen;
