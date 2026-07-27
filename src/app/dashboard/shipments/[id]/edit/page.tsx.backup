'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Section from '@/components/layout/Section';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ArrowLeft, Image as ImageIcon, Upload, X, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { Snackbar, Alert } from '@mui/material';

type PhotoSection = 'container' | 'arrival';

export default function EditShipmentPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<{ section: PhotoSection | null; state: boolean }>({ section: null, state: false });
  const [containerPhotos, setContainerPhotos] = useState<string[]>([]);
  const [arrivalPhotos, setArrivalPhotos] = useState<string[]>([]);
  const [trackingFetching, setTrackingFetching] = useState(false);
  const [trackingMessage, setTrackingMessage] = useState<string | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });
  
  const [formData, setFormData] = useState({
    userId: '',
    vehicleType: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleVIN: '',
    vehicleColor: '',
    lotNumber: '',
    auctionName: '',
    origin: '',
    destination: '',
    status: '',
    currentLocation: '',
    estimatedDelivery: '',
    progress: '0',
    weight: '',
    dimensions: '',
    specialInstructions: '',
    insuranceValue: '',
    price: '',
    hasKey: null as boolean | null,
    hasTitle: null as boolean | null,
    titleStatus: '',
  });

  const [users, setUsers] = useState<Array<{ id: string; name: string | null; email: string }>>([]);

  const isAdmin = useMemo(() => session?.user?.role === 'admin', [session]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, []);

  const fetchShipmentData = useCallback(async () => {
    try {
      setLoadingData(true);
      const response = await fetch(`/api/shipments/${params.id}`);
      const data = await response.json();

      if (response.ok) {
        const shipment = data.shipment;
        setFormData({
          userId: shipment.userId || '',
          vehicleType: shipment.vehicleType,
          vehicleMake: shipment.vehicleMake || '',
          vehicleModel: shipment.vehicleModel || '',
          vehicleYear: shipment.vehicleYear?.toString() || '',
          vehicleVIN: shipment.vehicleVIN || '',
          vehicleColor: shipment.vehicleColor || '',
          lotNumber: shipment.lotNumber || '',
          auctionName: shipment.auctionName || '',
          origin: shipment.origin,
          destination: shipment.destination,
          status: shipment.status,
          currentLocation: shipment.currentLocation || '',
          estimatedDelivery: shipment.estimatedDelivery 
            ? new Date(shipment.estimatedDelivery).toISOString().split('T')[0]
            : '',
          progress: shipment.progress?.toString() || '0',
          weight: shipment.weight?.toString() || '',
          dimensions: shipment.dimensions || '',
          specialInstructions: shipment.specialInstructions || '',
          insuranceValue: shipment.insuranceValue?.toString() || '',
          price: shipment.price?.toString() || '',
          hasKey: shipment.hasKey ?? null,
          hasTitle: shipment.hasTitle ?? null,
          titleStatus: shipment.titleStatus || '',
        });
        setContainerPhotos(shipment.containerPhotos || []);
        setArrivalPhotos(shipment.arrivalPhotos || []);
      } else {
        setErrors({ submit: data.message || 'Failed to load shipment' });
      }
    } catch (error) {
      console.error('Error fetching shipment:', error);
      setErrors({ submit: 'An error occurred while loading the shipment' });
    } finally {
      setLoadingData(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (!isAdmin || status === 'loading') return;
    fetchShipmentData();
    fetchUsers();
  }, [fetchShipmentData, fetchUsers, isAdmin, status]);

  useEffect(() => {
    if (status !== 'loading' && session && !isAdmin) {
      router.replace(`/dashboard/shipments/${params.id}`);
    }
  }, [status, session, isAdmin, params.id, router]);

  const handleFetchTrackingDetails = async () => {
    const tracking = trackingNumber.trim();
    setTrackingMessage(null);
    setTrackingError(null);

    if (!tracking) {
      const errorMsg = 'Tracking number is required.';
      setTrackingError(errorMsg);
      setSnackbar({ open: true, message: errorMsg, severity: 'warning' });
      return;
    }

    setTrackingFetching(true);

    try {
      const response = await fetch('/api/tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trackNumber: tracking, needRoute: true }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setTrackingError(payload?.message || 'Failed to fetch tracking information.');
        return;
      }

      const details = payload?.tracking;
      if (!details) {
        setTrackingError('No tracking data returned from carrier.');
        return;
      }

      // Update form with tracking details
      setFormData(prev => ({
        ...prev,
        origin: details.origin || prev.origin,
        destination: details.destination || prev.destination,
        currentLocation: details.currentLocation || prev.currentLocation,
        status: details.shipmentStatus || prev.status,
        progress: details.progress?.toString() || prev.progress,
      }));

      setTrackingMessage('Shipping details retrieved from carrier and updated in form.');
      setSnackbar({ open: true, message: 'Shipping details retrieved from carrier and updated in form.', severity: 'success' });
    } catch (error) {
      console.error('Error fetching tracking details:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch tracking details.';
      setTrackingError(message);
      setSnackbar({ open: true, message, severity: 'error' });
    } finally {
      setTrackingFetching(false);
    }
  };

  if (!isAdmin && status !== 'loading') {
    return (
      <ProtectedRoute>
        <Section className="min-h-screen bg-[var(--text-primary)] flex items-center justify-center">
          <div className="max-w-md text-center space-y-4">
            <h2 className="text-xl font-semibold text-white">Access Restricted</h2>
            <p className="text-[var(--text-secondary)]">Only administrators can modify shipment details.</p>
            <Link href={`/dashboard/shipments/${params.id}`}>
              <Button className="bg-[var(--accent-gold)] text-white hover:bg-[var(--accent-gold)]">Back to Shipment</Button>
            </Link>
          </div>
        </Section>
      </ProtectedRoute>
    );
  }

  if (loadingData) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-[var(--text-primary)] flex items-center justify-center">
          <div className="text-center space-y-4 text-[var(--text-secondary)]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500/30 border-t-cyan-400" />
            <p>Loading shipment data...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation checks
    if (!formData.userId) {
      setSnackbar({ open: true, message: 'User assignment is required', severity: 'warning' });
      setErrors({ userId: 'User assignment is required' });
      return;
    }

    if (!formData.vehicleType) {
      setSnackbar({ open: true, message: 'Vehicle type is required', severity: 'warning' });
      setErrors({ vehicleType: 'Vehicle type is required' });
      return;
    }

    if (formData.vehicleYear) {
      const year = parseInt(formData.vehicleYear);
      if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
        setSnackbar({ open: true, message: `Please enter a valid year between 1900 and ${new Date().getFullYear() + 1}`, severity: 'warning' });
        setErrors({ vehicleYear: 'Invalid year' });
        return;
      }
    }

    if (formData.vehicleVIN && formData.vehicleVIN.length > 0 && formData.vehicleVIN.length < 17) {
      setSnackbar({ open: true, message: 'VIN must be at least 17 characters', severity: 'warning' });
      setErrors({ vehicleVIN: 'VIN must be at least 17 characters' });
      return;
    }

    if (formData.weight) {
      const weight = parseFloat(formData.weight);
      if (isNaN(weight) || weight <= 0 || weight > 50000) {
        setSnackbar({ open: true, message: 'Weight must be between 0 and 50,000 lbs', severity: 'warning' });
        setErrors({ weight: 'Invalid weight' });
        return;
      }
    }

    if (formData.progress) {
      const progress = parseInt(formData.progress);
      if (isNaN(progress) || progress < 0 || progress > 100) {
        setSnackbar({ open: true, message: 'Progress must be between 0 and 100', severity: 'warning' });
        setErrors({ progress: 'Invalid progress' });
        return;
      }
    }

    if (formData.origin && formData.origin.trim().length > 0 && formData.origin.trim().length < 3) {
      setSnackbar({ open: true, message: 'Origin must be at least 3 characters', severity: 'warning' });
      setErrors({ origin: 'Origin must be at least 3 characters' });
      return;
    }

    if (formData.destination && formData.destination.trim().length > 0 && formData.destination.trim().length < 3) {
      setSnackbar({ open: true, message: 'Destination must be at least 3 characters', severity: 'warning' });
      setErrors({ destination: 'Destination must be at least 3 characters' });
      return;
    }

    setLoading(true);
    setErrors({});
    
    try {
      const response = await fetch(`/api/shipments/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          containerPhotos,
          arrivalPhotos,
          replaceArrivalPhotos: true,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSnackbar({ open: true, message: 'Shipment updated successfully!', severity: 'success' });
        setTimeout(() => {
          router.push(`/dashboard/shipments/${params.id}`);
        }, 800);
      } else {
        const errorMessage = data.message || 'Failed to update shipment';
        setErrors({ submit: errorMessage });
        setSnackbar({ open: true, message: errorMessage, severity: 'error' });
      }
    } catch (error) {
      console.error('Error updating shipment:', error);
      const errorMessage = 'An error occurred while updating the shipment';
      setErrors({ submit: errorMessage });
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (section: PhotoSection, file: File) => {
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setSnackbar({ open: true, message: 'File size must be less than 5MB', severity: 'error' });
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setSnackbar({ open: true, message: 'Invalid file type. Please upload JPG, PNG, or WEBP images', severity: 'error' });
      return;
    }

    setUploading({ section, state: true });
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const result = await response.json();

      if (section === 'container') {
        setContainerPhotos((prev) => [...prev, result.url]);
        setSnackbar({ open: true, message: 'Container photo uploaded successfully', severity: 'success' });
      } else {
        setArrivalPhotos((prev) => [...prev, result.url]);
        setSnackbar({ open: true, message: 'Arrival photo uploaded successfully', severity: 'success' });
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      const message = error instanceof Error ? error.message : 'Failed to upload photo';
      setErrors((prev) => ({ ...prev, submit: message }));
      setSnackbar({ open: true, message, severity: 'error' });
    } finally {
      setUploading({ section: null, state: false });
    }
  };

  const handlePhotoSelect = (section: PhotoSection) => async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    for (let i = 0; i < files.length; i += 1) {
      await handlePhotoUpload(section, files[i]);
    }

    event.target.value = '';
  };

  const removePhoto = (section: PhotoSection, index: number) => {
    if (section === 'container') {
      setContainerPhotos((prev) => {
        const next = prev.filter((_, idx) => idx !== index);
        // Persist immediately
        void fetch(`/api/shipments/${params.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ containerPhotos: next }),
        }).catch(() => {
          // surface a simple message
          setErrors((e) => ({ ...e, submit: 'Failed to save container photo removal' }));
        });
        return next;
      });
    } else {
      setArrivalPhotos((prev) => {
        const next = prev.filter((_, idx) => idx !== index);
        // Persist immediately (replace full array)
        void fetch(`/api/shipments/${params.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ arrivalPhotos: next, replaceArrivalPhotos: true }),
        }).catch(() => {
          setErrors((e) => ({ ...e, submit: 'Failed to save arrival photo removal' }));
        });
        return next;
      });
    }
  };

  return (
    <ProtectedRoute>
      <div className="light-surface min-h-screen bg-[var(--background)]">
        <Section className="pt-6 pb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <Link href={`/dashboard/shipments/${params.id}`}>
                <Button variant="outline" size="sm" className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 flex-shrink-0 text-xs sm:text-sm">
                  <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Back
                </Button>
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] truncate">Edit Shipment</h1>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] line-clamp-1">Update shipment information, media, and status.</p>
              </div>
            </div>
          </div>
        </Section>

        <Section className="pb-16">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* User Assignment */}
            <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
              <CardHeader className="p-4 sm:p-6 border-b border-white/5">
                <CardTitle className="text-base sm:text-lg font-bold text-[var(--text-primary)]">User Assignment</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div>
                  <label htmlFor="userId" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                    Assign to User <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="userId"
                    name="userId"
                    value={formData.userId}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                  >
                    <option value="">Select a user...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email} ({user.email})
                      </option>
                    ))}
                  </select>
                  {errors.userId && <p className="mt-1 text-xs sm:text-sm text-red-400">{errors.userId}</p>}
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Information */}
            <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
              <CardHeader className="p-4 sm:p-6 border-b border-white/5">
                <CardTitle className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Vehicle Information</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div>
                  <label htmlFor="vehicleType" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                    Vehicle Type
                  </label>
                  <select
                    id="vehicleType"
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                  >
                    <option value="sedan">Sedan</option>
                    <option value="suv">SUV</option>
                    <option value="truck">Truck</option>
                    <option value="motorcycle">Motorcycle</option>
                    <option value="van">Van</option>
                    <option value="pickup">Pickup Truck</option>
                    <option value="luxury">Luxury Vehicle</option>
                    <option value="commercial">Commercial Vehicle</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="vehicleMake" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Make
                    </label>
                    <input
                      type="text"
                      id="vehicleMake"
                      name="vehicleMake"
                      value={formData.vehicleMake}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="vehicleModel" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Model
                    </label>
                    <input
                      type="text"
                      id="vehicleModel"
                      name="vehicleModel"
                      value={formData.vehicleModel}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="vehicleYear" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Year
                    </label>
                    <input
                      type="number"
                      id="vehicleYear"
                      name="vehicleYear"
                      value={formData.vehicleYear}
                      onChange={handleChange}
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="vehicleVIN" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      VIN Number
                    </label>
                    <input
                      type="text"
                      id="vehicleVIN"
                      name="vehicleVIN"
                      value={formData.vehicleVIN}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Color, Lot Number, Auction Name */}
                <div className={`grid grid-cols-1 gap-4 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                  <div>
                    <label htmlFor="vehicleColor" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Color
                    </label>
                    <input
                      type="text"
                      id="vehicleColor"
                      name="vehicleColor"
                      value={formData.vehicleColor}
                      onChange={handleChange}
                      placeholder="e.g., Blue, Red"
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="lotNumber" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Lot Number
                    </label>
                    <input
                      type="text"
                      id="lotNumber"
                      name="lotNumber"
                      value={formData.lotNumber}
                      onChange={handleChange}
                      placeholder="e.g., LOT12345"
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                    />
                  </div>
                  {isAdmin && (
                    <div>
                      <label htmlFor="auctionName" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                        Auction
                      </label>
                      <input
                        type="text"
                        id="auctionName"
                        name="auctionName"
                        value={formData.auctionName}
                        onChange={handleChange}
                        placeholder="e.g., Copart, IAA"
                        className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>

                {/* Vehicle Details */}
                <div className="pt-4 border-t border-white/5">
                  <h3 className="text-[var(--text-primary)] font-bold mb-4">Additional Vehicle Details</h3>
                  
                  <div className="space-y-4">
                    {/* Has Key */}
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                        Does the vehicle have a key?
                      </label>
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasKey"
                            value="yes"
                            checked={formData.hasKey === true}
                            onChange={() => setFormData(prev => ({ ...prev, hasKey: true }))}
                            className="w-5 h-5 text-cyan-500 border-cyan-500/30 focus:ring-cyan-500/50"
                          />
                          <span className="text-[var(--text-primary)]">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasKey"
                            value="no"
                            checked={formData.hasKey === false}
                            onChange={() => setFormData(prev => ({ ...prev, hasKey: false }))}
                            className="w-5 h-5 text-cyan-500 border-cyan-500/30 focus:ring-cyan-500/50"
                          />
                          <span className="text-[var(--text-primary)]">No</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasKey"
                            value="null"
                            checked={formData.hasKey === null}
                            onChange={() => setFormData(prev => ({ ...prev, hasKey: null }))}
                            className="w-5 h-5 text-cyan-500 border-cyan-500/30 focus:ring-cyan-500/50"
                          />
                          <span className="text-[var(--text-secondary)]">Not Specified</span>
                        </label>
                      </div>
                    </div>

                    {/* Has Title */}
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                        Does the vehicle have a title?
                      </label>
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasTitle"
                            value="yes"
                            checked={formData.hasTitle === true}
                            onChange={() => setFormData(prev => ({ ...prev, hasTitle: true }))}
                            className="w-5 h-5 text-cyan-500 border-cyan-500/30 focus:ring-cyan-500/50"
                          />
                          <span className="text-[var(--text-primary)]">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasTitle"
                            value="no"
                            checked={formData.hasTitle === false}
                            onChange={() => setFormData(prev => ({ ...prev, hasTitle: false, titleStatus: '' }))}
                            className="w-5 h-5 text-cyan-500 border-cyan-500/30 focus:ring-cyan-500/50"
                          />
                          <span className="text-[var(--text-primary)]">No</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasTitle"
                            value="null"
                            checked={formData.hasTitle === null}
                            onChange={() => setFormData(prev => ({ ...prev, hasTitle: null, titleStatus: '' }))}
                            className="w-5 h-5 text-cyan-500 border-cyan-500/30 focus:ring-cyan-500/50"
                          />
                          <span className="text-[var(--text-secondary)]">Not Specified</span>
                        </label>
                      </div>
                    </div>

                    {/* Title Status - Only show if hasTitle is true */}
                    {formData.hasTitle === true && (
                      <div>
                        <label htmlFor="titleStatus" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                          Title Status
                        </label>
                        <select
                          id="titleStatus"
                          name="titleStatus"
                          value={formData.titleStatus}
                          onChange={handleChange}
                          className="w-full px-4 py-2 bg-[var(--text-primary)] border border-cyan-500/30 rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                        >
                          <option value="">Select title status</option>
                          <option value="PENDING">Pending</option>
                          <option value="DELIVERED">Delivered</option>
                        </select>
                      </div>
                    )}

                    {/* Vehicle Age - Display only */}
                    {formData.vehicleYear && (
                      <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)]">Vehicle Age:</span>
                          <span className="text-lg font-bold text-cyan-400">
                            {new Date().getFullYear() - parseInt(formData.vehicleYear || '0')} years
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Information */}
            <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
              <CardHeader className="p-4 sm:p-6 border-b border-white/5">
                <CardTitle className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Shipping Information</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                {/* Tracking Number with Fetch Button */}
                <div>
                  <label htmlFor="trackingNumber" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                    Tracking / Container Number
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      id="trackingNumber"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="e.g., UETU6059142"
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="sm:w-auto w-full border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 whitespace-nowrap"
                      onClick={handleFetchTrackingDetails}
                      disabled={trackingFetching}
                    >
                      {trackingFetching ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Fetching...
                        </>
                      ) : (
                        'Fetch Shipping Details'
                      )}
                    </Button>
                  </div>
                  {trackingMessage && (
                    <p className="mt-2 text-sm text-green-400">{trackingMessage}</p>
                  )}
                  {trackingError && (
                    <p className="mt-2 text-sm text-red-400">{trackingError}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="origin" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                    Origin
                  </label>
                  <input
                    type="text"
                    id="origin"
                    name="origin"
                    value={formData.origin}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="destination" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                    Destination
                  </label>
                  <input
                    type="text"
                    id="destination"
                    name="destination"
                    value={formData.destination}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="weight" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Weight (lbs)
                    </label>
                    <input
                      type="number"
                      id="weight"
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="dimensions" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Dimensions (L x W x H)
                    </label>
                    <input
                      type="text"
                      id="dimensions"
                      name="dimensions"
                      value={formData.dimensions}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="specialInstructions" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                    Special Instructions
                  </label>
                  <textarea
                    id="specialInstructions"
                    name="specialInstructions"
                    value={formData.specialInstructions}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Status Information */}
            <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
              <CardHeader className="p-4 sm:p-6 border-b border-white/5">
                <CardTitle className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Status Information</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div>
                  <label htmlFor="status" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="QUOTE_REQUESTED">Quote Requested</option>
                    <option value="QUOTE_APPROVED">Quote Approved</option>
                    <option value="PICKUP_SCHEDULED">Pickup Scheduled</option>
                    <option value="PICKUP_COMPLETED">Pickup Completed</option>
                    <option value="IN_TRANSIT">In Transit</option>
                    <option value="AT_PORT">At Port</option>
                    <option value="LOADED_ON_VESSEL">Loaded on Vessel</option>
                    <option value="IN_TRANSIT_OCEAN">In Transit Ocean</option>
                    <option value="ARRIVED_AT_DESTINATION">Arrived at Destination</option>
                    <option value="CUSTOMS_CLEARANCE">Customs Clearance</option>
                    <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="ON_HOLD">On Hold</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="currentLocation" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Current Location
                    </label>
                    <input
                      type="text"
                      id="currentLocation"
                      name="currentLocation"
                      value={formData.currentLocation}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="progress" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Progress (%)
                    </label>
                    <input
                      type="number"
                      id="progress"
                      name="progress"
                      value={formData.progress}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="estimatedDelivery" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                    Estimated Delivery
                  </label>
                  <input
                    type="date"
                    id="estimatedDelivery"
                    name="estimatedDelivery"
                    value={formData.estimatedDelivery}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Container Photos */}
            <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  <ImageIcon className="h-5 w-5 text-cyan-300" />
                  Container Photos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div>
                  <label
                    htmlFor="container-photo-input"
                    className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-cyan-500/40 rounded-lg bg-white/3 hover:bg-white/5 hover:border-cyan-500/60 transition-all cursor-pointer group"
                  >
                    <input
                      id="container-photo-input"
                      type="file"
                      multiple
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handlePhotoSelect('container')}
                      className="hidden"
                      disabled={uploading.state}
                    />
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {uploading.state && uploading.section === 'container' ? (
                        <>
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent mb-2" />
                          <p className="text-sm text-gray-600">Uploading...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-cyan-400 group-hover:text-cyan-300 mb-2" />
                          <p className="mb-1 text-sm text-[var(--text-primary)]">
                            <span className="font-semibold text-cyan-400">Click to upload</span> container photos
                          </p>
                          <p className="text-xs text-[var(--text-secondary)]">PNG, JPG, JPEG, WEBP (MAX. 5MB per file)</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>

                {containerPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {containerPhotos.map((photo, index) => (
                      <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-white/10">
                        <Image
                          src={photo}
                          alt={`Container photo ${index + 1}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto('container', index)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/70 hover:bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove container photo"
                        >
                          <X className="w-4 h-4 text-[var(--text-primary)]" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">No container photos uploaded yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Arrival Photos */}
            <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  <span className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-cyan-300" />
                    Arrival Photos
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">Visible after delivery milestones</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div>
                  <label
                    htmlFor="arrival-photo-input"
                    className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-cyan-500/40 rounded-lg bg-white/3 hover:bg-white/5 hover:border-cyan-500/60 transition-all cursor-pointer group"
                  >
                    <input
                      id="arrival-photo-input"
                      type="file"
                      multiple
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handlePhotoSelect('arrival')}
                      className="hidden"
                      disabled={uploading.state}
                    />
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {uploading.state && uploading.section === 'arrival' ? (
                        <>
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent mb-2" />
                          <p className="text-sm text-gray-600">Uploading...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-cyan-400 group-hover:text-cyan-300 mb-2" />
                          <p className="mb-1 text-sm text-[var(--text-primary)]">
                            <span className="font-semibold text-cyan-400">Click to upload</span> arrival photos
                          </p>
                          <p className="text-xs text-[var(--text-secondary)]">PNG, JPG, JPEG, WEBP (MAX. 5MB per file)</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>

                {arrivalPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {arrivalPhotos.map((photo, index) => (
                      <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-white/10">
                        <Image
                          src={photo}
                          alt={`Arrival photo ${index + 1}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto('arrival', index)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/70 hover:bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove arrival photo"
                        >
                          <X className="w-4 h-4 text-[var(--text-primary)]" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">No arrival photos uploaded yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Financial Information */}
            <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
              <CardHeader className="p-4 sm:p-6 border-b border-white/5">
                <CardTitle className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Financial Information</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="price" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Price (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      id="price"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="insuranceValue" className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Insurance Value (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      id="insuranceValue"
                      name="insuranceValue"
                      value={formData.insuranceValue}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error Message */}
            {errors.submit && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {errors.submit}
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3">
              <Link href={`/dashboard/shipments/${params.id}`}>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
                >
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={loading}
                className="bg-[var(--accent-gold)] text-white hover:bg-[var(--accent-gold)] shadow-cyan-500/30"
              >
                {loading ? <span className="text-white">Updating...</span> : <span className="text-white">Update Shipment</span>}
              </Button>
            </div>
          </form>
        </Section>

        {/* Snackbar for Toast Notifications */}
        <Snackbar 
          open={snackbar.open} 
          autoHideDuration={6000} 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setSnackbar({ ...snackbar, open: false })} 
            severity={snackbar.severity} 
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </div>
    </ProtectedRoute>
  );
}

