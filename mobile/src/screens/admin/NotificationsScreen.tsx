import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotifications, useMarkNotificationAsRead } from '../../hooks/useNotifications';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { format } from 'date-fns';
import { Notification } from '../../types/api';

const NotificationsScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const { data, isLoading, error, refetch } = useNotifications();
  const markAsRead = useMarkNotificationAsRead();

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;

  const notifications = data?.data || [];
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const errorCount = notifications.filter((notification) => notification.type === 'ERROR').length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={notifications}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleNotificationPress(item)}>
            <Card style={[styles.card, !item.read && { borderLeftWidth: 3, borderLeftColor: colors.accent }]}>
              <View style={styles.header}>
                <Badge label={item.type} variant={item.type === 'ERROR' ? 'error' : 'info'} size="sm" />
                <Text style={[styles.date, { color: colors.textTertiary }]}>
                  {format(new Date(item.createdAt), 'MMM d, h:mm a')}
                </Text>
              </View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{item.title}</Text>
              <Text style={[styles.message, { color: colors.textSecondary }]}>{item.message}</Text>
            </Card>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <AppTopBar section="Notifications" detail="Recent system updates and workflow alerts" showBack hideNotifications />
            <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Alert Snapshot</Text>
            <View style={styles.metricRow}>
              <Card style={[styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{notifications.length}</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Visible</Text>
              </Card>
              <Card style={[styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{unreadCount}</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Unread</Text>
              </Card>
              <Card style={[styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{errorCount}</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Errors</Text>
              </Card>
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState icon="notifications" title="No Notifications" />}
        onRefresh={refetch}
        refreshing={isLoading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.base },
  headerBlock: { marginBottom: Spacing.sm },
  sectionEyebrow: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.xs },
  metricRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  metricCard: { flex: 1, paddingVertical: Spacing.base, borderWidth: 1 },
  metricValue: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold, textAlign: 'center' },
  metricLabel: { fontSize: Typography.fontSize.xs, textAlign: 'center', marginTop: Spacing.xs, textTransform: 'uppercase', letterSpacing: 0.8 },
  card: { marginBottom: Spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  date: { fontSize: Typography.fontSize.xs },
  title: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.xs },
  message: { fontSize: Typography.fontSize.sm },
});

export default NotificationsScreen;
