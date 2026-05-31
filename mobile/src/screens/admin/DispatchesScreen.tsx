import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { dispatchesApi } from '../../api/dispatches';
import { containersApi } from '../../api/containers';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Input } from '../../components/ui/Input';
import { Colors } from '../../constants/colors';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { ContainerStatus } from '../../types/container';
import { DispatchStatus } from '../../types/dispatch';

const statusOptions: Array<{ label: string; value: 'all' | DispatchStatus }> = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Dispatched', value: 'DISPATCHED' },
  { label: 'At Port', value: 'ARRIVED_AT_PORT' },
  { label: 'Completed', value: 'COMPLETED' },
];

const titleCase = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

const formatCurrency = (amount?: number | null) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const eligibleContainerStatuses: ContainerStatus[] = ['CREATED', 'WAITING_FOR_LOADING', 'LOADED', 'IN_TRANSIT'];

const DispatchesScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | DispatchStatus>('all');
  const [activeDispatchId, setActiveDispatchId] = useState<string | null>(null);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [submittingAction, setSubmittingAction] = useState<'handoff' | 'receive' | null>(null);

  const query = useQuery({
    queryKey: ['dispatches', search, status],
    queryFn: () =>
      dispatchesApi.getDispatches({
        search: search || undefined,
        status: status === 'all' ? undefined : status,
      }),
  });

  const activeDispatchQuery = useQuery({
    queryKey: ['dispatch', activeDispatchId],
    queryFn: () => dispatchesApi.getDispatch(activeDispatchId as string),
    enabled: Boolean(activeDispatchId),
  });

  const containersQuery = useQuery({
    queryKey: ['dispatch-handoff-containers'],
    queryFn: () => containersApi.getContainers({}, { pageSize: 50 }),
  });

  const dispatches = query.data?.dispatches || [];
  const availableContainers = (containersQuery.data?.containers || []).filter(
    (container) => eligibleContainerStatuses.includes(container.status) && container.company,
  );
  const activeDispatch = activeDispatchQuery.data;
  const eligibleShipments = useMemo(
    () =>
      (activeDispatch?.shipments || []).filter(
        (shipment) =>
          shipment.dispatchId === activeDispatch?.id &&
          !shipment.containerId &&
          !shipment.transitId &&
          shipment.status === 'DISPATCHING',
      ),
    [activeDispatch],
  );
  const summary = useMemo(
    () => ({
      total: dispatches.length,
      active: dispatches.filter((dispatch) => ['PENDING', 'DISPATCHED', 'ARRIVED_AT_PORT'].includes(dispatch.status)).length,
      shipments: dispatches.reduce((sum, dispatch) => sum + dispatch._count.shipments, 0),
    }),
    [dispatches],
  );

  const refreshAll = async () => {
    await query.refetch();
    if (activeDispatchId) {
      await activeDispatchQuery.refetch();
    }
    await containersQuery.refetch();
  };

  const handleReceive = (dispatchId: string) => {
    Alert.alert('Receive dispatch', 'Receive all active dispatch shipments back to yard?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Receive',
        onPress: async () => {
          try {
            setSubmittingAction('receive');
            await dispatchesApi.receiveDispatch(dispatchId);
            await refreshAll();
            Alert.alert('Dispatch received', 'The dispatch shipments were received to yard.');
          } catch (error: any) {
            Alert.alert('Unable to receive dispatch', error?.message || 'The dispatch could not be received to yard.');
          } finally {
            setSubmittingAction(null);
          }
        },
      },
    ]);
  };

  const handleHandoff = (dispatchId: string) => {
    if (!selectedContainerId || eligibleShipments.length === 0) {
      return;
    }

    const selectedContainer = availableContainers.find((container) => container.id === selectedContainerId);
    Alert.alert(
      'Handoff to container',
      `Move ${eligibleShipments.length} shipment${eligibleShipments.length === 1 ? '' : 's'} from this dispatch into ${selectedContainer?.containerNumber || 'the selected container'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Handoff',
          onPress: async () => {
            try {
              setSubmittingAction('handoff');
              await dispatchesApi.handoffDispatch(dispatchId, {
                containerId: selectedContainerId,
                shipmentIds: eligibleShipments.map((shipment) => shipment.id),
              });
              await refreshAll();
              setSelectedContainerId(null);
              Alert.alert('Dispatch handed off', 'The selected shipments were handed off to the container.');
            } catch (error: any) {
              Alert.alert('Unable to hand off dispatch', error?.message || 'The dispatch handoff could not be completed.');
            } finally {
              setSubmittingAction(null);
            }
          },
        },
      ],
    );
  };

  if (query.isLoading) return <LoadingSpinner fullScreen />;
  if (query.error) return <ErrorState message={(query.error as any).message} onRetry={query.refetch} />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppTopBar section="Dispatches" detail="Batch workflow, handoff, and receive actions" showBack />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Dispatches</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Monitor dispatch workflow batches, linked shipment counts, and route progress from the live dispatch backend.</Text>
        <Input value={search} onChangeText={setSearch} placeholder="Search by reference, notes, or shipment VIN" />

        <View style={styles.filterRow}>
          {statusOptions.map((option) => {
            const selected = option.value === status;
            return (
              <TouchableOpacity
                key={option.value}
                activeOpacity={0.85}
                style={StyleSheet.flatten([
                  styles.filterChip,
                  {
                    backgroundColor: selected ? `${colors.accent}18` : colors.panel,
                    borderColor: selected ? `${colors.accent}35` : colors.border,
                  },
                ])}
                onPress={() => setStatus(option.value)}
              >
                <Text style={[styles.filterChipText, { color: selected ? colors.accent : colors.textPrimary }]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.metricRow}>
          <Card style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{summary.total}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Visible</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{summary.active}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Active</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{summary.shipments}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Shipments</Text>
          </Card>
        </View>

        {dispatches.length === 0 ? (
          <Card>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No dispatches matched the current filters.</Text>
          </Card>
        ) : (
          dispatches.map((dispatch) => (
            <Card key={dispatch.id} style={styles.dispatchCard}>
              <View style={styles.cardHeader}>
                <Text style={[styles.reference, { color: colors.textPrimary }]}>{dispatch.referenceNumber}</Text>
                <View style={StyleSheet.flatten([styles.statusPill, { backgroundColor: `${colors.accent}12`, borderColor: `${colors.accent}30` }])}>
                  <Text style={[styles.statusPillText, { color: colors.accent }]}>{titleCase(dispatch.status)}</Text>
                </View>
              </View>
              <Text style={[styles.routeText, { color: colors.textSecondary }]}>{dispatch.origin} -> {dispatch.destination}</Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                {dispatch.company?.name || 'Dispatch company pending'} • {dispatch._count.shipments} shipments • {dispatch._count.expenses} expenses
              </Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>ETA {dispatch.estimatedArrival ? new Date(dispatch.estimatedArrival).toLocaleDateString() : 'Not scheduled'} • Cost {formatCurrency(dispatch.cost)}</Text>
              {dispatch.notes ? <Text style={[styles.notes, { color: colors.textSecondary }]}>{dispatch.notes}</Text> : null}

              <View style={styles.actionBar}>
                <Button
                  title={activeDispatchId === dispatch.id ? 'Hide Actions' : 'Workflow Actions'}
                  variant="secondary"
                  size="sm"
                  onPress={() => {
                    setSelectedContainerId(null);
                    setActiveDispatchId((current) => (current === dispatch.id ? null : dispatch.id));
                  }}
                  style={styles.actionButton}
                />
              </View>

              {activeDispatchId === dispatch.id ? (
                <View style={StyleSheet.flatten([styles.workflowPanel, { borderColor: colors.border, backgroundColor: colors.background }])}>
                  {activeDispatchQuery.isLoading ? (
                    <Text style={[styles.panelText, { color: colors.textSecondary }]}>Loading dispatch workflow...</Text>
                  ) : activeDispatchQuery.error ? (
                    <Text style={[styles.panelText, { color: colors.error }]}>Dispatch workflow details could not be loaded.</Text>
                  ) : (
                    <>
                      <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Workflow Actions</Text>
                      <Text style={[styles.panelText, { color: colors.textSecondary }]}>Eligible shipments: {eligibleShipments.length}</Text>
                      {eligibleShipments.length > 0 ? (
                        <Text style={[styles.panelText, { color: colors.textSecondary }]}>Shipments: {eligibleShipments.map((shipment) => shipment.vehicleVIN || shipment.id.slice(0, 8)).slice(0, 3).join(', ')}{eligibleShipments.length > 3 ? `, +${eligibleShipments.length - 3} more` : ''}</Text>
                      ) : (
                        <Text style={[styles.panelText, { color: colors.textSecondary }]}>This dispatch has no active dispatching shipments left to receive or hand off.</Text>
                      )}

                      {availableContainers.length > 0 ? (
                        <View style={styles.containerChipRow}>
                          {availableContainers.slice(0, 8).map((container) => {
                            const selected = container.id === selectedContainerId;

                            return (
                              <TouchableOpacity
                                key={container.id}
                                activeOpacity={0.85}
                                style={StyleSheet.flatten([
                                  styles.containerChip,
                                  {
                                    backgroundColor: selected ? `${colors.accent}18` : colors.panel,
                                    borderColor: selected ? `${colors.accent}35` : colors.border,
                                  },
                                ])}
                                onPress={() => setSelectedContainerId(container.id)}
                              >
                                <Text style={[styles.containerChipText, { color: selected ? colors.accent : colors.textPrimary }]}>{container.containerNumber}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ) : (
                        <Text style={[styles.panelText, { color: colors.textSecondary }]}>No eligible containers are currently available for handoff.</Text>
                      )}

                      <View style={styles.workflowActions}>
                        <Button
                          title="Receive to Yard"
                          size="sm"
                          onPress={() => handleReceive(dispatch.id)}
                          disabled={eligibleShipments.length === 0}
                          loading={submittingAction === 'receive'}
                          style={styles.workflowButton}
                        />
                        <Button
                          title="Handoff to Container"
                          variant="secondary"
                          size="sm"
                          onPress={() => handleHandoff(dispatch.id)}
                          disabled={eligibleShipments.length === 0 || !selectedContainerId}
                          loading={submittingAction === 'handoff'}
                          style={styles.workflowButton}
                        />
                      </View>
                    </>
                  )}
                </View>
              ) : null}
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  title: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
  subtitle: { fontSize: Typography.fontSize.sm, lineHeight: 20, marginBottom: Spacing.base },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.base },
  filterChip: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  filterChipText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
  metricRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.base },
  metricCard: { flex: 1, paddingVertical: Spacing.base },
  metricValue: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, textAlign: 'center' },
  metricLabel: { fontSize: Typography.fontSize.xs, textAlign: 'center', marginTop: Spacing.xs },
  dispatchCard: { marginBottom: Spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm, marginBottom: Spacing.xs },
  reference: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold },
  routeText: { fontSize: Typography.fontSize.sm, marginBottom: Spacing.sm },
  meta: { fontSize: Typography.fontSize.xs, lineHeight: 18 },
  notes: { fontSize: Typography.fontSize.sm, lineHeight: 20, marginTop: Spacing.sm },
  actionBar: { marginTop: Spacing.base },
  actionButton: { alignSelf: 'flex-start' },
  workflowPanel: { borderWidth: 1, borderRadius: BorderRadius.lg, padding: Spacing.base, marginTop: Spacing.base },
  panelTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
  panelText: { fontSize: Typography.fontSize.sm, lineHeight: 20, marginBottom: Spacing.xs },
  containerChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.sm, marginBottom: Spacing.base },
  containerChip: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  containerChipText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
  workflowActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  workflowButton: { flex: 1 },
  statusPill: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  statusPillText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.bold },
  emptyText: { fontSize: Typography.fontSize.sm },
});
export default DispatchesScreen;
