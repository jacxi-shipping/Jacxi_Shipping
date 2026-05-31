import React, { useMemo, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { documentsApi } from '../../api/documents';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Colors } from '../../constants/colors';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { DocumentCategory, DocumentRecord } from '../../types/document';

const categoryOptions: DocumentCategory[] = ['OTHER', 'TITLE', 'INSURANCE', 'BILL_OF_LADING', 'INSPECTION_REPORT'];

const titleCase = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

const formatFileSize = (bytes: number) => {
  if (bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** unitIndex).toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

interface ShipmentDocumentsCardProps {
  shipmentId: string;
}

export const ShipmentDocumentsCard: React.FC<ShipmentDocumentsCardProps> = ({ shipmentId }) => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  const [selectedUploadAsset, setSelectedUploadAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [category, setCategory] = useState<DocumentCategory>('OTHER');

  const documentsQuery = useQuery({
    queryKey: ['shipment-documents', shipmentId],
    queryFn: () => documentsApi.getDocuments({ shipmentId, limit: 50 }),
  });

  const documents = documentsQuery.data?.documents || [];
  const canUpload = Boolean(user);

  const visibleSummary = useMemo(
    () => ({
      total: documents.length,
      publicCount: documents.filter((document) => document.isPublic).length,
    }),
    [documents],
  );

  const canDeleteDocument = (document: DocumentRecord) => {
    if (isAdmin) {
      return true;
    }

    if (!user) {
      return false;
    }

    return (
      document.user?.email === user.email ||
      document.user?.name === user.name ||
      document.uploadedBy === user.email ||
      document.uploadedBy === user.name
    );
  };

  const pickUploadFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: [
          'image/*',
          'application/pdf',
          'text/csv',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
      });

      if (!result.canceled) {
        setSelectedUploadAsset(result.assets[0]);
      }
    } catch (error: any) {
      Alert.alert('Unable to select file', error?.message || 'The document could not be selected.');
    }
  };

  const refreshDocuments = async () => {
    await documentsQuery.refetch();
    await queryClient.invalidateQueries({ queryKey: ['shipment', shipmentId] });
  };

  const handleUpload = async () => {
    if (!selectedUploadAsset || !user) {
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
        category,
        shipmentId,
      });

      setSelectedUploadAsset(null);
      await refreshDocuments();
      Alert.alert('Upload complete', 'The shipment document was uploaded successfully.');
    } catch (error: any) {
      Alert.alert('Upload failed', error?.message || 'The shipment document could not be uploaded.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (document: DocumentRecord) => {
    Alert.alert('Delete document', `Remove ${document.name} from this shipment?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeletingId(document.id);
            await documentsApi.deleteDocument(document.id);
            await refreshDocuments();
            Alert.alert('Document deleted', 'The shipment document was removed.');
          } catch (error: any) {
            Alert.alert('Unable to delete document', error?.message || 'The shipment document could not be removed.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  return (
    <Card style={styles.card}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Shipment Documents</Text>
      <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
        {isAdmin
          ? 'Upload shipment paperwork, open existing files, and remove documents when needed.'
          : 'Upload your shipment paperwork, download existing files, and remove documents you uploaded.'}
      </Text>

      <View style={styles.metricRow}>
        <View style={StyleSheet.flatten([styles.metricChip, { backgroundColor: colors.background, borderColor: colors.border }])}>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{visibleSummary.total}</Text>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Visible</Text>
        </View>
        <View style={StyleSheet.flatten([styles.metricChip, { backgroundColor: colors.background, borderColor: colors.border }])}>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{visibleSummary.publicCount}</Text>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Public</Text>
        </View>
      </View>

      {canUpload ? (
        <View style={styles.uploadSection}>
          <Text style={[styles.uploadLabel, { color: colors.textPrimary }]}>Upload Document</Text>
          <View style={styles.filterRow}>
            {categoryOptions.map((option) => {
              const selected = option === category;

              return (
                <TouchableOpacity
                  key={option}
                  activeOpacity={0.85}
                  style={StyleSheet.flatten([
                    styles.filterChip,
                    {
                      backgroundColor: selected ? `${colors.accent}18` : colors.panel,
                      borderColor: selected ? `${colors.accent}35` : colors.border,
                    },
                  ])}
                  onPress={() => setCategory(option)}
                >
                  <Text style={[styles.filterChipText, { color: selected ? colors.accent : colors.textPrimary }]}>{titleCase(option)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedUploadAsset ? (
            <Text style={[styles.uploadMeta, { color: colors.textSecondary }]}>Selected: {selectedUploadAsset.name}</Text>
          ) : null}

          <View style={styles.uploadActions}>
            <Button title={selectedUploadAsset ? 'Change File' : 'Choose File'} onPress={pickUploadFile} style={styles.uploadButton} />
            <Button title="Upload" variant="secondary" onPress={handleUpload} disabled={!selectedUploadAsset} loading={uploading} style={styles.uploadButton} />
          </View>
        </View>
      ) : null}

      {documentsQuery.isLoading ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Loading documents...</Text>
      ) : documents.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No shipment documents have been uploaded yet.</Text>
      ) : (
        documents.map((document, index) => (
          <View
            key={document.id}
            style={StyleSheet.flatten([
              styles.documentRow,
              index === documents.length - 1 ? styles.documentRowLast : null,
              { borderBottomColor: colors.border },
            ])}
          >
            <Text style={[styles.documentName, { color: colors.textPrimary }]}>{document.name}</Text>
            <Text style={[styles.documentMeta, { color: colors.textSecondary }]}>
              {titleCase(document.category)} • {formatFileSize(document.fileSize)} • {new Date(document.createdAt).toLocaleDateString()}
            </Text>
            <Text style={[styles.documentMeta, { color: colors.textSecondary }]}>
              {document.user?.name || document.user?.email || document.uploadedBy}
            </Text>
            <View style={styles.documentActions}>
              <TouchableOpacity activeOpacity={0.85} onPress={() => void Linking.openURL(document.fileUrl)}>
                <Text style={[styles.documentLink, { color: colors.accent }]}>Open / Download</Text>
              </TouchableOpacity>
              {canDeleteDocument(document) ? (
                <TouchableOpacity activeOpacity={0.85} onPress={() => handleDelete(document)} disabled={deletingId === document.id}>
                  <Text style={[styles.documentDelete, { color: colors.error }]}>{deletingId === document.id ? 'Deleting...' : 'Delete'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ))
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: Spacing.base,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  sectionText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.base,
  },
  metricRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  metricChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  metricValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  metricLabel: {
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
  },
  uploadSection: {
    marginBottom: Spacing.base,
  },
  uploadLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  uploadMeta: {
    fontSize: Typography.fontSize.xs,
    marginBottom: Spacing.sm,
  },
  uploadActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  uploadButton: {
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  filterChipText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
  },
  documentRow: {
    borderBottomWidth: 1,
    paddingVertical: Spacing.sm,
  },
  documentRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  documentName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  documentMeta: {
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  documentActions: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginTop: Spacing.sm,
  },
  documentLink: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  documentDelete: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});