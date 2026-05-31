import React, { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { containersApi } from '../../api/containers';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const titleCase = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

const buildShipmentLabel = (shipment: { vehicleMake: string | null; vehicleModel: string | null; vehicleVIN: string | null; id: string }) => {
  const vehicleLabel = [shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ').trim();
  return vehicleLabel || shipment.vehicleVIN || shipment.id;
};

const ContainerDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const { colors } = useAppTheme();
  const containerId = route.params?.id as string;

  const query = useQuery({
    queryKey: ['container-detail', containerId],
    queryFn: () => containersApi.getContainer(containerId),
    enabled: !!containerId,
  });

  const container = query.data;
  const documentTypes = useMemo(
    () => ['all', ...Array.from(new Set(container?.documents.map((document) => document.type) || []))],
    [container?.documents],
  );
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('all');

  if (query.isLoading) return <LoadingSpinner fullScreen />;
  if (query.error) return <ErrorState message={(query.error as any).message} onRetry={query.refetch} />;

  if (!container) {
    return <ErrorState message="Container not found." onRetry={query.refetch} />;
  }

  const visibleDocuments = selectedDocumentType === 'all'
    ? container.documents
    : container.documents.filter((document) => document.type === selectedDocumentType);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppTopBar section="Container Details" detail={container.containerNumber} showBack />

        <Card style={styles.sectionCard}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Container Details</Text>
          <Text style={[styles.containerNumber, { color: colors.textPrimary }]}>{container.containerNumber}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}> 
            {titleCase(container.status)} • {container.shippingLine || 'Shipping line pending'} • {container.currentLocation || 'Location pending'}
          </Text>
          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{container.progress || 0}%</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Progress</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{container.shipments.length}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Shipments</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{container.documents.length}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Documents</Text>
            </View>
          </View>
          <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>From {container.loadingPort || 'Origin pending'} to {container.destinationPort || 'Destination pending'}</Text>
          <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>ETA {container.estimatedArrival ? new Date(container.estimatedArrival).toLocaleDateString() : 'Not scheduled'}</Text>
          {container.notes ? <Text style={[styles.notes, { color: colors.textSecondary }]}>{container.notes}</Text> : null}
        </Card>

        {container.totals ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Financial Totals</Text>
            <View style={styles.metricRow}>
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(container.totals.expenses)}</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Expenses</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCurrency(container.totals.invoices)}</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Invoices</Text>
              </View>
            </View>
          </Card>
        ) : null}

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Shipments</Text>
          {container.shipments.length === 0 ? (
            <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>No shipments currently linked to this container.</Text>
          ) : (
            container.shipments.map((shipment, index) => (
              <View
                key={shipment.id}
                style={StyleSheet.flatten([
                  styles.detailRow,
                  index === container.shipments.length - 1 ? styles.detailRowLast : null,
                  { borderBottomColor: colors.border },
                ])}
              >
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{buildShipmentLabel(shipment)}</Text>
                <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                  {shipment.vehicleVIN || 'VIN pending'} • {titleCase(shipment.status)}
                  {shipment.user?.email ? ` • ${shipment.user.email}` : ''}
                </Text>
              </View>
            ))
          )}
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tracking Events</Text>
          {container.trackingEvents.length === 0 ? (
            <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>No tracking events recorded yet.</Text>
          ) : (
            container.trackingEvents.slice(0, 8).map((event, index) => (
              <View
                key={event.id}
                style={StyleSheet.flatten([
                  styles.detailRow,
                  index === Math.min(container.trackingEvents.length, 8) - 1 ? styles.detailRowLast : null,
                  { borderBottomColor: colors.border },
                ])}
              >
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{titleCase(event.status)}</Text>
                <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                  {event.location || 'Location pending'} • {new Date(event.eventDate || event.createdAt || Date.now()).toLocaleString()}
                </Text>
                {event.description ? <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>{event.description}</Text> : null}
              </View>
            ))
          )}
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Documents</Text>
          {documentTypes.length > 1 ? (
            <View style={styles.filterRow}>
              {documentTypes.map((type) => {
                const selected = type === selectedDocumentType;

                return (
                  <TouchableOpacity
                    key={type}
                    activeOpacity={0.85}
                    style={StyleSheet.flatten([
                      styles.filterChip,
                      {
                        backgroundColor: selected ? `${colors.accent}18` : colors.panel,
                        borderColor: selected ? `${colors.accent}35` : colors.border,
                      },
                    ])}
                    onPress={() => setSelectedDocumentType(type)}
                  >
                    <Text style={[styles.filterChipText, { color: selected ? colors.accent : colors.textPrimary }]}>
                      {type === 'all' ? 'All' : titleCase(type)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
          {visibleDocuments.length === 0 ? (
            <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>No container documents uploaded yet.</Text>
          ) : (
            visibleDocuments.map((document, index) => (
              <View
                key={document.id}
                style={StyleSheet.flatten([
                  styles.detailRow,
                  index === visibleDocuments.length - 1 ? styles.detailRowLast : null,
                  { borderBottomColor: colors.border },
                ])}
              >
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{document.name}</Text>
                <Text style={[styles.rowMeta, { color: colors.textSecondary }]}> 
                  {titleCase(document.type)} • {new Date(document.uploadedAt).toLocaleDateString()}
                </Text>
                <TouchableOpacity activeOpacity={0.85} onPress={() => void Linking.openURL(document.fileUrl)}>
                  <Text style={[styles.linkText, { color: colors.accent }]}>Open document</Text>
                </TouchableOpacity>
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
  content: { padding: Spacing.base },
  sectionCard: { marginBottom: Spacing.base },
  title: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.sm },
  containerNumber: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
  subtitle: { fontSize: Typography.fontSize.base, lineHeight: 22 },
  metricRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.base },
  metricItem: { flex: 1, padding: Spacing.sm, borderRadius: BorderRadius.base },
  metricValue: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
  metricLabel: { fontSize: Typography.fontSize.xs },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.sm },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.base },
  filterChip: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  filterChipText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
  detailRow: { borderBottomWidth: 1, paddingVertical: Spacing.sm },
  detailRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  rowTitle: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.xs },
  rowMeta: { fontSize: Typography.fontSize.xs, lineHeight: 18 },
  notes: { fontSize: Typography.fontSize.sm, lineHeight: 20, marginTop: Spacing.sm },
  linkText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, marginTop: Spacing.xs },
});

export default ContainerDetailScreen;
