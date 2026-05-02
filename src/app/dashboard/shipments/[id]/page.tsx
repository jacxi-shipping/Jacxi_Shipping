'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { ActivityLog } from '@/components/dashboard/ActivityLog';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Button, DetailPageSkeleton } from '@/components/design-system';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  CalendarCheck,
  FileText,
  DollarSign,
  Image as ImageIcon,
  MapPin,
  PackageCheck,
  PenLine,
  Trash2,
  Truck,
  Wallet,
  Info,
  History,
  User,
  Ship,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import { Tabs, Tab, Box, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material';
import { Breadcrumbs, toast, EmptyState, Tooltip, StatusBadge } from '@/components/design-system';
import { DocumentManager } from '@/components/dashboard/DocumentManager';

import PhotoGallery from '@/components/shipments/PhotoGallery';
import PhotoLightbox from '@/components/shipments/PhotoLightbox';
import AddShipmentExpenseModal from '@/components/shipments/AddShipmentExpenseModal';
import ShipmentWorkflowStrip from '@/components/shipments/ShipmentWorkflowStrip';
import UnifiedShipmentTimeline from '@/components/shipments/UnifiedShipmentTimeline';
import { downloadShipmentInvoicePDF } from '@/lib/utils/generateShipmentInvoicePDF';
import { downloadReleaseTokenPDF } from '@/lib/utils/generateReleaseTokenPDF';
import { hasAnyPermission, hasPermission } from '@/lib/rbac';
import type { UnifiedShipmentTimelineItem } from '@/lib/shipment-timeline';

interface ShipmentEvent {
  id: string;
  status: string;
  location: string | null;
  eventDate: string;
  description: string | null;
  completed: boolean;
}

interface Container {
  id: string;
  containerNumber: string;
  trackingNumber: string | null;
  vesselName: string | null;
  voyageNumber: string | null;
  shippingLine: string | null;
  bookingNumber: string | null;
  loadingPort: string | null;
  destinationPort: string | null;
  transshipmentPorts: string[];
  loadingDate: string | null;
  departureDate: string | null;
  estimatedArrival: string | null;
  actualArrival: string | null;
  status: string;
  currentLocation: string | null;
  progress: number;
  maxCapacity: number;
  currentCount: number;
  notes: string | null;
  trackingEvents: ShipmentEvent[];
}

interface ShipmentTransit {
  id: string;
  referenceNumber: string;
  origin: string;
  destination: string;
  status: string;
  company: { id: string; name: string };
}

interface ShipmentDispatch {
  id: string;
  referenceNumber: string;
  origin: string;
  destination: string;
  status: string;
  company: { id: string; name: string };
}

interface Shipment {
  id: string;
  userId: string;
  serviceType?: string;
  purchasePrice?: number | null;
  vehicleType: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehicleVIN: string | null;
  vehicleColor: string | null;
  lotNumber: string | null;
  auctionName: string | null;
  status: string;
  price: number | null;
  companyShippingFare?: number | null;
  damageCost?: number | null;
  damageCredit: number | null;
  weight: number | null;
  dimensions: string | null;
  insuranceValue: number | null;
  vehiclePhotos: string[];
  arrivalPhotos: string[];
  hasKey: boolean | null;
  hasTitle: boolean | null;
  titleStatus: string | null;
  vehicleAge: number | null;
  dispatchId: string | null;
  containerId: string | null;
  transitId: string | null;
  dispatch: ShipmentDispatch | null;
  container: Container | null;
  transit: ShipmentTransit | null;
  internalNotes: string | null;
  paymentStatus: string;
  paymentMode: string | null;
  releaseToken: string | null;
  releaseTokenCreatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
  };
  documents: Array<{
    id: string;
    name: string;
    description: string | null;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    category: string;
    uploadedBy: string;
    createdAt: string;
  }>;
  ledgerEntries: Array<{
    id: string;
    transactionDate: string;
    description: string;
    type: string;
    amount: number;
    balance: number;
    metadata?: Record<string, unknown> | null;
  }>;
  companyLedgerEntries?: Array<{
    id: string;
    companyId: string;
    transactionDate: string;
    description: string;
    type: string;
    amount: number;
    balance: number;
    reference?: string | null;
    notes?: string | null;
    metadata?: Record<string, unknown> | null;
    company: {
      id: string;
      name: string;
      code: string | null;
    };
  }>;
  containerDamages: Array<{
    id: string;
    containerId: string;
    damageType: 'WE_PAY' | 'COMPANY_PAYS';
    amount: number;
    description: string;
    createdAt: string;
  }>;
  auditLogs?: Array<{
    id: string;
    action: string;
    description: string;
    performedBy: string;
    oldValue?: string | null;
    newValue?: string | null;
    timestamp: string;
    metadata?: Record<string, unknown> | null;
  }>;
  unifiedTimeline?: UnifiedShipmentTimelineItem[];
}

type ExpenseActionContext = {
  modalTitle: string;
  contextType?: 'CONTAINER' | 'DISPATCH' | 'TRANSIT';
  contextId?: string;
};

type ExpenseSourceFilter = 'ALL' | 'SHIPMENT' | 'DISPATCH' | 'TRANSIT';
type ClassifiedExpenseSource = Exclude<ExpenseSourceFilter, 'ALL'>;
type LinkedCompanyLedgerEntry = NonNullable<Shipment['companyLedgerEntries']>[number];

type StatusColors = {
  bg: string;
  text: string;
  border: string;
};

const statusColors: Record<string, StatusColors> = {
  'ON_HAND': { bg: 'rgba(var(--accent-gold-rgb), 0.15)', text: 'var(--accent-gold)', border: 'rgba(var(--accent-gold-rgb), 0.4)' },
  'IN_TRANSIT': { bg: 'rgba(var(--accent-gold-rgb), 0.15)', text: 'var(--accent-gold)', border: 'rgba(var(--accent-gold-rgb), 0.4)' },
  'DELIVERED': { bg: 'rgba(34, 197, 94, 0.15)', text: 'rgb(34, 197, 94)', border: 'rgba(34, 197, 94, 0.4)' },
  'CANCELLED': { bg: 'rgba(var(--error-rgb), 0.15)', text: 'var(--error)', border: 'rgba(var(--error-rgb), 0.4)' },
};

const containerStatusColors: Record<string, StatusColors> = {
  'CREATED': { bg: 'rgba(107, 114, 128, 0.15)', text: 'rgb(107, 114, 128)', border: 'rgba(107, 114, 128, 0.4)' },
  'WAITING_FOR_LOADING': { bg: 'rgba(251, 191, 36, 0.15)', text: 'rgb(251, 191, 36)', border: 'rgba(251, 191, 36, 0.4)' },
  'LOADED': { bg: 'rgba(59, 130, 246, 0.15)', text: 'rgb(59, 130, 246)', border: 'rgba(59, 130, 246, 0.4)' },
  'IN_TRANSIT': { bg: 'rgba(99, 102, 241, 0.15)', text: 'rgb(99, 102, 241)', border: 'rgba(99, 102, 241, 0.4)' },
  'ARRIVED_PORT': { bg: 'rgba(34, 197, 94, 0.15)', text: 'rgb(34, 197, 94)', border: 'rgba(34, 197, 94, 0.4)' },
  'CUSTOMS_CLEARANCE': { bg: 'rgba(249, 115, 22, 0.15)', text: 'rgb(249, 115, 22)', border: 'rgba(249, 115, 22, 0.4)' },
  'RELEASED': { bg: 'rgba(20, 184, 166, 0.15)', text: 'rgb(20, 184, 166)', border: 'rgba(20, 184, 166, 0.4)' },
  'CLOSED': { bg: 'rgba(75, 85, 99, 0.15)', text: 'rgb(75, 85, 99)', border: 'rgba(75, 85, 99, 0.4)' },
};

const expenseSourceLabels: Record<ClassifiedExpenseSource, string> = {
  SHIPMENT: 'Shipping',
  DISPATCH: 'Dispatch',
  TRANSIT: 'Transit',
};

const expenseSourceDescriptions: Record<ClassifiedExpenseSource, string> = {
  SHIPMENT: 'Container or shipment-stage recovery',
  DISPATCH: 'Origin yard to port movement',
  TRANSIT: 'Destination delivery leg',
};

const expenseSourceStyles: Record<ClassifiedExpenseSource, StatusColors> = {
  SHIPMENT: { bg: 'rgba(59, 130, 246, 0.12)', text: 'rgb(29, 78, 216)', border: 'rgba(59, 130, 246, 0.28)' },
  DISPATCH: { bg: 'rgba(234, 179, 8, 0.14)', text: 'rgb(161, 98, 7)', border: 'rgba(234, 179, 8, 0.32)' },
  TRANSIT: { bg: 'rgba(99, 102, 241, 0.14)', text: 'rgb(67, 56, 202)', border: 'rgba(99, 102, 241, 0.3)' },
};

function classifyExpenseSource(metadata: Record<string, unknown>): ClassifiedExpenseSource {
  const explicitSource = typeof metadata.expenseSource === 'string' ? metadata.expenseSource.toUpperCase() : undefined;

  if (explicitSource === 'DISPATCH' || explicitSource === 'TRANSIT' || explicitSource === 'SHIPMENT') {
    return explicitSource;
  }

  if (typeof metadata.dispatchId === 'string' && metadata.dispatchId) {
    return 'DISPATCH';
  }

  if (typeof metadata.transitId === 'string' && metadata.transitId) {
    return 'TRANSIT';
  }

  return 'SHIPMENT';
}

export default function ShipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [arrivalPhotos, setArrivalPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Array<{ name: string; progress: number }>>([]);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number; title: string } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [openAssignDispatch, setOpenAssignDispatch] = useState(false);
  const [openAssignTransit, setOpenAssignTransit] = useState(false);
  const [dispatchIdToAssign, setDispatchIdToAssign] = useState('');
  const [transitIdToAssign, setTransitIdToAssign] = useState('');
  const [releaseTokenToAssign, setReleaseTokenToAssign] = useState('');
  const [showReleaseToken, setShowReleaseToken] = useState(false);
  const [availableDispatches, setAvailableDispatches] = useState<Array<{ id: string; referenceNumber: string; origin: string; destination: string; status: string; company: { name: string } }>>([]);
  const [loadingDispatches, setLoadingDispatches] = useState(false);
  const [assigningDispatch, setAssigningDispatch] = useState(false);
  const [assigningTransit, setAssigningTransit] = useState(false);
  const [creatingReleaseToken, setCreatingReleaseToken] = useState(false);
  const [expenseAction, setExpenseAction] = useState<ExpenseActionContext | null>(null);
  const [expenseSourceFilter, setExpenseSourceFilter] = useState<ExpenseSourceFilter>('ALL');
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  const fetchShipment = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/shipments/${params.id}`, { cache: 'no-store' });
      const data = await response.json();

      if (response.ok) {
        setShipment(data.shipment);
        setArrivalPhotos(data.shipment.arrivalPhotos || []);
      } else {
        setError(data.message || 'Failed to load shipment');
      }
    } catch (error) {
      console.error('Error fetching shipment:', error);
      setError('An error occurred while loading the shipment');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const refreshShipmentPage = useCallback(async () => {
    await fetchShipment();
    router.refresh();
  }, [fetchShipment, router]);

  useEffect(() => {
    void fetchShipment();
  }, [fetchShipment]);

  useEffect(() => {
    if (!openAssignDispatch) return;

    const fetchDispatches = async () => {
      try {
        setLoadingDispatches(true);
        const response = await fetch('/api/dispatches');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load dispatches');
        setAvailableDispatches((data.dispatches || []).filter((dispatch: { status?: string }) => dispatch.status !== 'COMPLETED' && dispatch.status !== 'CANCELLED'));
      } catch (error) {
        console.error('Error fetching dispatches:', error);
        toast.error('Failed to load dispatches');
      } finally {
        setLoadingDispatches(false);
      }
    };

    void fetchDispatches();
  }, [openAssignDispatch]);

  const openLightbox = (images: string[], index: number, title: string) => {
    if (!images.length) return;
    setLightbox({ images, index, title });
  };

  const downloadPhoto = async (url: string, index: number) => {
    const title = lightbox?.title ?? 'photo';
    const filename = `${title.replace(/\s+/g, '-')}-${index + 1}.jpg`;
    try {
      setDownloading(true);
      const response = await fetch(`/api/photos/download?url=${encodeURIComponent(url)}`);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading photo:', error);
      toast.error('Failed to download photo', { description: 'Please try again' });
    } finally {
      setDownloading(false);
    }
  };

  const downloadAllPhotos = async (urls: string[], label: string) => {
    try {
      setDownloading(true);
      const response = await fetch('/api/photos/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: urls, filename: `${label.replace(/\s+/g, '-')}-photos.zip` }),
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${label.replace(/\s+/g, '-')}-photos.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading photos:', error);
      toast.error('Failed to download photos', { description: 'Please try again' });
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteExpense = async (entryId: string) => {
    if (!confirm('Delete this expense? This will reverse the transaction from both the customer and company ledger.')) return;
    try {
      setDeletingExpenseId(entryId);
      const response = await fetch(`/api/ledger/${entryId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete expense');
      toast.success('Expense deleted', { description: 'Ledger entries reversed successfully' });
      void refreshShipmentPage();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete expense');
    } finally {
      setDeletingExpenseId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this shipment?')) {
      return;
    }

    try {
      const response = await fetch(`/api/shipments/${params.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/dashboard/shipments');
      } else {
        const data = await response.json();
        toast.error('Failed to delete shipment', data.message || 'Please try again');
      }
    } catch (error) {
      console.error('Error deleting shipment:', error);
      toast.error('Failed to delete shipment', { description: 'An error occurred. Please try again' });
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleAssignTransit = async () => {
    if (!transitIdToAssign.trim()) {
      toast.error('Transit ID is required');
      return;
    }

    if (!releaseTokenToAssign.trim()) {
      toast.error('Release token is required');
      return;
    }

    try {
      setAssigningTransit(true);
      const response = await fetch(`/api/transits/${transitIdToAssign}/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId: params.id, releaseToken: releaseTokenToAssign.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to assign transit');
      toast.success('Shipment assigned to transit');
      setOpenAssignTransit(false);
      setTransitIdToAssign('');
      setReleaseTokenToAssign('');
      await fetchShipment();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign transit');
    } finally {
      setAssigningTransit(false);
    }
  };

  const handleAssignDispatch = async () => {
    if (!dispatchIdToAssign.trim()) {
      toast.error('Dispatch is required');
      return;
    }

    try {
      setAssigningDispatch(true);
      const response = await fetch(`/api/dispatches/${dispatchIdToAssign}/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId: params.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to assign dispatch');
      toast.success('Shipment assigned to dispatch');
      setOpenAssignDispatch(false);
      setDispatchIdToAssign('');
      await fetchShipment();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign dispatch');
    } finally {
      setAssigningDispatch(false);
    }
  };

  const handleGenerateReleaseToken = async () => {
    if (!shipment) return;

    try {
      setCreatingReleaseToken(true);
      const response = await fetch(`/api/shipments/${shipment.id}/release-token`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate release token');
      }

      setShipment((prev) =>
        prev
          ? {
              ...prev,
              releaseToken: data.shipment.releaseToken,
              releaseTokenCreatedAt: data.shipment.releaseTokenCreatedAt,
            }
          : prev
      );

      toast.success('Release token generated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate release token');
    } finally {
      setCreatingReleaseToken(false);
    }
  };

  const handleRemoveFromTransit = async () => {
    if (!shipment?.transitId || !confirm('Remove this shipment from its transit?')) return;
    try {
      const response = await fetch(`/api/transits/${shipment.transitId}/shipments?shipmentId=${shipment.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to remove from transit');
      toast.success('Removed from transit');
      await fetchShipment();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove from transit');
    }
  };

  const handleRemoveFromDispatch = async () => {
    if (!shipment?.dispatchId || !confirm('Remove this shipment from its dispatch?')) return;
    try {
      const response = await fetch(`/api/dispatches/${shipment.dispatchId}/shipments?shipmentId=${shipment.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to remove from dispatch');
      toast.success('Removed from dispatch');
      await fetchShipment();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove from dispatch');
    }
  };

  const handleDownloadReceipt = async () => {
    if (!shipment) return;
    
    try {
        const expenses = shipment.ledgerEntries
            .filter((e) => {
              if (e.type !== 'DEBIT') return false;
              const metadata = (e.metadata ?? {}) as Record<string, unknown>;
              const isExpense = metadata.isExpense === true || metadata.isExpense === 'true';
              const expenseSource = typeof metadata.expenseSource === 'string' ? metadata.expenseSource.toUpperCase() : undefined;
              const isContainerExpense = metadata.isContainerExpense === true || metadata.isContainerExpense === 'true';
              return (isExpense || expenseSource === 'SHIPMENT') && !isContainerExpense;
            })
            .map(e => ({
                description: e.description,
                amount: e.amount,
                metadata: (e as any).metadata
            }));

        const invoiceData = {
            invoiceNumber: `RECEIPT-${shipment.vehicleVIN?.slice(-6) || shipment.id.slice(0,6)}-${new Date().toISOString().split('T')[0].replace(/-/g, '')}`,
            date: new Date().toISOString(),
            shipment: {
                ...shipment,
                user: {
                    ...shipment.user,
                    address: null,
                    city: null,
                    country: null
                }
            },
            expenses: expenses
        };

        downloadShipmentInvoicePDF(invoiceData);
        toast.success('Receipt downloaded');
    } catch (error) {
        console.error('Error generating receipt:', error);
        toast.error('Failed to generate receipt');
    }
  };

  const handleDownloadReleaseToken = () => {
    if (!shipment) {
      toast.error('Shipment is not loaded yet');
      return;
    }

    if (!shipment.releaseToken) {
      toast.error('Generate release token first');
      return;
    }

    try {
      downloadReleaseTokenPDF({
        id: shipment.id,
        serviceType: shipment.serviceType,
        vehicleType: shipment.vehicleType,
        vehicleMake: shipment.vehicleMake,
        vehicleModel: shipment.vehicleModel,
        vehicleYear: shipment.vehicleYear,
        vehicleVIN: shipment.vehicleVIN,
        vehicleColor: shipment.vehicleColor,
        lotNumber: shipment.lotNumber,
        auctionName: shipment.auctionName,
        hasKey: shipment.hasKey,
        hasTitle: shipment.hasTitle,
        titleStatus: shipment.titleStatus,
        price: shipment.price,
        insuranceValue: shipment.insuranceValue,
        paymentStatus: shipment.paymentStatus,
        paymentMode: shipment.paymentMode,
        releaseToken: shipment.releaseToken,
        releaseTokenCreatedAt: shipment.releaseTokenCreatedAt,
        container: shipment.container
          ? {
              containerNumber: shipment.container.containerNumber,
              loadingPort: shipment.container.loadingPort,
              destinationPort: shipment.container.destinationPort,
            }
          : null,
        user: {
          name: shipment.user.name,
          email: shipment.user.email,
          phone: shipment.user.phone,
          address: shipment.user.address,
          city: shipment.user.city,
          country: shipment.user.country,
        },
      });
      toast.success('Release token PDF downloaded');
    } catch (error) {
      console.error('Error generating release token PDF:', error);
      toast.error('Failed to generate release token PDF');
    }
  };

  /** Upload multiple arrival photo files, tracking per-file progress */
  const handleArrivalPhotosUpload = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);

    // Initialise progress items
    const initialProgress = files.map(f => ({ name: f.name, progress: 0 }));
    setUploadProgress(initialProgress);

    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const formData = new FormData();
        formData.append('file', files[i]);
        const response = await fetch('/api/upload', { method: 'POST', body: formData });
        if (response.ok) {
          const result = await response.json();
          uploadedUrls.push(result.url as string);
          setUploadProgress(prev => prev.map((p, idx) => idx === i ? { ...p, progress: 100 } : p));
        } else {
          const err = await response.json();
          throw new Error((err as { message?: string }).message || 'Upload failed');
        }
      } catch (err) {
        console.error('Error uploading file:', err);
        setUploadProgress(prev => prev.map((p, idx) => idx === i ? { ...p, progress: -1 } : p));
        toast.error(`Failed to upload ${files[i].name}`);
      }
    }

    if (uploadedUrls.length > 0) {
      try {
        const response = await fetch(`/api/shipments/${params.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ arrivalPhotos: uploadedUrls }),
        });
        if (response.ok) {
          const data = await response.json();
          setShipment(data.shipment);
          setArrivalPhotos((data.shipment as { arrivalPhotos: string[] }).arrivalPhotos || []);
          toast.success(`${uploadedUrls.length} photo${uploadedUrls.length > 1 ? 's' : ''} uploaded`);
        } else {
          const err = await response.json();
          toast.error('Failed to save photos', { description: (err as { message?: string }).message || 'Please try again' });
        }
      } catch (err) {
        console.error('Error saving arrival photos:', err);
        toast.error('Failed to save photos', { description: 'An error occurred. Please try again' });
      }
    }

    setUploading(false);
    const UPLOAD_PROGRESS_CLEAR_DELAY_MS = 2000;
    setTimeout(() => setUploadProgress([]), UPLOAD_PROGRESS_CLEAR_DELAY_MS);
  };

  const removeArrivalPhoto = async (index: number) => {
    const newPhotos = arrivalPhotos.filter((_, i) => i !== index);
    setArrivalPhotos(newPhotos);

    try {
      const response = await fetch(`/api/shipments/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arrivalPhotos: newPhotos }),
      });

      if (response.ok) {
        const data = await response.json();
        setShipment(data.shipment);
      } else {
        setArrivalPhotos(arrivalPhotos);
        const err = await response.json();
        toast.error('Failed to remove photo', { description: (err as { message?: string }).message || 'Please try again' });
      }
    } catch (err) {
      setArrivalPhotos(arrivalPhotos);
      console.error('Error removing photo:', err);
      toast.error('Failed to remove photo', { description: 'An error occurred. Please try again' });
    }
  };

  const canManageWorkflow = hasPermission(session?.user?.role, 'workflow:move') && hasPermission(session?.user?.role, 'shipments:manage');
  const canManageShipmentRecord = hasPermission(session?.user?.role, 'shipments:manage');
  const canPostExpenses = hasPermission(session?.user?.role, 'expenses:post');
  const canUploadArrivalPhotos = canManageWorkflow && 
    (shipment?.container?.status === 'ARRIVED_PORT' || 
     shipment?.container?.status === 'CUSTOMS_CLEARANCE' ||
     shipment?.container?.status === 'RELEASED');

  /** Delete handler passed to PhotoLightbox — removes the photo and closes the viewer */
  const handleLightboxDelete = useCallback(async (idx: number) => {
    await removeArrivalPhoto(idx);
    setLightbox(null);
  }, [arrivalPhotos]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusStyles = useMemo(() => statusColors, []);
  const isAdmin = session?.user?.role === 'admin';
  const canManageShipmentExpenses = canPostExpenses;
  const canViewLedgerComparison = hasAnyPermission(session?.user?.role, ['finance:view', 'finance:manage', 'shipments:read_all']);
  const isReleasedForTransit = shipment?.status === 'RELEASED' || shipment?.container?.status === 'RELEASED';
  const canAssignDispatch = canManageWorkflow && !shipment?.dispatchId && !shipment?.containerId && !shipment?.transitId && shipment?.status === 'ON_HAND';
  const canAddShipmentExpense = Boolean(shipment?.containerId || shipment?.transitId || shipment?.dispatchId);
  const canAddDispatchExpense = Boolean(shipment?.dispatchId);
  const canAddTransitExpense = Boolean(shipment?.transitId);
  const expenseContextType = shipment?.containerId
    ? 'CONTAINER'
    : shipment?.transitId
    ? 'TRANSIT'
    : shipment?.dispatchId
    ? 'DISPATCH'
    : undefined;
  const expenseContextId = shipment?.containerId || shipment?.transitId || shipment?.dispatchId || undefined;
  const expenseLedgerHelpText = shipment?.container
    ? `Expenses from this page will recover against the container company ledger for ${shipment.container.containerNumber}.`
    : shipment?.transit
    ? `Expenses from this page will recover against the transit company ledger for ${shipment.transit.referenceNumber}.`
    : shipment?.dispatch
    ? `Expenses from this page will recover against the dispatch company ledger for ${shipment.dispatch.referenceNumber}.`
    : 'Assign this shipment to a dispatch, container, or transit with a company ledger before posting expenses.';
  const expenseActionHelpText = [
    'Shipment Expense uses the shipment\'s primary accounting route.',
    canAddDispatchExpense ? `Dispatch Expense posts to dispatch ${shipment?.dispatch?.referenceNumber}.` : 'Dispatch Expense is available after dispatch assignment.',
    canAddTransitExpense ? `Transit Expense posts to transit ${shipment?.transit?.referenceNumber}.` : 'Transit Expense is available after transit assignment.',
  ].join(' ');
  const classifiedShipmentExpenseData = useMemo(() => {
    const totals: Record<ClassifiedExpenseSource, number> = {
      SHIPMENT: 0,
      DISPATCH: 0,
      TRANSIT: 0,
    };
    const counts: Record<ClassifiedExpenseSource, number> = {
      SHIPMENT: 0,
      DISPATCH: 0,
      TRANSIT: 0,
    };
    const entries: Array<Shipment['ledgerEntries'][number] & { source: ClassifiedExpenseSource }> = [];

    for (const entry of shipment?.ledgerEntries || []) {
      if (entry.type !== 'DEBIT') continue;

      const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
      const isExpense = metadata.isExpense === true || metadata.isExpense === 'true';
      const explicitSource = typeof metadata.expenseSource === 'string' ? metadata.expenseSource.toUpperCase() : undefined;
      const isContainerExpense = metadata.isContainerExpense === true || metadata.isContainerExpense === 'true';

      if (!isExpense && explicitSource !== 'SHIPMENT' && explicitSource !== 'DISPATCH' && explicitSource !== 'TRANSIT') {
        continue;
      }

      if (isContainerExpense) {
        continue;
      }

      const source = classifyExpenseSource(metadata);
      totals[source] += entry.amount;
      counts[source] += 1;
      entries.push({ ...entry, source });
    }

    return {
      entries,
      totals,
      counts,
      total: entries.reduce((sum, entry) => sum + entry.amount, 0),
    };
  }, [shipment?.ledgerEntries]);

  const filteredShipmentExpenseEntries = useMemo(() => {
    if (expenseSourceFilter === 'ALL') {
      return classifiedShipmentExpenseData.entries;
    }

    return classifiedShipmentExpenseData.entries.filter((entry) => entry.source === expenseSourceFilter);
  }, [classifiedShipmentExpenseData.entries, expenseSourceFilter]);

  const filteredShipmentExpenseTotal = useMemo(
    () => filteredShipmentExpenseEntries.reduce((sum, entry) => sum + entry.amount, 0),
    [filteredShipmentExpenseEntries]
  );

  // ⚡ Bolt: Consolidated multiple array iterations (.filter().reduce()) into single O(N) loops
  let userLedgerDebitsTotal = 0;
  let userLedgerCreditsTotal = 0;
  for (const entry of shipment?.ledgerEntries || []) {
    if (entry.type === 'DEBIT') userLedgerDebitsTotal += entry.amount;
    else if (entry.type === 'CREDIT') userLedgerCreditsTotal += entry.amount;
  }
  const netUserCharged = userLedgerDebitsTotal - userLedgerCreditsTotal;

  const companyLedgerEntries = shipment?.companyLedgerEntries || [];
  let companyLedgerDebitsTotal = 0;
  let companyLedgerCreditsTotal = 0;
  for (const entry of companyLedgerEntries) {
    if (entry.type === 'DEBIT') companyLedgerDebitsTotal += entry.amount;
    else if (entry.type === 'CREDIT') companyLedgerCreditsTotal += entry.amount;
  }
  const netCompanyCharged = companyLedgerDebitsTotal - companyLedgerCreditsTotal;
  // Use normalized charged amounts for comparison so difference reflects what is displayed.
  const customerChargedForComparison = Math.abs(netUserCharged);
  const companyChargedForComparison = Math.abs(netCompanyCharged);
  const netDifference = customerChargedForComparison - companyChargedForComparison;

  const comparisonTransactions = [
    ...companyLedgerEntries.map((entry) => ({
      id: `company-${entry.id}`,
      source: 'COMPANY' as const,
      companyLedgerEntry: entry,
      transactionDate: entry.transactionDate,
      description: entry.description,
      type: entry.type,
      amount: entry.amount,
    })),
    ...(shipment?.ledgerEntries || []).map((entry) => ({
      id: `customer-${entry.id}`,
      source: 'CUSTOMER' as const,
      linkedCompanyLedgerEntry: null as LinkedCompanyLedgerEntry | null,
      transactionDate: entry.transactionDate,
      description: entry.description,
      type: entry.type,
      amount: entry.amount,
      userLedgerEntryId: entry.id,
    })),
  ].sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

  const linkedCompanyLedgerEntriesByUserEntryId = useMemo(() => {
    const map = new Map<string, LinkedCompanyLedgerEntry>();

    for (const entry of companyLedgerEntries) {
      const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
      const linkedUserExpenseEntryId = typeof metadata.linkedUserExpenseEntryId === 'string'
        ? metadata.linkedUserExpenseEntryId
        : typeof entry.reference === 'string' && entry.reference.startsWith('shipment-expense:')
        ? entry.reference.replace('shipment-expense:', '')
        : null;

      if (linkedUserExpenseEntryId) {
        map.set(linkedUserExpenseEntryId, entry);
      }
    }

    return map;
  }, [companyLedgerEntries]);

  const expenseEntriesWithCompanyLedger = useMemo(
    () =>
      filteredShipmentExpenseEntries.map((entry) => ({
        ...entry,
        linkedCompanyLedgerEntry: linkedCompanyLedgerEntriesByUserEntryId.get(entry.id) || null,
      })),
    [filteredShipmentExpenseEntries, linkedCompanyLedgerEntriesByUserEntryId]
  );

  const comparisonTransactionsWithDrillDown = useMemo(
    () =>
      comparisonTransactions.map((entry) => {
        if (entry.source === 'COMPANY') {
          return entry;
        }

        return {
          ...entry,
          linkedCompanyLedgerEntry: entry.userLedgerEntryId
            ? linkedCompanyLedgerEntriesByUserEntryId.get(entry.userLedgerEntryId) || null
            : null,
        };
      }),
    [comparisonTransactions, linkedCompanyLedgerEntriesByUserEntryId]
  );

  const openCompanyLedgerEntry = useCallback((entry: LinkedCompanyLedgerEntry) => {
    router.push(`/dashboard/finance/companies/${entry.companyId}?entryId=${entry.id}`);
  }, [router]);

  const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => {
    return (
      <div role="tabpanel" hidden={value !== index} id={`shipment-tabpanel-${index}`} aria-labelledby={`shipment-tab-${index}`}>
        {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
      </div>
    );
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DetailPageSkeleton />
      </ProtectedRoute>
    );
  }

  if (error || !shipment) {
    return (
      <ProtectedRoute>
        <DashboardSurface>
          <DashboardPanel>
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Shipment Unavailable</h2>
              <p className="text-[var(--text-secondary)]">{error || 'We could not find this shipment.'}</p>
              <Link href="/dashboard/shipments">
                <Button>Back to Shipments</Button>
              </Link>
            </div>
          </DashboardPanel>
        </DashboardSurface>
      </ProtectedRoute>
    );
  }

  const statusStyle = statusStyles[shipment.status] || statusColors['ON_HAND'];

  return (
    <ProtectedRoute>
      <DashboardSurface>
        {/* Header */}
        <div className="flex flex-col gap-3">
          <Breadcrumbs 
            items={[
              { label: 'Shipments', href: '/dashboard/shipments' },
              { label: shipment.vehicleVIN || `${shipment.vehicleYear || ''} ${shipment.vehicleMake || ''} ${shipment.vehicleModel || ''}`.trim() || 'Details', href: '' },
            ]}
          />
          
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/dashboard/shipments">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>

            <div className="flex-1 text-center">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
                {shipment.vehicleVIN || `${shipment.vehicleYear || ''} ${shipment.vehicleMake || ''} ${shipment.vehicleModel || ''}`.trim() || 'Shipment Details'}
              </h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Detailed view of shipment lifecycle and information
              </p>
            </div>

            <div className="flex items-center gap-2">
                <Tooltip title="Download a PDF receipt for this shipment. For official invoices, go to the container page and generate invoices.">
                  <Button variant="outline" size="sm" onClick={handleDownloadReceipt}>
                      <FileText className="mr-2 h-4 w-4" />
                      Download Receipt
                  </Button>
                </Tooltip>
                {canManageWorkflow && !shipment.releaseToken && (
                  <Tooltip
                    title={
                      isReleasedForTransit
                        ? 'Generate release token for this shipment'
                        : 'Release token can be generated after shipment/container status is Released'
                    }
                  >
                    <span>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<FileText className="w-4 h-4" />}
                        onClick={() => void handleGenerateReleaseToken()}
                        disabled={creatingReleaseToken || !isReleasedForTransit}
                      >
                        {creatingReleaseToken ? 'Generating...' : 'Generate Token'}
                      </Button>
                    </span>
                  </Tooltip>
                )}
                {shipment.releaseToken && (
                  <Tooltip title="Download release token document as PDF with customer, vehicle, and payment details.">
                    <Button variant="outline" size="sm" onClick={handleDownloadReleaseToken}>
                      <FileText className="mr-2 h-4 w-4" />
                      Release Token PDF
                    </Button>
                  </Tooltip>
                )}
                {canManageShipmentRecord && (
                  <>
                    <Link href={`/dashboard/shipments/${shipment.id}/edit`}>
                      <Button size="sm">
                        <PenLine className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" onClick={handleDelete} className="border-[var(--error)] text-[var(--error)]">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </>
                )}
            </div>
          </div>
        </div>

        <ShipmentWorkflowStrip
          shipmentStatus={shipment.status}
          dispatchId={shipment.dispatchId}
          dispatchReference={shipment.dispatch?.referenceNumber}
          containerId={shipment.containerId}
          containerLabel={shipment.container?.containerNumber}
          transitId={shipment.transitId}
          transitReference={shipment.transit?.referenceNumber}
        />

        {/* Tabs Navigation */}
        <Box sx={{ borderBottom: 1, borderColor: 'var(--border)' }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                minHeight: 48,
                '&:hover': {
                  color: 'var(--accent-gold)',
                },
              },
              '& .Mui-selected': {
                color: 'var(--accent-gold) !important',
              },
              '& .MuiTabs-indicator': {
                backgroundColor: 'var(--accent-gold)',
              },
            }}
          >
            <Tab icon={<Info className="h-4 w-4" />} iconPosition="start" label="Overview" />
            <Tab icon={<History className="h-4 w-4" />} iconPosition="start" label="Timeline" />
            <Tab icon={<ImageIcon className="h-4 w-4" />} iconPosition="start" label="Photos" />
            <Tab icon={<FileText className="h-4 w-4" />} iconPosition="start" label={`Documents (${shipment.documents?.length || 0})`} />
            <Tab icon={<DollarSign className="h-4 w-4" />} iconPosition="start" label="Financials" />
            <Tab icon={<AlertTriangle className="h-4 w-4" />} iconPosition="start" label={`Damages (${shipment.containerDamages?.length || 0})`} />
            <Tab icon={<PackageCheck className="h-4 w-4" />} iconPosition="start" label="Details" />
            {isAdmin && <Tab icon={<History className="h-4 w-4" />} iconPosition="start" label="Activity" />}
            {isAdmin && <Tab icon={<User className="h-4 w-4" />} iconPosition="start" label="Customer" />}
          </Tabs>
        </Box>

        {/* Tab Content */}
        <TabPanel value={activeTab} index={0}>
          <DashboardGrid className="grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Current Status */}
            <DashboardPanel title="Current Status" description="Monitor the latest milestone and updates">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                    style={{
                      backgroundColor: statusStyle.bg,
                      color: statusStyle.text,
                      border: `1px solid ${statusStyle.border}`,
                    }}
                  >
                    {formatStatus(shipment.status)}
                  </span>
                  {shipment.container && shipment.container.progress > 0 && (
                    <span className="text-sm font-medium text-[var(--text-secondary)]">
                      Progress <span className="font-semibold text-[var(--text-primary)]">{shipment.container.progress}%</span>
                    </span>
                  )}
                </div>

                {shipment.container && (
                  <>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
                      <div
                        className="h-full bg-[var(--accent-gold)] transition-all duration-500"
                        style={{ width: `${Math.max(Math.min(shipment.container.progress || 0, 100), 0)}%` }}
                      />
                    </div>
                    {shipment.container.currentLocation && (
                      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <MapPin className="h-4 w-4 text-[var(--accent-gold)]" />
                        <span>Currently at <span className="font-medium text-[var(--text-primary)]">{shipment.container.currentLocation}</span></span>
                      </div>
                    )}
                  </>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Origin</p>
                    <p className="font-medium text-[var(--text-primary)]">{shipment.container?.loadingPort || shipment.dispatch?.origin || shipment.transit?.origin || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Destination</p>
                    <p className="font-medium text-[var(--text-primary)]">{shipment.container?.destinationPort || shipment.dispatch?.destination || shipment.transit?.destination || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </DashboardPanel>

            <DashboardPanel
              title="Dispatch To Port"
              description={shipment.dispatch ? `${shipment.dispatch.origin} → ${shipment.dispatch.destination}` : 'Domestic movement before container loading'}
              actions={
                canAssignDispatch ? (
                  <button
                    onClick={() => setOpenAssignDispatch(true)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent-gold)] px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    Assign to Dispatch
                  </button>
                ) : undefined
              }
            >
              {shipment.dispatch ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-[var(--accent-gold)]" />
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      Ref: <strong>{shipment.dispatch.referenceNumber}</strong>
                    </span>
                    <span className="ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase" style={{ background: 'rgba(234,179,8,0.15)', color: 'rgb(161,98,7)', border: '1px solid rgba(234,179,8,0.35)' }}>
                      {shipment.dispatch.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Company</p>
                      <p className="font-medium">{shipment.dispatch.company.name}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Route</p>
                      <p className="font-medium">{shipment.dispatch.origin} → {shipment.dispatch.destination}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <a href={`/dashboard/dispatches/${shipment.dispatch.id}`} className="text-xs text-[var(--accent-gold)] hover:underline font-medium">
                      View Dispatch Details →
                    </a>
                    {canManageWorkflow && shipment.status === 'DISPATCHING' && (
                      <button
                        onClick={() => void handleRemoveFromDispatch()}
                        className="ml-auto text-xs text-[var(--error)] hover:underline"
                      >
                        Remove from dispatch
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                  <Truck className="h-8 w-8 text-[var(--text-secondary)] opacity-40" />
                  <p className="text-sm text-[var(--text-secondary)]">
                    {shipment.containerId || shipment.transitId
                      ? 'Dispatch stage is complete for this shipment.'
                      : 'No dispatch assigned. Use dispatch to manage the pre-port movement before container handoff.'}
                  </p>
                </div>
              )}
            </DashboardPanel>

            {/* Transit Panel */}
            <DashboardPanel
              title="Transit to Destination"
              description={shipment.transit ? `${shipment.transit.origin} → ${shipment.transit.destination}` : 'Land delivery from UAE to Afghanistan'}
              actions={
                canManageWorkflow && !shipment.transit ? (
                  <div className="flex items-center gap-2">
                    {isReleasedForTransit && !shipment.releaseToken && (
                      <button
                        onClick={() => void handleGenerateReleaseToken()}
                        disabled={creatingReleaseToken}
                        className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-gold)] disabled:opacity-50"
                      >
                        {creatingReleaseToken ? 'Generating...' : 'Generate Release Token'}
                      </button>
                    )}
                    <button
                      onClick={() => setOpenAssignTransit(true)}
                      disabled={!isReleasedForTransit}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent-gold)] px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Truck className="h-3.5 w-3.5" />
                      Assign to Transit
                    </button>
                  </div>
                ) : undefined
              }
            >
              {shipment.transit ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-[var(--accent-gold)]" />
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      Ref: <strong>{shipment.transit.referenceNumber}</strong>
                    </span>
                    <span className="ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase" style={{ background: 'rgba(99,102,241,0.15)', color: 'rgb(99,102,241)', border: '1px solid rgba(99,102,241,0.3)' }}>
                      {shipment.transit.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Company</p>
                      <p className="font-medium">{shipment.transit.company.name}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Route</p>
                      <p className="font-medium">{shipment.transit.origin} → {shipment.transit.destination}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <a href={`/dashboard/transits/${shipment.transit.id}`} className="text-xs text-[var(--accent-gold)] hover:underline font-medium">
                      View Transit Details →
                    </a>
                    {canManageWorkflow && (
                      <button
                        onClick={() => void handleRemoveFromTransit()}
                        className="ml-auto text-xs text-[var(--error)] hover:underline"
                      >
                        Remove from transit
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                  <Truck className="h-8 w-8 text-[var(--text-secondary)] opacity-40" />
                  <p className="text-sm text-[var(--text-secondary)]">
                    {isReleasedForTransit
                      ? 'Shipment is released and ready for transit assignment.'
                      : 'No transit assigned. Transit can be assigned only after shipment release.'}
                  </p>
                  {shipment.releaseToken && (
                    <div className="mt-1 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-left">
                      <p className="text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">Release Token</p>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="text-xs font-semibold text-[var(--text-primary)]">{shipment.releaseToken}</code>
                        <button
                          onClick={() => {
                            void navigator.clipboard.writeText(shipment.releaseToken || '');
                            toast.success('Release token copied');
                          }}
                          className="rounded border border-[var(--border)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-primary)] hover:border-[var(--accent-gold)]"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DashboardPanel>

            {/* Vehicle Specifications */}
            <DashboardPanel title="Vehicle Specifications">
              <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                  <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Vehicle</dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                    {`${shipment.vehicleYear || ''} ${shipment.vehicleMake || ''} ${shipment.vehicleModel || ''}`.trim() || '-'}
                  </dd>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                  <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">VIN</dt>
                  <dd className="mt-1 break-all text-sm font-semibold text-[var(--text-primary)]">{shipment.vehicleVIN || '-'}</dd>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                  <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Weight</dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.weight ? `${shipment.weight} lbs` : '-'}</dd>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                  <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Dimensions</dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.dimensions || '-'}</dd>
                </div>
              </dl>
              {shipment.internalNotes && (
                <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Internal Notes</p>
                  <p className="mt-1 text-sm text-[var(--text-primary)]">{shipment.internalNotes}</p>
                </div>
              )}
            </DashboardPanel>

            {/* Container Shipping Information */}
            {shipment.container && (
              <DashboardPanel
                title="Container Shipping Info"
                actions={
                  <Link href={`/dashboard/containers/${shipment.containerId}`}>
                    <Button variant="outline" size="sm">
                      View Container
                    </Button>
                  </Link>
                }
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                      <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Container Number</p>
                      <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">{shipment.container.containerNumber}</p>
                    </div>
                    {shipment.container.status && (
                      <span
                        className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                        style={{
                          backgroundColor: containerStatusColors[shipment.container.status]?.bg || statusStyle.bg,
                          color: containerStatusColors[shipment.container.status]?.text || statusStyle.text,
                          border: `1px solid ${containerStatusColors[shipment.container.status]?.border || statusStyle.border}`,
                        }}
                      >
                        {formatStatus(shipment.container.status)}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Shipping Progress</p>
                      <span className="text-sm font-medium text-[var(--text-primary)]">{shipment.container.progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
                      <div
                        className="h-full bg-[var(--accent-gold)] transition-all duration-500"
                        style={{ width: `${Math.max(Math.min(shipment.container.progress || 0, 100), 0)}%` }}
                      />
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-3">
                    {shipment.container.trackingNumber && (
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                        <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Tracking Number</dt>
                        <dd className="mt-1 break-all text-sm font-semibold text-[var(--text-primary)]">{shipment.container.trackingNumber}</dd>
                      </div>
                    )}
                    {shipment.container.vesselName && (
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                        <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Vessel</dt>
                        <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.container.vesselName}</dd>
                      </div>
                    )}
                    {shipment.container.shippingLine && (
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                        <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Shipping Line</dt>
                        <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.container.shippingLine}</dd>
                      </div>
                    )}
                    {shipment.container.currentLocation && (
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                        <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Current Location</dt>
                        <dd className="mt-1 flex items-center gap-1 text-sm font-semibold text-[var(--text-primary)]">
                          <MapPin className="h-3 w-3 text-[var(--accent-gold)]" />
                          {shipment.container.currentLocation}
                        </dd>
                      </div>
                    )}
                    {shipment.container.loadingPort && (
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                        <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Loading Port</dt>
                        <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.container.loadingPort}</dd>
                      </div>
                    )}
                    {shipment.container.destinationPort && (
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                        <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Destination Port</dt>
                        <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.container.destinationPort}</dd>
                      </div>
                    )}
                    {shipment.container.estimatedArrival && (
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                        <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">ETA</dt>
                        <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{new Date(shipment.container.estimatedArrival).toLocaleDateString()}</dd>
                      </div>
                    )}
                    {shipment.container.actualArrival && (
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                        <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Actual Arrival</dt>
                        <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{new Date(shipment.container.actualArrival).toLocaleDateString()}</dd>
                      </div>
                    )}
                  </dl>

                  {/* Container Tracking Timeline */}
                  {shipment.container.trackingEvents && shipment.container.trackingEvents.length > 0 && (
                    <div className="mt-6">
                      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                        <History className="h-4 w-4" />
                        Container Tracking Timeline ({shipment.container.trackingEvents.length} events)
                      </h3>
                      <div className="space-y-3">
                        {shipment.container.trackingEvents.map((event, index) => (
                          <div 
                            key={event.id}
                            className="relative pl-6"
                            style={{
                              borderLeft: index < (shipment.container?.trackingEvents.length || 0) - 1 ? '2px solid var(--border)' : 'none',
                              paddingBottom: index < (shipment.container?.trackingEvents.length || 0) - 1 ? '12px' : '0',
                            }}
                          >
                            {/* Timeline Dot */}
                            <div
                              className="absolute left-[-9px] top-0 h-4 w-4 rounded-full border-2"
                              style={{
                                backgroundColor: event.completed ? 'var(--success)' : 'var(--accent-gold)',
                                borderColor: 'var(--background)',
                              }}
                            />
                            
                            {/* Event Content */}
                            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className="font-semibold text-[var(--text-primary)] text-sm">
                                    {event.status}
                                  </p>
                                  {(event as any).vesselName && (
                                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                      🚢 {(event as any).vesselName}
                                    </p>
                                  )}
                                  {event.location && (
                                    <p className="mt-1 flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                                      <MapPin className="h-3 w-3" />
                                      {event.location}
                                    </p>
                                  )}
                                  {event.description && (
                                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                      {event.description}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-medium text-[var(--text-primary)]">
                                    {new Date(event.eventDate).toLocaleDateString()}
                                  </p>
                                  <p className="text-xs text-[var(--text-secondary)]">
                                    {new Date(event.eventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                  {(event as any).source && (
                                    <p className="mt-1 text-xs italic text-[var(--text-tertiary)]">
                                      Source: {(event as any).source}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DashboardPanel>
            )}

            {/* Financial Snapshot */}
            <DashboardPanel title="Financial Snapshot">
              <div className="space-y-4">
                {(shipment.damageCost || shipment.damageCredit) && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Damage Accountability</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {isAdmin && shipment.damageCost && (
                        <span className="rounded-full border border-[var(--error)]/35 bg-[var(--error)]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--error)]">
                          Charged To Company Ledger
                        </span>
                      )}
                      {shipment.damageCredit && (
                        <span className="rounded-full border border-[var(--success)]/35 bg-[var(--success)]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--success)]">
                          Credited To Customer Invoice/Receipt
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {hasPermission(session?.user?.role, 'finance:manage') && shipment.purchasePrice != null && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Car Purchase Amount</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">${shipment.purchasePrice.toFixed(2)}</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">Price company paid for the vehicle</p>
                  </div>
                )}
                {shipment.price && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Customer Shipping Fare</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">${shipment.price.toFixed(2)}</p>
                  </div>
                )}
                {isAdmin && shipment.companyShippingFare && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Company Shipping Cost</p>
                    <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">${shipment.companyShippingFare.toFixed(2)}</p>
                  </div>
                )}
                {shipment.insuranceValue && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Insurance Value</p>
                    <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">${shipment.insuranceValue.toFixed(2)}</p>
                  </div>
                )}
                {shipment.damageCredit && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Damage Credit (Discount)</p>
                    <p className="mt-1 text-lg font-semibold text-[var(--success)]">-${shipment.damageCredit.toFixed(2)}</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">Company absorbed damage cost</p>
                  </div>
                )}
                {isAdmin && shipment.damageCost && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Damage Cost to Company</p>
                    <p className="mt-1 text-lg font-semibold text-[var(--error)]">${shipment.damageCost.toFixed(2)}</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">Charged to company ledger</p>
                  </div>
                )}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Created On</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{new Date(shipment.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </DashboardPanel>

            {/* Delivery Timeline */}
            <DashboardPanel title="Delivery Timeline">
              <div className="space-y-4">
                {shipment.container?.estimatedArrival && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Estimated Arrival</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{new Date(shipment.container.estimatedArrival).toLocaleDateString()}</p>
                  </div>
                )}
                {shipment.container?.actualArrival && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Actual Arrival</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{new Date(shipment.container.actualArrival).toLocaleDateString()}</p>
                  </div>
                )}
                {!shipment.container && (
                  <p className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-6 text-center text-sm text-[var(--text-secondary)]">
                    Delivery timeline will be available once assigned to a container.
                  </p>
                )}
              </div>
            </DashboardPanel>

            {/* Customer Information (Admin) */}
            {isAdmin && (
              <DashboardPanel title="Customer Information">
                <div className="space-y-4">
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Name</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.user.name || 'N/A'}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Email</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.user.email}</p>
                  </div>
                  {shipment.user.phone && (
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                      <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Phone</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.user.phone}</p>
                    </div>
                  )}
                </div>
              </DashboardPanel>
            )}
          </DashboardGrid>
        </TabPanel>

        {/* Timeline Tab */}
        <TabPanel value={activeTab} index={1}>
          <DashboardPanel
            title="Unified Shipment Timeline"
            description="Merged workflow events, status changes, container milestones, and ledger activity in one chronology"
          >
            <UnifiedShipmentTimeline
              items={shipment.unifiedTimeline || []}
              onOpenCompanyLedgerEntry={(companyId, entryId) => {
                router.push(`/dashboard/finance/companies/${companyId}?entryId=${entryId}`);
              }}
            />
          </DashboardPanel>
        </TabPanel>

        {/* Photos Tab */}
        <TabPanel value={activeTab} index={2}>
          <div className="space-y-6">
            {/* Vehicle Photos */}
            <DashboardPanel title={`Vehicle Photos${shipment.vehiclePhotos?.length ? ' (' + shipment.vehiclePhotos.length + ')' : ''}`}>
              <PhotoGallery
                photos={(shipment.vehiclePhotos || []).map(url => ({ url, label: 'Vehicle' }))}
                onPhotoClick={(idx) => openLightbox(shipment.vehiclePhotos, idx, 'Vehicle Photos')}
                onDownloadSingle={(url, idx) => downloadPhoto(url, idx)}
                onDownloadAll={(urls) => downloadAllPhotos(urls, 'Vehicle Photos')}
              />
            </DashboardPanel>

            {/* Arrival Photos */}
            <DashboardPanel title={`Arrival Photos${arrivalPhotos.length ? ' (' + arrivalPhotos.length + ')' : ''}`}>
              <PhotoGallery
                photos={arrivalPhotos.map(url => ({ url, label: 'Arrival' }))}
                onPhotoClick={(idx) => openLightbox(arrivalPhotos, idx, 'Arrival Photos')}
                onDownloadSingle={(url, idx) => downloadPhoto(url, idx)}
                onDownloadAll={(urls) => downloadAllPhotos(urls, 'Arrival Photos')}
                canUpload={canUploadArrivalPhotos}
                onUpload={handleArrivalPhotosUpload}
                onDelete={canUploadArrivalPhotos ? removeArrivalPhoto : undefined}
                uploading={uploading}
                uploadProgress={uploadProgress}
                uploadLabel="Add Arrival Photos"
              />
            </DashboardPanel>
          </div>
        </TabPanel>

        {/* Documents Tab */}
        <TabPanel value={activeTab} index={3}>
          <DashboardPanel title="Shipment Documents" description="Manage all documents related to this shipment">
            <DocumentManager 
              documents={(shipment.documents || []).map(d => ({
                ...d,
                type: d.fileType,
                size: d.fileSize,
                url: d.fileUrl,
                category: d.category || 'OTHER'
              }))}
              entityId={shipment.id}
              entityType="shipment"
              readOnly={!isAdmin && shipment.userId !== session?.user?.id}
              onDocumentsChange={() => {
                void refreshShipmentPage();
              }}
            />
          </DashboardPanel>
        </TabPanel>

        {/* Financials Tab */}
        <TabPanel value={activeTab} index={4}>
          <DashboardPanel 
            title="Shipment Financials" 
            description="Costs and expenses associated with this shipment"
            actions={
              canManageShipmentExpenses ? (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button
                      size="sm"
                      icon={<DollarSign className="h-4 w-4" />}
                      onClick={() => setExpenseAction({
                        modalTitle: 'Add Shipment Expense',
                        contextType: expenseContextType,
                        contextId: expenseContextId,
                      })}
                      disabled={!canAddShipmentExpense}
                    >
                      Shipment Expense
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Truck className="h-4 w-4" />}
                      onClick={() => setExpenseAction({
                        modalTitle: 'Add Dispatch Expense',
                        contextType: 'DISPATCH',
                        contextId: shipment?.dispatchId || undefined,
                      })}
                      disabled={!canAddDispatchExpense}
                    >
                      Dispatch Expense
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Ship className="h-4 w-4" />}
                      onClick={() => setExpenseAction({
                        modalTitle: 'Add Transit Expense',
                        contextType: 'TRANSIT',
                        contextId: shipment?.transitId || undefined,
                      })}
                      disabled={!canAddTransitExpense}
                    >
                      Transit Expense
                    </Button>
                  </div>
              ) : undefined
            }
          >
            <div className="space-y-4">
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                    <h3 className="mb-2 text-sm font-semibold uppercase text-[var(--text-secondary)]">Expense Actions</h3>
                    <p className="text-sm text-[var(--text-secondary)]">{expenseActionHelpText}</p>
                  </div>

                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                  <h3 className="mb-2 text-sm font-semibold uppercase text-[var(--text-secondary)]">Expense Posting Target</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{expenseLedgerHelpText}</p>
                </div>

                {canViewLedgerComparison && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                    <h3 className="mb-3 text-sm font-semibold uppercase text-[var(--text-secondary)]">Ledger Comparison</h3>
                    <p className="mb-4 text-xs text-[var(--text-secondary)]">
                      Compare what the company charged on this shipment versus what was charged to the customer.
                    </p>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
                        <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Company Charged Me (Net)</p>
                        <p className="mt-1 text-lg font-semibold text-[var(--error)]">${companyChargedForComparison.toFixed(2)}</p>
                        <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                          Debits ${companyLedgerDebitsTotal.toFixed(2)} - Credits ${companyLedgerCreditsTotal.toFixed(2)}
                        </p>
                      </div>

                      <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
                        <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Charged To Customer (Net)</p>
                        <p className="mt-1 text-lg font-semibold text-[var(--success)]">${customerChargedForComparison.toFixed(2)}</p>
                        <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                          Debits ${userLedgerDebitsTotal.toFixed(2)} - Credits ${userLedgerCreditsTotal.toFixed(2)}
                        </p>
                      </div>

                      <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
                        <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Difference (Customer - Company)</p>
                        <p
                          className={cn(
                            'mt-1 text-lg font-semibold',
                            netDifference >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'
                          )}
                        >
                          ${netDifference.toFixed(2)}
                        </p>
                        <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                          Based on ledger transactions linked to this shipment.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border)]">
                      <div className="grid grid-cols-12 border-b border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                        <div className="col-span-2">Source</div>
                        <div className="col-span-2">Date</div>
                        <div className="col-span-6">Description</div>
                        <div className="col-span-2 text-right">Amount</div>
                      </div>
                      {comparisonTransactions.length > 0 ? (
                        <div className="max-h-72 overflow-y-auto">
                          {comparisonTransactionsWithDrillDown.map((entry) => (
                            <div key={entry.id} className="grid grid-cols-12 items-center border-b border-[var(--border)] px-3 py-2 text-xs last:border-b-0">
                              <div className="col-span-2">
                                <span
                                  className={cn(
                                    'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                    entry.source === 'COMPANY'
                                      ? 'border border-[var(--error)]/35 bg-[var(--error)]/10 text-[var(--error)]'
                                      : 'border border-[var(--success)]/35 bg-[var(--success)]/10 text-[var(--success)]'
                                  )}
                                >
                                  {entry.source}
                                </span>
                              </div>
                              <div className="col-span-2 text-[var(--text-secondary)]">
                                {new Date(entry.transactionDate).toLocaleDateString()}
                              </div>
                              <div className="col-span-6 truncate text-[var(--text-primary)]" title={entry.description}>
                                <div className="flex items-center gap-2">
                                  <span className="truncate">{entry.description}</span>
                                  {entry.source === 'COMPANY' && entry.companyLedgerEntry && (
                                    <button
                                      type="button"
                                      onClick={() => openCompanyLedgerEntry(entry.companyLedgerEntry!)}
                                      className="shrink-0 rounded border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-gold)] hover:border-[var(--accent-gold)]"
                                    >
                                      View Entry
                                    </button>
                                  )}
                                  {entry.source === 'CUSTOMER' && entry.linkedCompanyLedgerEntry && (
                                    <button
                                      type="button"
                                      onClick={() => openCompanyLedgerEntry(entry.linkedCompanyLedgerEntry!)}
                                      className="shrink-0 rounded border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-gold)] hover:border-[var(--accent-gold)]"
                                    >
                                      Company Entry
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div
                                className={cn(
                                  'col-span-2 text-right font-semibold',
                                  entry.type === 'DEBIT' ? 'text-[var(--error)]' : 'text-[var(--success)]'
                                )}
                              >
                                {entry.type === 'DEBIT' ? '+' : '-'}${entry.amount.toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-3 py-4 text-sm text-[var(--text-secondary)]">
                          No ledger transactions linked to this shipment yet.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Base Costs */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                    <h3 className="mb-3 text-sm font-semibold uppercase text-[var(--text-secondary)]">Base Costs</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-[var(--text-primary)]">Vehicle Price</span>
                            <span className="text-sm font-medium">{shipment.price ? `$${shipment.price.toFixed(2)}` : '-'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-[var(--text-primary)]">Insurance</span>
                            <span className="text-sm font-medium">{shipment.insuranceValue ? `$${shipment.insuranceValue.toFixed(2)}` : '-'}</span>
                        </div>
                    </div>
                </div>

                {/* Expenses */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                    <h3 className="mb-3 text-sm font-semibold uppercase text-[var(--text-secondary)]">Additional Expenses</h3>
                  {classifiedShipmentExpenseData.entries.length > 0 ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            {(['DISPATCH', 'SHIPMENT', 'TRANSIT'] as ClassifiedExpenseSource[]).map((source) => (
                              <div key={source} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{expenseSourceLabels[source]}</p>
                                    <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                                      ${classifiedShipmentExpenseData.totals[source].toFixed(2)}
                                    </p>
                                  </div>
                                  <span
                                    className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                                    style={{
                                      backgroundColor: expenseSourceStyles[source].bg,
                                      color: expenseSourceStyles[source].text,
                                      border: `1px solid ${expenseSourceStyles[source].border}`,
                                    }}
                                  >
                                    {classifiedShipmentExpenseData.counts[source]} item{classifiedShipmentExpenseData.counts[source] === 1 ? '' : 's'}
                                  </span>
                                </div>
                                <p className="mt-2 text-xs text-[var(--text-secondary)]">{expenseSourceDescriptions[source]}</p>
                              </div>
                            ))}
                          </div>

                          <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Expense Source Filter</p>
                                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                  Showing ${filteredShipmentExpenseTotal.toFixed(2)} of ${classifiedShipmentExpenseData.total.toFixed(2)} total tracked expense.
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {([
                                  { value: 'ALL', label: 'All Sources' },
                                  { value: 'DISPATCH', label: 'Dispatch' },
                                  { value: 'SHIPMENT', label: 'Shipping' },
                                  { value: 'TRANSIT', label: 'Transit' },
                                ] as Array<{ value: ExpenseSourceFilter; label: string }>).map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setExpenseSourceFilter(option.value)}
                                    className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                                    style={{
                                      backgroundColor: expenseSourceFilter === option.value ? 'rgba(var(--accent-gold-rgb), 0.16)' : 'var(--panel)',
                                      color: expenseSourceFilter === option.value ? 'var(--accent-gold)' : 'var(--text-secondary)',
                                      border: expenseSourceFilter === option.value
                                        ? '1px solid rgba(var(--accent-gold-rgb), 0.32)'
                                        : '1px solid var(--border)',
                                    }}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                        {expenseEntriesWithCompanyLedger.map((entry) => (
                                <div key={entry.id} className="flex justify-between gap-4 border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="text-sm font-medium text-[var(--text-primary)]">{entry.description}</p>
                                          <span
                                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                                            style={{
                                              backgroundColor: expenseSourceStyles[entry.source].bg,
                                              color: expenseSourceStyles[entry.source].text,
                                              border: `1px solid ${expenseSourceStyles[entry.source].border}`,
                                            }}
                                          >
                                            {expenseSourceLabels[entry.source]}
                                          </span>
                                          {entry.linkedCompanyLedgerEntry && canViewLedgerComparison && (
                                            <button
                                              type="button"
                                              onClick={() => openCompanyLedgerEntry(entry.linkedCompanyLedgerEntry!)}
                                              className="rounded border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-gold)] hover:border-[var(--accent-gold)]"
                                            >
                                              Company Ledger
                                            </button>
                                          )}
                                        </div>
                                        <p className="text-xs text-[var(--text-secondary)]">{new Date(entry.transactionDate).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                      <span className="text-sm font-medium text-[var(--error)]">
                                          ${entry.amount.toFixed(2)}
                                      </span>
                                      {canManageShipmentExpenses && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteExpense(entry.id)}
                                          disabled={deletingExpenseId === entry.id}
                                          className="flex items-center justify-center rounded p-1 text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50 transition-colors"
                                          title="Delete expense"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                </div>
                            ))}
                        </div>
                            </div>
                    ) : (
                        <p className="text-sm text-[var(--text-secondary)] italic">No additional expenses recorded.</p>
                    )}
                </div>

                {/* Total */}
                <div className="flex justify-between rounded-lg bg-[var(--accent-gold)]/10 p-4">
                    <span className="font-bold text-[var(--accent-gold)]">Total Estimated Cost</span>
                    <span className="font-bold text-[var(--accent-gold)]">
                        ${(
                            (shipment.price || 0) + 
                            (shipment.insuranceValue || 0) + 
                            userLedgerDebitsTotal
                        ).toFixed(2)}
                    </span>
                </div>
            </div>
          </DashboardPanel>
        </TabPanel>

        {/* Damages Tab */}
        <TabPanel value={activeTab} index={5}>
          <DashboardPanel title="Shipment Damages" description="Damage records logged for this shipment from container operations">
            {shipment.containerDamages && shipment.containerDamages.length > 0 ? (
              <div className="space-y-3">
                {shipment.containerDamages.map((damage) => (
                  <div key={damage.id} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{damage.description}</p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          Added on {new Date(damage.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
                          style={{
                            background: damage.damageType === 'WE_PAY' ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.15)',
                            color: damage.damageType === 'WE_PAY' ? 'rgb(34,197,94)' : 'rgb(249,115,22)',
                            border: damage.damageType === 'WE_PAY' ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(249,115,22,0.35)',
                          }}
                        >
                          {damage.damageType === 'WE_PAY' ? 'We Pay (Customer Credit)' : 'Company Pays'}
                        </span>
                        <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">${damage.amount.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-[var(--border)] bg-[var(--background)] py-8 text-center text-sm text-[var(--text-secondary)]">
                No damages have been recorded for this shipment.
              </p>
            )}
          </DashboardPanel>
        </TabPanel>

        {/* Details Tab */}
        <TabPanel value={activeTab} index={6}>
          <DashboardGrid className="grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Vehicle Information */}
            <DashboardPanel title="Vehicle Information">
              <dl className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                  <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Vehicle Type</dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{formatStatus(shipment.vehicleType)}</dd>
                </div>
                {shipment.vehicleMake && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Make</dt>
                    <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.vehicleMake}</dd>
                  </div>
                )}
                {shipment.vehicleModel && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Model</dt>
                    <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.vehicleModel}</dd>
                  </div>
                )}
                {shipment.vehicleYear && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Year</dt>
                    <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.vehicleYear}</dd>
                  </div>
                )}
                {shipment.vehicleVIN && (
                  <div className="col-span-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">VIN</dt>
                    <dd className="mt-1 break-all text-sm font-semibold text-[var(--text-primary)]">{shipment.vehicleVIN}</dd>
                  </div>
                )}
                {shipment.hasKey !== null && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Has Key</dt>
                    <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.hasKey ? 'Yes' : 'No'}</dd>
                  </div>
                )}
                {shipment.hasTitle !== null && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Has Title</dt>
                    <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.hasTitle ? 'Yes' : 'No'}</dd>
                  </div>
                )}
              </dl>
            </DashboardPanel>

            {/* Additional Details */}
            <DashboardPanel title="Additional Details">
              <dl className="grid grid-cols-1 gap-4">
                {shipment.lotNumber && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Lot Number</dt>
                    <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.lotNumber}</dd>
                  </div>
                )}
                {shipment.auctionName && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Auction Name</dt>
                    <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.auctionName}</dd>
                  </div>
                )}
                {shipment.vehicleColor && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Color</dt>
                    <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.vehicleColor}</dd>
                  </div>
                )}
                {shipment.weight && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Weight</dt>
                    <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.weight} lbs</dd>
                  </div>
                )}
                {shipment.dimensions && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Dimensions</dt>
                    <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.dimensions}</dd>
                  </div>
                )}
                {shipment.internalNotes && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Internal Notes</dt>
                    <dd className="mt-1 text-sm text-[var(--text-primary)]">{shipment.internalNotes}</dd>
                  </div>
                )}
              </dl>
            </DashboardPanel>
          </DashboardGrid>
        </TabPanel>

        {isAdmin && (
          <TabPanel value={activeTab} index={7}>
            <DashboardPanel
              title="Activity History"
              description="Audit log of shipment updates, assignments, and status changes"
            >
              <ActivityLog logs={shipment.auditLogs || []} />
            </DashboardPanel>
          </TabPanel>
        )}

        {/* Customer Tab (Admin Only) */}
        {isAdmin && (
          <TabPanel value={activeTab} index={8}>
            <DashboardPanel title="Customer Information">
              <div className="space-y-4">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Name</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.user.name || 'N/A'}</p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Email</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.user.email}</p>
                </div>
                {shipment.user.phone && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Phone</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.user.phone}</p>
                  </div>
                )}
              </div>
            </DashboardPanel>
          </TabPanel>
        )}
      </DashboardSurface>

      {/* Photo Lightbox */}
      {lightbox && (
        <PhotoLightbox
          images={lightbox.images}
          index={lightbox.index}
          title={lightbox.title}
          canDelete={canUploadArrivalPhotos && lightbox.title === 'Arrival Photos'}
          onClose={() => setLightbox(null)}
          onNavigate={(idx) => setLightbox(prev => prev ? { ...prev, index: idx } : prev)}
          onDelete={canUploadArrivalPhotos ? handleLightboxDelete : undefined}
          onDownload={downloadPhoto}
          downloading={downloading}
        />
      )}

      {/* Assign to Transit Dialog */}
      {canManageWorkflow && (
        <Dialog open={openAssignDispatch} onClose={() => !assigningDispatch && setOpenAssignDispatch(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Assign Shipment to Dispatch</DialogTitle>
          <DialogContent sx={{ pt: 1.5 }}>
            <TextField
              select
              fullWidth
              label="Dispatch"
              value={dispatchIdToAssign}
              onChange={(e) => setDispatchIdToAssign(e.target.value)}
              helperText={loadingDispatches ? 'Loading pending dispatches...' : 'Select a dispatch route for this shipment'}
              size="small"
              disabled={loadingDispatches || assigningDispatch}
            >
              {availableDispatches.map((dispatch) => (
                <MenuItem key={dispatch.id} value={dispatch.id}>
                  {dispatch.referenceNumber} - {dispatch.company.name} ({dispatch.origin} → {dispatch.destination})
                </MenuItem>
              ))}
            </TextField>
            {!loadingDispatches && availableDispatches.length === 0 && (
              <p className="mt-3 text-sm text-[var(--text-secondary)]">No pending dispatches are available.</p>
            )}
          </DialogContent>
          <DialogActions>
            <button onClick={() => setOpenAssignDispatch(false)} disabled={assigningDispatch} style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
            <button onClick={() => void handleAssignDispatch()} disabled={assigningDispatch || loadingDispatches || !dispatchIdToAssign} style={{ padding: '6px 16px', borderRadius: 6, background: 'var(--accent-gold)', border: 'none', cursor: 'pointer', fontWeight: 600, color: '#000' }}>
              {assigningDispatch ? 'Assigning...' : 'Assign'}
            </button>
          </DialogActions>
        </Dialog>
      )}

      {canManageWorkflow && (
        <Dialog open={openAssignTransit} onClose={() => !assigningTransit && setOpenAssignTransit(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Assign Shipment to Transit</DialogTitle>
          <DialogContent sx={{ pt: 1.5 }}>
            <TextField
              fullWidth
              label="Transit ID"
              value={transitIdToAssign}
              onChange={(e) => setTransitIdToAssign(e.target.value)}
              helperText="Paste the transit ID from the Transits page"
              size="small"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Release Token"
              type={showReleaseToken ? 'text' : 'password'}
              value={releaseTokenToAssign}
              onChange={(e) => setReleaseTokenToAssign(e.target.value)}
              helperText="Paste the shipment release token to verify"
              size="small"
              InputProps={{
                endAdornment: (
                  <button
                    type="button"
                    onClick={() => setShowReleaseToken((prev) => !prev)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
                  >
                    {showReleaseToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                ),
              }}
            />
          </DialogContent>
          <DialogActions>
            <button onClick={() => setOpenAssignTransit(false)} disabled={assigningTransit} style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
            <button onClick={() => void handleAssignTransit()} disabled={assigningTransit} style={{ padding: '6px 16px', borderRadius: 6, background: 'var(--accent-gold)', border: 'none', cursor: 'pointer', fontWeight: 600, color: '#000' }}>
              {assigningTransit ? 'Assigning...' : 'Assign'}
            </button>
          </DialogActions>
        </Dialog>
      )}

      {shipment && (
        <AddShipmentExpenseModal
          open={Boolean(expenseAction)}
          onClose={() => setExpenseAction(null)}
          shipments={[{
            id: shipment.id,
            vehicleMake: shipment.vehicleMake,
            vehicleModel: shipment.vehicleModel,
            vehicleVIN: shipment.vehicleVIN,
            user: shipment.user,
          }]}
          modalTitle={expenseAction?.modalTitle}
          contextType={expenseAction?.contextType}
          contextId={expenseAction?.contextId}
          onSuccess={() => {
            void refreshShipmentPage();
          }}
        />
      )}
    </ProtectedRoute>
  );
}
