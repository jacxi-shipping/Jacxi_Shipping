import React, { useMemo, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { documentsApi } from '../../api/documents';
import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorState } from '../../components/shared/ErrorState';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { useShipments } from '../../hooks/useShipments';
import { useAppTheme } from '../../hooks/useAppTheme';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

const categoryOptions = [
  { label: 'All', value: 'all' },
  { label: 'Invoices', value: 'INVOICE' },
  { label: 'BOL', value: 'BILL_OF_LADING' },
  { label: 'Customs', value: 'CUSTOMS' },
  { label: 'Insurance', value: 'INSURANCE' },
  { label: 'Other', value: 'OTHER' },
] as const;

const formatFileSize = (bytes: number) => {
  if (bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** unitIndex).toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const titleCase = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

const DocumentsScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const { user, isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<(typeof categoryOptions)[number]['value']>('all');
  const [shipmentId, setShipmentId] = useState<string | null>(null);
  const [selectedUploadAsset, setSelectedUploadAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);

  const shipmentsQuery = useShipments({}, { pageSize: 12 });
  const shipments = shipmentsQuery.data?.data || [];

  const documentsQuery = useQuery({
    queryKey: ['documents', user?.role, search, category, shipmentId],
    queryFn: () =>
      documentsApi.getDocuments({
        search: search || undefined,
        category: category === 'all' ? undefined : category,
        shipmentId: shipmentId || undefined,
        limit: 50,
      }),
  });

  const documents = documentsQuery.data?.documents || [];
  const summary = useMemo(
    () => ({
      total: documents.length,
      publicCount: documents.filter((document) => document.isPublic).length,
      invoiceCount: documents.filter((document) => document.category === 'INVOICE').length,
    }),
    [documents],
  );

  const pickUploadFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: [
        'image/*',
        'application/pdf',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
    });

    if (!result.canceled) {
      setSelectedUploadAsset(result.assets[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedUploadAsset || !isAdmin) {
      return;
    }

    if (Platform.OS === 'web' && !selectedUploadAsset.file) {
      Alert.alert('Re-select file', 'Please choose the document again so the browser can provide the live file handle for upload.');
      return;
    }

    try {
      setUploading(true);
      const upload = await documentsApi.uploadFile({
        uri: selectedUploadAsset.uri,
        name: selectedUploadAsset.name,
        mimeType: selectedUploadAsset.mimeType,
        file: selectedUploadAsset.file,
      });

      await documentsApi.createDocument({
        name: selectedUploadAsset.name,
        fileUrl: upload.url,
        fileType: selectedUploadAsset.mimeType || 'application/octet-stream',
        fileSize: Math.max(selectedUploadAsset.size || 1, 1),
        category: category === 'all' ? 'OTHER' : category,
        shipmentId: shipmentId || undefined,
      });

      setSelectedUploadAsset(null);
      await documentsQuery.refetch();
      Alert.alert('Upload complete', 'The document was uploaded and indexed successfully.');
    } catch (error: any) {
      Alert.alert('Upload failed', error?.message || 'The document could not be uploaded.');
    } finally {
      setUploading(false);
    }
  };

  if (documentsQuery.isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (documentsQuery.error) {
    return <ErrorState message={(documentsQuery.error as any).message} onRetry={documentsQuery.refetch} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.content}>
        <AppTopBar
          section="Documents"
          detail={isAdmin ? 'Shared library, shipment filters, and uploads' : 'Shared library and shipment-linked paperwork'}
          showBack
        />

        <Input value={search} onChangeText={setSearch} placeholder="Search documents by name or description" />

        {shipments.length > 0 ? (
          <View style={styles.shipmentSection}>
            <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Shipment Scope</Text>
            <Text style={[styles.shipmentSectionTitle, { color: colors.textPrimary }]}>Shipment Filter</Text>
            <View style={styles.filterRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={StyleSheet.flatten([
                  styles.filterChip,
                  {
                    backgroundColor: shipmentId === null ? `${colors.info}18` : colors.panel,
                    borderColor: shipmentId === null ? `${colors.info}35` : colors.border,
                  },
                ])}
                onPress={() => setShipmentId(null)}
              >
                <Text style={[styles.filterChipText, { color: shipmentId === null ? colors.info : colors.textPrimary }]}>All Shipments</Text>
              </TouchableOpacity>
              {shipments.slice(0, 8).map((shipment) => {
                const selected = shipment.id === shipmentId;
                const label = [shipment.vehicle.make, shipment.vehicle.model].filter(Boolean).join(' ') || shipment.vehicle.vin || shipment.id.slice(0, 8);

                return (
                  <TouchableOpacity
                    key={shipment.id}
                    activeOpacity={0.85}
                    style={StyleSheet.flatten([
                      styles.filterChip,
                      {
                        backgroundColor: selected ? `${colors.info}18` : colors.panel,
                        borderColor: selected ? `${colors.info}35` : colors.border,
                      },
                    ])}
                    onPress={() => setShipmentId(shipment.id)}
                  >
                    <Text style={[styles.filterChipText, { color: selected ? colors.info : colors.textPrimary }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Document Categories</Text>
        <View style={styles.filterRow}>
          {categoryOptions.map((option) => {
            const selected = option.value === category;

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
                onPress={() => setCategory(option.value)}
              >
                <Text style={[styles.filterChipText, { color: selected ? colors.accent : colors.textPrimary }]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.metricRow}>
          <Card style={[styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{summary.total}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Visible</Text>
          </Card>
          <Card style={[styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{summary.invoiceCount}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Invoices</Text>
          </Card>
          <Card style={[styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{summary.publicCount}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Public</Text>
          </Card>
        </View>

        {isAdmin ? (
          <Card style={styles.uploadCard}>
            <Text style={[styles.sectionEyebrow, { color: colors.textSecondary }]}>Admin Upload</Text>
            <Text style={[styles.uploadTitle, { color: colors.textPrimary }]}>Upload Document</Text>
            <Text style={[styles.uploadText, { color: colors.textSecondary }]}>Choose a file and upload it to the shared document library. The active shipment filter will be used as the shipment link when one is selected.</Text>
            {selectedUploadAsset ? (
              <Text style={[styles.uploadMeta, { color: colors.textSecondary }]}>Selected: {selectedUploadAsset.name}</Text>
            ) : null}
            <View style={styles.uploadActions}>
              <Button title={selectedUploadAsset ? 'Change File' : 'Choose File'} onPress={pickUploadFile} style={styles.uploadButton} />
              <Button title="Upload" variant="secondary" onPress={handleUpload} disabled={!selectedUploadAsset} loading={uploading} style={styles.uploadButton} />
            </View>
          </Card>
        ) : null}

        {documents.length === 0 ? (
          <EmptyState icon="documents" title="No Documents" description="Documents matching the current filters will appear here." />
        ) : (
          documents.map((document) => (
            <Card key={document.id} style={styles.documentCard}>
              <View style={styles.documentHeader}>
                <View style={styles.documentHeaderText}>
                  <Text style={[styles.documentName, { color: colors.textPrimary }]}>{document.name}</Text>
                  <Text style={[styles.documentMeta, { color: colors.textSecondary }]}>
                    {titleCase(document.category)} • {formatFileSize(document.fileSize)} • {new Date(document.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                {document.isPublic ? (
                  <View style={StyleSheet.flatten([styles.publicBadge, { backgroundColor: `${colors.info}12`, borderColor: `${colors.info}30` }])}>
                    <Text style={[styles.publicBadgeText, { color: colors.info }]}>Public</Text>
                  </View>
                ) : null}
              </View>
              {document.description ? (
                <Text style={[styles.documentDescription, { color: colors.textSecondary }]}>{document.description}</Text>
              ) : null}
              <View style={styles.contextRow}>
                <View style={[styles.contextChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                  <Text style={[styles.contextLabel, { color: colors.textSecondary }]}>Uploaded By</Text>
                  <Text style={[styles.contextValue, { color: colors.textPrimary }]}>{document.user?.name || document.user?.email || document.uploadedBy}</Text>
                </View>
                <View style={[styles.contextChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                  <Text style={[styles.contextLabel, { color: colors.textSecondary }]}>Shipment</Text>
                  <Text style={[styles.contextValue, { color: colors.textPrimary }]}>{document.shipment?.id ? document.shipment.id.slice(0, 8) : 'Unlinked'}</Text>
                </View>
              </View>
              <TouchableOpacity activeOpacity={0.85} onPress={() => void Linking.openURL(document.fileUrl)}>
                <Text style={[styles.openLink, { color: colors.accent }]}>Open / Download</Text>
              </TouchableOpacity>
            </Card>
          ))
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  sectionEyebrow: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.xs },
  shipmentSection: { marginBottom: Spacing.base },
  shipmentSectionTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.sm },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.base },
  filterChip: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  filterChipText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
  uploadCard: { marginBottom: Spacing.base },
  uploadTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.xs },
  uploadText: { fontSize: Typography.fontSize.sm, lineHeight: 20, marginBottom: Spacing.sm },
  uploadMeta: { fontSize: Typography.fontSize.xs, marginBottom: Spacing.sm },
  uploadActions: { flexDirection: 'row', gap: Spacing.sm },
  uploadButton: { flex: 1 },
  metricRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.base },
  metricCard: { flex: 1, paddingVertical: Spacing.base, borderWidth: 1 },
  metricValue: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.semibold, textAlign: 'center' },
  metricLabel: { fontSize: Typography.fontSize.xs, textAlign: 'center', marginTop: Spacing.xs, textTransform: 'uppercase', letterSpacing: 0.8 },
  documentCard: { marginBottom: Spacing.sm },
  documentHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  documentHeaderText: { flex: 1 },
  documentName: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.xs },
  documentMeta: { fontSize: Typography.fontSize.xs },
  publicBadge: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, alignSelf: 'flex-start' },
  publicBadgeText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
  documentDescription: { fontSize: Typography.fontSize.sm, marginTop: Spacing.sm, lineHeight: 20 },
  contextRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  contextChip: { width: '48%', borderWidth: 1, borderRadius: BorderRadius.xl, padding: Spacing.sm },
  contextLabel: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.xs },
  contextValue: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  openLink: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, marginTop: Spacing.sm },
});
export default DocumentsScreen;
