'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  Typography, 
  Button,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Chip,
} from '@mui/material';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Image as ImageIcon 
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal, FormField, Select } from '@/components/design-system';
import { FileUpload } from '@/components/ui/FileUpload';

interface Document {
  id: string;
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: string;
  uploadedBy: string;
  createdAt: string;
  type: string;
  size: number;
}

interface DocumentManagerProps {
  documents: Document[];
  entityId: string;
  entityType: 'shipment' | 'container';
  readOnly?: boolean;
}

export function DocumentManager({ documents: initialDocs, entityId, entityType, readOnly = false }: DocumentManagerProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>(initialDocs);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [category, setCategory] = useState('OTHER');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (file: File) => {
    try {
      // 1. Upload file to blob storage
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const error = await uploadRes.json();
        throw new Error(error.message || 'File upload failed');
      }

      const { url } = await uploadRes.json();

      // 2. Create document record
      const payload = {
        name: file.name,
        fileUrl: url,
        fileType: file.type,
        fileSize: file.size,
        ...(entityType === 'container' 
          ? { type: category, notes: '' } // Container API expects 'type'
          : { category: category, shipmentId: entityId } // Shipment API expects 'category'
        )
      };

      const endpoint = entityType === 'container' 
        ? `/api/containers/${entityId}/documents`
        : '/api/documents';

      const createRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!createRes.ok) {
        const error = await createRes.json();
        throw new Error(error.error || error.message || 'Failed to save document metadata');
      }
      
      router.refresh();

    } catch (error: any) {
      console.error('Upload error:', error);
      throw error; // Re-throw so FileUpload shows error state
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const endpoint = entityType === 'container'
        ? `/api/containers/${entityId}/documents?documentId=${docId}`
        : `/api/documents/${docId}`; // Assuming shipment docs use this

      const response = await fetch(endpoint, { method: 'DELETE' });

      if (!response.ok) throw new Error('Failed to delete document');

      toast.success('Document deleted');
      router.refresh();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const getIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon className="w-5 h-5 text-blue-500" />;
    if (type.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    return <FileText className="w-5 h-5 text-gray-500" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Documents
        </Typography>
        {!readOnly && (
          <Button
            variant="contained"
            startIcon={<Upload size={18} />}
            onClick={() => setIsUploadOpen(true)}
            sx={{
                bgcolor: 'var(--accent-gold)',
                color: 'var(--background)',
                '&:hover': { bgcolor: 'var(--accent-gold-hover)' }
            }}
          >
            Upload
          </Button>
        )}
      </Box>

      {documents.length === 0 ? (
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 4, 
            textAlign: 'center', 
            bgcolor: 'var(--background)',
            borderStyle: 'dashed' 
          }}
        >
          <FileText className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-2 opacity-50" />
          <Typography color="textSecondary">
            No documents attached yet
          </Typography>
        </Paper>
      ) : (
        <List sx={{ bgcolor: 'var(--panel)', borderRadius: 2, border: '1px solid var(--border)' }}>
          {documents.map((doc, index) => (
            <div key={doc.id}>
              <ListItem>
                <ListItemIcon>
                  {getIcon(doc.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                            {doc.name}
                        </Typography>
                        <Chip 
                            label={doc.category.replace('_', ' ')} 
                            size="small" 
                            sx={{ fontSize: '0.65rem', height: 20 }} 
                        />
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="textSecondary">
                      {formatSize(doc.size)} • Uploaded by {doc.uploadedBy} • {new Date(doc.createdAt).toLocaleDateString()}
                    </Typography>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" aria-label="download" sx={{ mr: 1 }} href={doc.fileUrl} target="_blank">
                    <Download className="w-4 h-4" />
                  </IconButton>
                  {!readOnly && (
                    <IconButton 
                        edge="end" 
                        aria-label="delete" 
                        color="error"
                        onClick={() => handleDelete(doc.id)}
                    >
                        <Trash2 className="w-4 h-4" />
                    </IconButton>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
              {index < documents.length - 1 && <Divider component="li" />}
            </div>
          ))}
        </List>
      )}

      {/* Upload Modal */}
      <Modal
        open={isUploadOpen}
        onClose={() => !isProcessing && setIsUploadOpen(false)}
        title="Upload Documents"
        disableBackdropClick={true}
        showCloseButton={!isProcessing}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            
            <FormField label="Document Category">
                <Select
                    label="Category"
                    value={category}
                    onChange={(e) => setCategory(String(e))}
                    disabled={isProcessing}
                    options={[
                        { value: 'INVOICE', label: 'Invoice' },
                        { value: 'BILL_OF_LADING', label: 'Bill of Lading' },
                        { value: 'CUSTOMS', label: 'Customs' },
                        { value: 'INSURANCE', label: 'Insurance' },
                        { value: 'TITLE', label: 'Title' },
                        { value: 'INSPECTION_REPORT', label: 'Inspection Report' },
                        { value: 'EXPORT_DOCUMENT', label: 'Export Document' },
                        { value: 'PACKING_LIST', label: 'Packing List' },
                        { value: 'CONTRACT', label: 'Contract' },
                        { value: 'PHOTO', label: 'Photo' },
                        { value: 'OTHER', label: 'Other' },
                    ]}
                />
            </FormField>

            <FileUpload 
                multiple={true}
                maxFiles={5}
                uploadHandler={handleFileUpload}
                onProcessingChange={setIsProcessing}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                <Button 
                    onClick={() => setIsUploadOpen(false)} 
                    disabled={isProcessing}
                    sx={{ color: 'var(--text-secondary)' }}
                >
                    {isProcessing ? 'Uploading...' : 'Done'}
                </Button>
            </Box>
        </Box>
      </Modal>
    </Box>
  );
}

