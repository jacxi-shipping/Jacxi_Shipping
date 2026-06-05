import React, { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/spacing';
import { documentsApi } from '../../api/documents';
import { DocumentCategory } from '../../types/document';
import { TouchableOpacity } from 'react-native';

const categoryOptions: DocumentCategory[] = ['OTHER', 'TITLE', 'INSURANCE', 'BILL_OF_LADING', 'INSPECTION_REPORT'];
const titleCase = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

interface DocumentUploadModalProps {
  visible: boolean;
  onClose: () => void;
  shipmentId?: string;
  onSuccess: () => void;
  defaultCategory?: DocumentCategory;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  visible,
  onClose,
  shipmentId,
  onSuccess,
  defaultCategory = 'OTHER',
}) => {
  const { colors } = useAppTheme();
  const [selectedUploadAsset, setSelectedUploadAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<DocumentCategory>(defaultCategory);

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

  const handleUpload = async () => {
    if (!selectedUploadAsset) {
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
      setCategory(defaultCategory);
      onSuccess();
      onClose();
      Alert.alert('Upload complete', 'The document was uploaded successfully.');
    } catch (error: any) {
      Alert.alert('Upload failed', error?.message || 'The document could not be uploaded.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedUploadAsset(null);
    setCategory(defaultCategory);
    onClose();
  };

  return (
    <Modal visible={visible} onClose={handleClose} title="Upload Document">
      <View style={styles.container}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>Category</Text>
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

        <Text style={[styles.label, { color: colors.textPrimary, marginTop: Spacing.md }]}>File</Text>
        <Text style={[styles.uploadText, { color: colors.textSecondary }]}>Select a file to upload.</Text>

        {selectedUploadAsset ? (
          <Text style={[styles.uploadMeta, { color: colors.textSecondary }]}>Selected: {selectedUploadAsset.name}</Text>
        ) : null}

        <View style={styles.uploadActions}>
          <Button title={selectedUploadAsset ? 'Change File' : 'Choose File'} onPress={pickUploadFile} style={styles.uploadButton} />
          <Button title="Upload" variant="secondary" onPress={handleUpload} disabled={!selectedUploadAsset} loading={uploading} style={styles.uploadButton} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xl,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
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
  uploadText: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.sm,
  },
  uploadMeta: {
    fontSize: Typography.fontSize.xs,
    marginBottom: Spacing.sm,
  },
  uploadActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  uploadButton: {
    flex: 1,
  },
});
