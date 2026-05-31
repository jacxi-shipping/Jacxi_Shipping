import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../../api/settings';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Colors } from '../../constants/colors';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

const titleCase = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

const SystemToolsScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const settingsQuery = useQuery({
    queryKey: ['user-settings'],
    queryFn: () => settingsApi.getSettings(),
  });

  const callAgentQuery = useQuery({
    queryKey: ['call-agent-settings'],
    queryFn: () => settingsApi.getCallAgentSettings(),
  });

  const aiLogsQuery = useQuery({
    queryKey: ['ai-logs-preview'],
    queryFn: () => settingsApi.getAiLogs(20),
  });

  if (settingsQuery.isLoading || callAgentQuery.isLoading || aiLogsQuery.isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (settingsQuery.error) {
    return <ErrorState message={(settingsQuery.error as any).message} onRetry={settingsQuery.refetch} />;
  }

  if (callAgentQuery.error) {
    return <ErrorState message={(callAgentQuery.error as any).message} onRetry={callAgentQuery.refetch} />;
  }

  if (aiLogsQuery.error) {
    return <ErrorState message={(aiLogsQuery.error as any).message} onRetry={aiLogsQuery.refetch} />;
  }

  const settings = settingsQuery.data?.settings;
  const callAgent = callAgentQuery.data;
  const logs = aiLogsQuery.data?.logs || [];
  const aiSummary = useMemo(
    () => ({
      total: logs.length,
      success: logs.filter((log) => log.status === 'SUCCESS').length,
      fallback: logs.filter((log) => log.status === 'FALLBACK').length,
    }),
    [logs],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppTopBar section="System Tools" detail="Admin settings, call-agent readiness, and AI activity" showBack />

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Preferences Snapshot</Text>
          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{titleCase(settings?.theme || 'default')}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Theme</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{(settings?.language || 'en').toUpperCase()}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Language</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{settings?.twoFactorEnabled ? 'On' : 'Off'}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>2FA</Text>
            </View>
          </View>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>Notifications: {settings?.notifyShipmentEmail ? 'Email' : 'No email'} • {settings?.notifyShipmentPush ? 'Push' : 'No push'} • {settings?.notifyCriticalSms ? 'Critical SMS' : 'SMS off'}</Text>
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Call Agent Readiness</Text>
          <View style={styles.badgeRow}>
            <View style={StyleSheet.flatten([styles.badge, { backgroundColor: `${colors.accent}14`, borderColor: `${colors.accent}30` }])}>
              <Text style={[styles.badgeText, { color: colors.accent }]}>Twilio {callAgent?.status.twilioConfigured ? 'Ready' : 'Missing'}</Text>
            </View>
            <View style={StyleSheet.flatten([styles.badge, { backgroundColor: `${colors.info}14`, borderColor: `${colors.info}30` }])}>
              <Text style={[styles.badgeText, { color: colors.info }]}>Gemini Live {callAgent?.status.geminiLiveConfigured ? 'Ready' : 'Missing'}</Text>
            </View>
          </View>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>Webhook: {callAgent?.urls.webhookUrl || 'Unavailable'}</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>Websocket: {callAgent?.urls.websocketUrl || 'Unavailable'}</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>Twilio auth mode: {titleCase(callAgent?.status.twilioAuthMode || 'missing')}</Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>Webhook inspection: {callAgent?.twilioInspection.matchesExpectedWebhook === true ? 'Twilio number matches expected webhook.' : callAgent?.twilioInspection.error || 'Inspection pending.'}</Text>
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>AI Activity</Text>
          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{aiSummary.total}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Recent Logs</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{aiSummary.success}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Success</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{aiSummary.fallback}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Fallback</Text>
            </View>
          </View>
          {logs.length === 0 ? (
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>No AI logs were returned for this environment.</Text>
          ) : (
            logs.slice(0, 6).map((log, index) => (
              <View
                key={log.id}
                style={StyleSheet.flatten([
                  styles.logRow,
                  index === Math.min(logs.length, 6) - 1 ? styles.logRowLast : null,
                  { borderBottomColor: colors.border },
                ])}
              >
                <Text style={[styles.logFeature, { color: colors.textPrimary }]}>{log.feature}</Text>
                <Text style={[styles.logMeta, { color: colors.textSecondary }]}>{log.provider} • {log.status} • {new Date(log.createdAt).toLocaleString()}</Text>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  eyebrow: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.bold, letterSpacing: 1.1, marginBottom: Spacing.xs },
  title: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
  subtitle: { fontSize: Typography.fontSize.sm, lineHeight: 20, marginBottom: Spacing.base },
  sectionCard: { marginBottom: Spacing.base },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.base },
  sectionText: { fontSize: Typography.fontSize.sm, lineHeight: 20, marginBottom: Spacing.sm },
  metricRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  metricItem: { flex: 1, padding: Spacing.sm, borderRadius: BorderRadius.base, backgroundColor: 'transparent' },
  metricValue: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
  metricLabel: { fontSize: Typography.fontSize.xs },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.base },
  badge: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.base, paddingVertical: Spacing.xs },
  badgeText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.bold },
  logRow: { borderBottomWidth: 1, paddingVertical: Spacing.sm },
  logRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  logFeature: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.xs },
  logMeta: { fontSize: Typography.fontSize.xs },
});

export default SystemToolsScreen;