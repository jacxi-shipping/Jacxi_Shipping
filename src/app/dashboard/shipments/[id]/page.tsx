'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
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
  AlertTriangle,
} from 'lucide-react';
import { Tabs, Tab, Box } from '@mui/material';
import { Breadcrumbs, toast, EmptyState, Tooltip, StatusBadge } from '@/components/design-system';

import ShipmentDetailOverlays from '@/components/shipments/ShipmentDetailOverlays';
import ShipmentActivityTab from '@/components/shipments/ShipmentActivityTab';
import ShipmentCustomerTab from '@/components/shipments/ShipmentCustomerTab';
import ShipmentDamagesTab from '@/components/shipments/ShipmentDamagesTab';
import ShipmentDetailsTab from '@/components/shipments/ShipmentDetailsTab';
import ShipmentBillingTab from '@/components/shipments/ShipmentBillingTab';
import ShipmentDocumentsTab from '@/components/shipments/ShipmentDocumentsTab';
import ShipmentFinancialsTab from '@/components/shipments/ShipmentFinancialsTab';
import ShipmentOverviewTab from '@/components/shipments/ShipmentOverviewTab';
import ShipmentPhotosTab from '@/components/shipments/ShipmentPhotosTab';
import ShipmentTimelineTab from '@/components/shipments/ShipmentTimelineTab';
import ShipmentWorkflowStrip from '@/components/shipments/ShipmentWorkflowStrip';
import { downloadShipmentInvoicePDF } from '@/lib/utils/generateShipmentInvoicePDF';
import { downloadReleaseTokenPDF } from '@/lib/utils/generateReleaseTokenPDF';
import { hasAnyPermission, hasPermission } from '@/lib/rbac';
import type {
  AvailableDispatchOption,
  ClassifiedExpenseSource,
  ComparisonTransactionWithDrillDown,
  ExpenseActionContext,
  ExpenseSourceFilter,
  LinkedCompanyLedgerEntry,
  Shipment,
  ShipmentPhotoLightboxState,
  StatusColors,
} from '@/components/shipments/shipment-detail-types';

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
  const [lightbox, setLightbox] = useState<ShipmentPhotoLightboxState>(null);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [openAssignDispatch, setOpenAssignDispatch] = useState(false);
  const [openAssignTransit, setOpenAssignTransit] = useState(false);
  const [dispatchIdToAssign, setDispatchIdToAssign] = useState('');
  const [transitIdToAssign, setTransitIdToAssign] = useState('');
  const [releaseTokenToAssign, setReleaseTokenToAssign] = useState('');
  const [showReleaseToken, setShowReleaseToken] = useState(false);
  const [availableDispatches, setAvailableDispatches] = useState<AvailableDispatchOption[]>([]);
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
  const canViewPurchasePrice = hasPermission(session?.user?.role, 'finance:manage');
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
  const canAddShipmentExpense = Boolean(shipment?.containerId || shipment?.dispatchId || (shipment?.transitId && shipment?.transit?.currentCompany));
  const canAddDispatchExpense = Boolean(shipment?.dispatchId);
  const canAddTransitExpense = Boolean(shipment?.transitId && shipment?.transit?.currentCompany);
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
    : shipment?.transit?.currentCompany
    ? `Expenses from this page will recover against the current transit event company ledger for ${shipment.transit.referenceNumber}.`
    : shipment?.dispatch
    ? `Expenses from this page will recover against the dispatch company ledger for ${shipment.dispatch.referenceNumber}.`
    : 'Assign this shipment to a dispatch or container company, or add a transit event company, before posting expenses.';
  const expenseActionHelpText = [
    'Shipment Expense uses the shipment\'s primary accounting route.',
    canAddDispatchExpense ? `Dispatch Expense posts to dispatch ${shipment?.dispatch?.referenceNumber}.` : 'Dispatch Expense is available after dispatch assignment.',
    canAddTransitExpense ? `Transit Expense posts to the current transit event for ${shipment?.transit?.referenceNumber}.` : 'Transit Expense is available after transit assignment and event company setup.',
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
    () => {
      const companyEntries: ComparisonTransactionWithDrillDown[] = companyLedgerEntries.map((entry) => ({
        id: `company-${entry.id}`,
        source: 'COMPANY',
        companyLedgerEntry: entry,
        transactionDate: entry.transactionDate,
        description: entry.description,
        type: entry.type,
        amount: entry.amount,
      }));

      const customerEntries: ComparisonTransactionWithDrillDown[] = (shipment?.ledgerEntries || []).map((entry) => ({
        id: `customer-${entry.id}`,
        source: 'CUSTOMER',
        transactionDate: entry.transactionDate,
        description: entry.description,
        type: entry.type,
        amount: entry.amount,
        userLedgerEntryId: entry.id,
        linkedCompanyLedgerEntry: linkedCompanyLedgerEntriesByUserEntryId.get(entry.id) || null,
      }));

      return [...companyEntries, ...customerEntries].sort(
        (left, right) => new Date(right.transactionDate).getTime() - new Date(left.transactionDate).getTime()
      );
    },
    [companyLedgerEntries, linkedCompanyLedgerEntriesByUserEntryId, shipment?.ledgerEntries]
  );

  const purchasePriceRecord = useMemo(() => {
    const ledgerEntry = (shipment?.ledgerEntries || []).find((entry) => {
      const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
      return metadata.isShipmentPurchasePrice === true;
    });

    if (ledgerEntry) {
      return {
        description: ledgerEntry.description,
        amount: ledgerEntry.amount,
        transactionDate: ledgerEntry.transactionDate,
      };
    }

    if (shipment?.serviceType === 'PURCHASE_AND_SHIPPING' && typeof shipment.purchasePrice === 'number' && shipment.purchasePrice > 0) {
      const vehicleLabel = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
        .filter(Boolean)
        .join(' ')
        .trim();
      const vinSuffix = shipment.vehicleVIN ? ` (VIN: ${shipment.vehicleVIN})` : '';

      return {
        description: `Car purchase price for ${vehicleLabel || 'shipment'}${vinSuffix}`,
        amount: shipment.purchasePrice,
        transactionDate: shipment.updatedAt,
      };
    }

    return null;
  }, [shipment]);

  const openCompanyLedgerEntry = useCallback((entry: LinkedCompanyLedgerEntry) => {
    router.push(`/dashboard/finance/companies/${entry.companyId}?entryId=${entry.id}`);
  }, [router]);

  const totalEstimatedCost = (shipment?.price || 0) + (shipment?.insuranceValue || 0) + userLedgerDebitsTotal;

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
                <Tooltip title="Download a PDF receipt for this shipment. For official invoices, use the Billing tab on this shipment.">
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
            <Tab icon={<Wallet className="h-4 w-4" />} iconPosition="start" label="Billing" />
            <Tab icon={<AlertTriangle className="h-4 w-4" />} iconPosition="start" label={`Damages (${shipment.containerDamages?.length || 0})`} />
            <Tab icon={<PackageCheck className="h-4 w-4" />} iconPosition="start" label="Details" />
            {isAdmin && <Tab icon={<History className="h-4 w-4" />} iconPosition="start" label="Activity" />}
            {isAdmin && <Tab icon={<User className="h-4 w-4" />} iconPosition="start" label="Customer" />}
          </Tabs>
        </Box>

        {/* Tab Content */}
        <TabPanel value={activeTab} index={0}>
          <ShipmentOverviewTab
            shipment={shipment}
            statusStyle={statusStyle}
            containerStatusColors={containerStatusColors}
            isAdmin={isAdmin}
            canAssignDispatch={canAssignDispatch}
            canManageWorkflow={canManageWorkflow}
            canViewPurchasePrice={canViewPurchasePrice}
            isReleasedForTransit={isReleasedForTransit}
            creatingReleaseToken={creatingReleaseToken}
            formatStatus={formatStatus}
            onOpenAssignDispatch={() => setOpenAssignDispatch(true)}
            onOpenAssignTransit={() => setOpenAssignTransit(true)}
            onGenerateReleaseToken={() => {
              void handleGenerateReleaseToken();
            }}
            onRemoveFromDispatch={() => {
              void handleRemoveFromDispatch();
            }}
            onRemoveFromTransit={() => {
              void handleRemoveFromTransit();
            }}
          />
        </TabPanel>

        {/* Timeline Tab */}
        <TabPanel value={activeTab} index={1}>
          <ShipmentTimelineTab
            items={shipment.unifiedTimeline || []}
            onOpenCompanyLedgerEntry={(companyId, entryId) => {
              router.push(`/dashboard/finance/companies/${companyId}?entryId=${entryId}`);
            }}
          />
        </TabPanel>

        {/* Photos Tab */}
        <TabPanel value={activeTab} index={2}>
          <ShipmentPhotosTab
            vehiclePhotos={shipment.vehiclePhotos || []}
            arrivalPhotos={arrivalPhotos}
            canUploadArrivalPhotos={canUploadArrivalPhotos}
            uploading={uploading}
            uploadProgress={uploadProgress}
            onVehiclePhotoClick={(idx) => openLightbox(shipment.vehiclePhotos || [], idx, 'Vehicle Photos')}
            onArrivalPhotoClick={(idx) => openLightbox(arrivalPhotos, idx, 'Arrival Photos')}
            onDownloadSingle={downloadPhoto}
            onDownloadAll={downloadAllPhotos}
            onUploadArrivalPhotos={handleArrivalPhotosUpload}
            onRemoveArrivalPhoto={removeArrivalPhoto}
          />
        </TabPanel>

        {/* Documents Tab */}
        <TabPanel value={activeTab} index={3}>
          <ShipmentDocumentsTab
            documents={shipment.documents || []}
            shipmentId={shipment.id}
            readOnly={!isAdmin && shipment.userId !== session?.user?.id}
            onDocumentsChange={() => {
              void refreshShipmentPage();
            }}
          />
        </TabPanel>

        {/* Financials Tab */}
        <TabPanel value={activeTab} index={4}>
          <ShipmentFinancialsTab
            shipment={shipment}
            canManageShipmentExpenses={canManageShipmentExpenses}
            canAddShipmentExpense={canAddShipmentExpense}
            canAddDispatchExpense={canAddDispatchExpense}
            canAddTransitExpense={canAddTransitExpense}
            canViewLedgerComparison={canViewLedgerComparison}
            expenseActionHelpText={expenseActionHelpText}
            expenseLedgerHelpText={expenseLedgerHelpText}
            companyChargedForComparison={companyChargedForComparison}
            companyLedgerDebitsTotal={companyLedgerDebitsTotal}
            companyLedgerCreditsTotal={companyLedgerCreditsTotal}
            customerChargedForComparison={customerChargedForComparison}
            userLedgerDebitsTotal={userLedgerDebitsTotal}
            userLedgerCreditsTotal={userLedgerCreditsTotal}
            netDifference={netDifference}
            comparisonTransactions={comparisonTransactionsWithDrillDown}
            classifiedShipmentExpenseData={classifiedShipmentExpenseData}
            filteredShipmentExpenseTotal={filteredShipmentExpenseTotal}
            expenseSourceFilter={expenseSourceFilter}
            expenseEntriesWithCompanyLedger={expenseEntriesWithCompanyLedger}
            deletingExpenseId={deletingExpenseId}
            totalEstimatedCost={totalEstimatedCost}
            expenseSourceLabels={expenseSourceLabels}
            expenseSourceDescriptions={expenseSourceDescriptions}
            expenseSourceStyles={expenseSourceStyles}
            onOpenShipmentExpense={() => setExpenseAction({
              modalTitle: 'Add Shipment Expense',
              contextType: expenseContextType,
              contextId: expenseContextId,
            })}
            onOpenDispatchExpense={() => setExpenseAction({
              modalTitle: 'Add Dispatch Expense',
              contextType: 'DISPATCH',
              contextId: shipment?.dispatchId || undefined,
            })}
            onOpenTransitExpense={() => setExpenseAction({
              modalTitle: 'Add Transit Expense',
              contextType: 'TRANSIT',
              contextId: shipment?.transitId || undefined,
            })}
            onExpenseSourceFilterChange={setExpenseSourceFilter}
            onOpenCompanyLedgerEntry={openCompanyLedgerEntry}
            onDeleteExpense={(entryId) => {
              void handleDeleteExpense(entryId);
            }}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={5}>
          <ShipmentBillingTab
            shipmentId={shipment.id}
            refreshKey={`${shipment.updatedAt}-${shipment.ledgerEntries.length}-${shipment.containerDamages.length}`}
            purchasePriceRecord={purchasePriceRecord}
          />
        </TabPanel>

        {/* Damages Tab */}
        <TabPanel value={activeTab} index={6}>
          <ShipmentDamagesTab damages={shipment.containerDamages || []} />
        </TabPanel>

        {/* Details Tab */}
        <TabPanel value={activeTab} index={7}>
          <ShipmentDetailsTab shipment={shipment} formatStatus={formatStatus} />
        </TabPanel>

        {isAdmin && (
          <TabPanel value={activeTab} index={8}>
            <ShipmentActivityTab logs={shipment.auditLogs || []} />
          </TabPanel>
        )}

        {/* Customer Tab (Admin Only) */}
        {isAdmin && (
          <TabPanel value={activeTab} index={9}>
            <ShipmentCustomerTab user={shipment.user} shipmentId={shipment.id} />
          </TabPanel>
        )}
      </DashboardSurface>

      <ShipmentDetailOverlays
        lightbox={lightbox}
        canDeleteArrivalLightbox={Boolean(canUploadArrivalPhotos && lightbox?.title === 'Arrival Photos')}
        downloading={downloading}
        onCloseLightbox={() => setLightbox(null)}
        onNavigateLightbox={(idx) => setLightbox((prev) => (prev ? { ...prev, index: idx } : prev))}
        onDeleteFromLightbox={canUploadArrivalPhotos ? handleLightboxDelete : undefined}
        onDownloadPhoto={downloadPhoto}
        onDownloadAllPhotos={downloadAllPhotos}
        canManageWorkflow={canManageWorkflow}
        openAssignDispatch={openAssignDispatch}
        onCloseAssignDispatch={() => setOpenAssignDispatch(false)}
        loadingDispatches={loadingDispatches}
        assigningDispatch={assigningDispatch}
        availableDispatches={availableDispatches}
        dispatchIdToAssign={dispatchIdToAssign}
        onDispatchIdChange={setDispatchIdToAssign}
        onAssignDispatch={handleAssignDispatch}
        openAssignTransit={openAssignTransit}
        onCloseAssignTransit={() => setOpenAssignTransit(false)}
        assigningTransit={assigningTransit}
        transitIdToAssign={transitIdToAssign}
        onTransitIdChange={setTransitIdToAssign}
        releaseTokenToAssign={releaseTokenToAssign}
        onReleaseTokenChange={setReleaseTokenToAssign}
        showReleaseToken={showReleaseToken}
        onToggleReleaseToken={() => setShowReleaseToken((prev) => !prev)}
        onAssignTransit={handleAssignTransit}
        shipmentId={shipment?.id || null}
        expenseAction={expenseAction}
        onCloseExpenseAction={() => setExpenseAction(null)}
        onExpenseSuccess={() => {
          void refreshShipmentPage();
        }}
      />
    </ProtectedRoute>
  );
}
