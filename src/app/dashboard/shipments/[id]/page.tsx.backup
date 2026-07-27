'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Image as ImageIcon,
  MapPin,
  PackageCheck,
  PenLine,
  Trash2,
  Upload,
  Wallet,
  X,
  ZoomIn,
  ZoomOut,
  Info,
  History,
  User,
  Ship,
} from 'lucide-react';
import { Tabs, Tab, Box, ImageList, ImageListItem, ImageListItemBar, IconButton as MuiIconButton } from '@mui/material';
import { toast } from '@/lib/toast';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

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

interface Shipment {
  id: string;
  userId: string;
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
  weight: number | null;
  dimensions: string | null;
  insuranceValue: number | null;
  vehiclePhotos: string[];
  arrivalPhotos: string[];
  hasKey: boolean | null;
  hasTitle: boolean | null;
  titleStatus: string | null;
  vehicleAge: number | null;
  containerId: string | null;
  container: Container | null;
  internalNotes: string | null;
  paymentStatus: string;
  paymentMode: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
  ledgerEntries: Array<{
    id: string;
    transactionDate: string;
    description: string;
    type: string;
    amount: number;
    balance: number;
  }>;
}

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

export default function ShipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [arrivalPhotos, setArrivalPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showArrivalUpload, setShowArrivalUpload] = useState(false);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number; title: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const fetchShipment = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/shipments/${params.id}`);
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

  useEffect(() => {
    void fetchShipment();
  }, [fetchShipment]);

  useEffect(() => {
    if (lightbox) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!lightbox) return;
      if (event.key === 'Escape') {
        setLightbox(null);
      }
      if (event.key === 'ArrowLeft') {
        setLightbox((prev) => {
          if (!prev) return prev;
          const nextIndex = (prev.index - 1 + prev.images.length) % prev.images.length;
          return { ...prev, index: nextIndex };
        });
      }
      if (event.key === 'ArrowRight') {
        setLightbox((prev) => {
          if (!prev) return prev;
          const nextIndex = (prev.index + 1) % prev.images.length;
          return { ...prev, index: nextIndex };
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightbox]);

  const openLightbox = (images: string[], index: number, title: string) => {
    if (!images.length) return;
    setLightbox({ images, index, title });
    setZoomLevel(1);
  };

  const downloadPhoto = async (url: string, filename: string) => {
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
      toast.error('Failed to download photo', 'Please try again');
    } finally {
      setDownloading(false);
    }
  };

  const downloadAllPhotos = async (images: string[], title: string) => {
    try {
      setDownloading(true);
      const response = await fetch('/api/photos/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          photos: images,
          filename: `${title.replace(/\s+/g, '-')}-${shipment?.vehicleVIN || shipment?.id || 'photos'}`
        }),
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${title.replace(/\s+/g, '-')}-${shipment?.vehicleVIN || shipment?.id || 'photos'}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading photos:', error);
      toast.error('Failed to download photos', 'Please try again');
    } finally {
      setDownloading(false);
    }
  };

  const goPrevious = () => {
    setLightbox((prev) => {
      if (!prev || prev.images.length <= 1) return prev;
      const nextIndex = (prev.index - 1 + prev.images.length) % prev.images.length;
      setZoomLevel(1);
      return { ...prev, index: nextIndex };
    });
  };

  const goNext = () => {
    setLightbox((prev) => {
      if (!prev || prev.images.length <= 1) return prev;
      const nextIndex = (prev.index + 1) % prev.images.length;
      setZoomLevel(1);
      return { ...prev, index: nextIndex };
    });
  };

  const zoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));

  useEffect(() => {
    if (!lightbox) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setLightbox(null);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightbox]);

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
      toast.error('Failed to delete shipment', 'An error occurred. Please try again');
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleArrivalPhotoUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        const newPhotos = [...arrivalPhotos, result.url];
        setArrivalPhotos(newPhotos);
        return result.url;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      const message = error instanceof Error ? error.message : 'Failed to upload image';
      toast.error('Upload failed', message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const uploadedUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const url = await handleArrivalPhotoUpload(files[i]);
      if (url) uploadedUrls.push(url);
    }

    if (uploadedUrls.length > 0) {
      try {
        const response = await fetch(`/api/shipments/${params.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            arrivalPhotos: uploadedUrls,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setShipment(data.shipment);
          setArrivalPhotos(data.shipment.arrivalPhotos || []);
          setShowArrivalUpload(false);
        } else {
          const error = await response.json();
          toast.error('Failed to save photos', error.message || 'Please try again');
        }
      } catch (error) {
        console.error('Error saving arrival photos:', error);
        toast.error('Failed to save photos', 'An error occurred. Please try again');
      }
    }

    e.target.value = '';
  };

  const removeArrivalPhoto = async (index: number) => {
    const newPhotos = arrivalPhotos.filter((_, i) => i !== index);
    setArrivalPhotos(newPhotos);

    try {
      const response = await fetch(`/api/shipments/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          arrivalPhotos: newPhotos,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setShipment(data.shipment);
      } else {
        setArrivalPhotos(arrivalPhotos);
        const error = await response.json();
        toast.error('Failed to remove photo', error.message || 'Please try again');
      }
    } catch (error) {
      setArrivalPhotos(arrivalPhotos);
      console.error('Error removing photo:', error);
      toast.error('Failed to remove photo', 'An error occurred. Please try again');
    }
  };

  const canUploadArrivalPhotos = session?.user?.role === 'admin' && 
    (shipment?.container?.status === 'ARRIVED_PORT' || 
     shipment?.container?.status === 'CUSTOMS_CLEARANCE' ||
     shipment?.container?.status === 'RELEASED');

  const statusStyles = useMemo(() => statusColors, []);
  const isAdmin = session?.user?.role === 'admin';

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
        <DashboardSurface>
          <div className="flex h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--accent-gold)]" />
              <p className="text-sm text-[var(--text-secondary)]">Loading shipment details...</p>
            </div>
          </div>
        </DashboardSurface>
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
              { label: shipment.vehicleVIN || `${shipment.vehicleYear || ''} ${shipment.vehicleMake || ''} ${shipment.vehicleModel || ''}`.trim() || 'Details' },
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

            {isAdmin && (
              <div className="flex items-center gap-2">
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
              </div>
            )}
          </div>
        </div>

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
            <Tab icon={<PackageCheck className="h-4 w-4" />} iconPosition="start" label="Details" />
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
                    <p className="font-medium text-[var(--text-primary)]">{shipment.container?.loadingPort || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Destination</p>
                    <p className="font-medium text-[var(--text-primary)]">{shipment.container?.destinationPort || 'N/A'}</p>
                  </div>
                </div>
              </div>
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
                </div>
              </DashboardPanel>
            )}

            {/* Financial Snapshot */}
            <DashboardPanel title="Financial Snapshot">
              <div className="space-y-4">
                {shipment.price && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Total Price</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">${shipment.price.toFixed(2)}</p>
                  </div>
                )}
                {shipment.insuranceValue && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Insurance Value</p>
                    <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">${shipment.insuranceValue.toFixed(2)}</p>
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
            title={shipment.container ? 'Container Tracking Timeline' : 'Tracking Timeline'}
            description={shipment.container ? `Tracking events from container ${shipment.container.containerNumber}` : undefined}
          >
            {(!shipment.container || !shipment.container.trackingEvents || shipment.container.trackingEvents.length === 0) ? (
              <p className="rounded-lg border border-[var(--border)] bg-[var(--background)] py-8 text-center text-sm text-[var(--text-secondary)]">
                {shipment.container ? 'No container tracking events yet.' : 'No container assigned yet.'}
              </p>
            ) : (
              <div className="relative pl-6">
                <span className="absolute left-2 top-0 h-full w-0.5 bg-gradient-to-b from-[var(--accent-gold)] via-[var(--border)] to-transparent" />
                <ul className="space-y-6">
                  {shipment.container.trackingEvents.map((event, index) => (
                    <motion.li
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="relative"
                    >
                      <div className="absolute -left-6 top-1 flex h-8 w-8 items-center justify-center">
                        <span
                          className={cn(
                            'flex h-3 w-3 items-center justify-center rounded-full border-2',
                            event.completed ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]' : 'border-[var(--border)] bg-[var(--panel)]',
                          )}
                        />
                      </div>
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
                        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className={cn('text-sm font-semibold', event.completed ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]')}>
                            {formatStatus(event.status)}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {new Date(event.eventDate).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)]">{event.location}</p>
                        {event.description && (
                          <p className="mt-2 text-sm text-[var(--text-secondary)]">{event.description}</p>
                        )}
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}
          </DashboardPanel>
        </TabPanel>

        {/* Photos Tab */}
        <TabPanel value={activeTab} index={2}>
          <DashboardGrid className="grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Vehicle Photos */}
            <DashboardPanel title="Vehicle Photos">
              {shipment.vehiclePhotos && shipment.vehiclePhotos.length > 0 ? (
                <ImageList
                  sx={{
                    width: '100%',
                    maxHeight: 500,
                    borderRadius: 2,
                  }}
                  cols={3}
                  gap={12}
                  rowHeight={164}
                >
                  {shipment.vehiclePhotos.map((photo, index) => (
                    <ImageListItem
                      key={index}
                      sx={{
                        cursor: 'pointer',
                        overflow: 'hidden',
                        borderRadius: 2,
                        border: '1px solid var(--border)',
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                          '& .MuiImageListItemBar-root': {
                            opacity: 1,
                          },
                        },
                      }}
                      onClick={() => openLightbox(shipment.vehiclePhotos, index, 'Vehicle Photos')}
                    >
                      <Image
                        src={photo}
                        alt={`Vehicle photo ${index + 1}`}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        style={{ objectFit: 'cover' }}
                        unoptimized
                      />
                      <ImageListItemBar
                        title={`Photo ${index + 1}`}
                        sx={{
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0) 100%)',
                          '& .MuiImageListItemBar-title': {
                            fontSize: '0.875rem',
                            fontWeight: 600,
                          },
                        }}
                        position="top"
                        actionIcon={
                          <MuiIconButton
                            sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
                            aria-label={`View photo ${index + 1}`}
                          >
                            <ImageIcon className="h-5 w-5" />
                          </MuiIconButton>
                        }
                      />
                    </ImageListItem>
                  ))}
                </ImageList>
              ) : (
                <p className="rounded-lg border border-[var(--border)] bg-[var(--background)] py-8 text-center text-sm text-[var(--text-secondary)]">
                  No vehicle photos available.
                </p>
              )}
            </DashboardPanel>

            {/* Arrival Photos */}
            <DashboardPanel
              title="Arrival Photos"
              actions={
                canUploadArrivalPhotos ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowArrivalUpload((prev) => !prev)}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {showArrivalUpload ? 'Cancel' : 'Upload Photos'}
                  </Button>
                ) : undefined
              }
            >
              <div className="space-y-4">
                {showArrivalUpload && canUploadArrivalPhotos && (
                  <label
                    htmlFor="arrival-photos"
                    className="relative flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--background)] transition-all hover:border-[var(--accent-gold)]"
                  >
                    <input
                      id="arrival-photos"
                      type="file"
                      multiple
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={uploading}
                    />
                    <div className="flex flex-col items-center justify-center gap-2">
                      {uploading ? (
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-gold)] border-t-transparent" />
                      ) : (
                        <Upload className="h-8 w-8 text-[var(--accent-gold)]" />
                      )}
                      <p className="text-sm text-[var(--text-secondary)]">
                        <span className="font-semibold text-[var(--accent-gold)]">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">PNG, JPG, JPEG, WEBP (MAX. 5MB per file)</p>
                    </div>
                  </label>
                )}

                {arrivalPhotos.length > 0 ? (
                  <ImageList
                    sx={{
                      width: '100%',
                      maxHeight: 500,
                      borderRadius: 2,
                    }}
                    cols={3}
                    gap={12}
                    rowHeight={164}
                  >
                    {arrivalPhotos.map((photo, index) => (
                      <ImageListItem
                        key={index}
                        sx={{
                          cursor: 'pointer',
                          overflow: 'hidden',
                          borderRadius: 2,
                          border: '1px solid var(--border)',
                          transition: 'all 0.2s',
                          position: 'relative',
                          '&:hover': {
                            transform: 'scale(1.05)',
                            boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                            '& .MuiImageListItemBar-root': {
                              opacity: 1,
                            },
                            '& .delete-button': {
                              opacity: 1,
                            },
                          },
                        }}
                        onClick={() => openLightbox(arrivalPhotos, index, 'Arrival Photos')}
                      >
                        <Image
                          src={photo}
                          alt={`Arrival photo ${index + 1}`}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          style={{ objectFit: 'cover' }}
                          unoptimized
                        />
                        <ImageListItemBar
                          title={`Photo ${index + 1}`}
                          sx={{
                            opacity: 0,
                            transition: 'opacity 0.2s',
                            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0) 100%)',
                            '& .MuiImageListItemBar-title': {
                              fontSize: '0.875rem',
                              fontWeight: 600,
                            },
                          }}
                          position="top"
                          actionIcon={
                            <MuiIconButton
                              sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
                              aria-label={`View photo ${index + 1}`}
                            >
                              <ImageIcon className="h-5 w-5" />
                            </MuiIconButton>
                          }
                        />
                        {canUploadArrivalPhotos && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeArrivalPhoto(index);
                            }}
                            className="delete-button absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--error)]/90 text-white opacity-0 transition-opacity hover:bg-[var(--error)]"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </ImageListItem>
                    ))}
                  </ImageList>
                ) : (
                  <p className="rounded-lg border border-[var(--border)] bg-[var(--background)] py-8 text-center text-sm text-[var(--text-secondary)]">
                    {canUploadArrivalPhotos
                      ? 'No arrival photos uploaded yet. Upload photos when the container arrives.'
                      : 'No arrival photos available.'}
                  </p>
                )}
              </div>
            </DashboardPanel>
          </DashboardGrid>
        </TabPanel>

        {/* Details Tab */}
        <TabPanel value={activeTab} index={3}>
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

        {/* Customer Tab (Admin Only) */}
        {isAdmin && (
          <TabPanel value={activeTab} index={4}>
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

      {/* Lightbox */}
      {lightbox && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl"
          onClick={(event) => {
            if (event.currentTarget === event.target) {
              setLightbox(null);
            }
          }}
        >
          {/* Header Bar */}
          <div className="absolute left-0 right-0 top-0 z-10 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center justify-between p-4 sm:p-6">
              <div className="flex-1">
                <p className="text-sm font-medium uppercase tracking-wider text-[var(--text-secondary)]">{lightbox.title}</p>
                <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                  Photo {lightbox.index + 1} <span className="text-[var(--text-secondary)]">of {lightbox.images.length}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="rounded-full bg-[var(--panel)] p-2.5 text-[var(--text-primary)] transition-all duration-200 hover:scale-110 hover:bg-[var(--border)]"
                aria-label="Close gallery"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Bottom Control Bar */}
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-between gap-4 p-4 sm:p-6">
              {/* Zoom Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={zoomOut}
                  disabled={zoomLevel <= 0.5}
                  className="rounded-lg bg-[var(--panel)] p-2 text-[var(--text-primary)] transition-all duration-200 hover:bg-[var(--border)] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-5 w-5" />
                </button>
                <span className="min-w-[60px] text-center text-sm font-medium text-[var(--text-primary)]">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={zoomIn}
                  disabled={zoomLevel >= 3}
                  className="rounded-lg bg-[var(--panel)] p-2 text-[var(--text-primary)] transition-all duration-200 hover:bg-[var(--border)] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-5 w-5" />
                </button>
              </div>

              {/* Download Buttons */}
              <div className="flex items-center gap-2">
                {lightbox.images.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadAllPhotos(lightbox.images, lightbox.title)}
                    disabled={downloading}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {downloading ? 'Downloading...' : `All (${lightbox.images.length})`}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadPhoto(
                    lightbox.images[lightbox.index],
                    `${lightbox.title.replace(/\s+/g, '-')}-${lightbox.index + 1}.jpg`
                  )}
                  disabled={downloading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {downloading ? 'Downloading...' : 'Current'}
                </Button>
              </div>
            </div>

            {/* Thumbnail Strip */}
            {lightbox.images.length > 1 && (
              <div className="px-4 pb-4 sm:px-6">
                <div className="flex gap-2 overflow-x-auto py-2">
                  {lightbox.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setLightbox({ ...lightbox, index: idx });
                        setZoomLevel(1);
                      }}
                      className={cn(
                        'relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200',
                        idx === lightbox.index
                          ? 'scale-110 border-[var(--accent-gold)] ring-2 ring-[var(--accent-gold)]/50'
                          : 'border-[var(--border)] opacity-60 hover:opacity-100'
                      )}
                    >
                      <Image
                        src={img}
                        alt={`Thumbnail ${idx + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main Image Container */}
          <div className="absolute inset-0 flex items-center justify-center px-4 py-24 sm:px-20">
            <div className="group relative flex h-full w-full max-w-7xl items-center justify-center">
              {/* Navigation Arrows */}
              {lightbox.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goPrevious}
                    className="absolute left-0 top-1/2 z-20 -translate-x-2 -translate-y-1/2 rounded-full border-2 border-[var(--border)] bg-black/70 p-2.5 text-[var(--text-primary)] shadow-2xl transition-all duration-300 hover:scale-110 hover:border-[var(--accent-gold)] hover:bg-black/90 sm:-translate-x-6 sm:p-4 sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="h-5 w-5 sm:h-8 sm:w-8" />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="absolute right-0 top-1/2 z-20 -translate-y-1/2 translate-x-2 rounded-full border-2 border-[var(--border)] bg-black/70 p-2.5 text-[var(--text-primary)] shadow-2xl transition-all duration-300 hover:scale-110 hover:border-[var(--accent-gold)] hover:bg-black/90 sm:translate-x-6 sm:p-4 sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="h-5 w-5 sm:h-8 sm:w-8" />
                  </button>
                </>
              )}

              {/* Image with zoom */}
              <motion.div
                animate={{ scale: zoomLevel }}
                transition={{ duration: 0.2 }}
                className="relative flex h-full w-full items-center justify-center"
                style={{ 
                  cursor: zoomLevel > 1 ? 'grab' : 'default'
                }}
              >
                <div className="relative h-full w-full">
                  <Image
                    src={lightbox.images[lightbox.index]}
                    alt={`${lightbox.title} ${lightbox.index + 1}`}
                    fill
                    className="object-contain"
                    unoptimized
                    priority
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </ProtectedRoute>
  );
}
