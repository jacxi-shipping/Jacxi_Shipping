'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  ArrowLeft, 
  Upload, 
  X, 
  Loader2, 
  Package, 
  User, 
  DollarSign, 
  CheckCircle,
  Save,
  AlertCircle
} from 'lucide-react';
import { Box, Typography, LinearProgress, Autocomplete, TextField } from '@mui/material';

import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { PageHeader, Button, FormField, Breadcrumbs, toast, EmptyState, FormPageSkeleton } from '@/components/design-system';
import { shipmentSchema, type ShipmentFormData } from '@/lib/validations/shipment';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { compressImage, isValidImageFile, formatFileSize } from '@/lib/utils/image-compression';
interface UserOption {
  id: string;
  name: string | null;
  email: string;
}

interface ContainerOption {
  id: string;
  containerNumber: string;
  status: string;
  currentCount: number;
  maxCapacity: number;
  destinationPort: string | null;
}

export default function EditShipmentPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [loadingData, setLoadingData] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [containers, setContainers] = useState<ContainerOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [vehiclePhotos, setVehiclePhotos] = useState<string[]>([]);
  const [arrivalPhotos, setArrivalPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [decodingVin, setDecodingVin] = useState(false);

  const isAdmin = useMemo(() => session?.user?.role === 'admin', [session]);

  // Calculate overall upload progress for vehicle photos
  const vehiclePhotosProgress = useMemo(() => {
    const vehicleProgress = Object.entries(uploadProgress)
      .filter(([fileId]) => !fileId.includes('arrival'))
      .map(([, progress]) => progress);
    if (vehicleProgress.length === 0) return 0;
    const sum = vehicleProgress.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / vehicleProgress.length);
  }, [uploadProgress]);

  // Calculate overall upload progress for arrival photos
  const arrivalPhotosProgress = useMemo(() => {
    const arrivalProgress = Object.entries(uploadProgress)
      .filter(([fileId]) => fileId.includes('arrival'))
      .map(([, progress]) => progress);
    if (arrivalProgress.length === 0) return 0;
    const sum = arrivalProgress.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / arrivalProgress.length);
  }, [uploadProgress]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<ShipmentFormData>({
    resolver: zodResolver(shipmentSchema),
    mode: 'onBlur',
    defaultValues: {
      vehiclePhotos: [],
      status: 'ON_HAND',
    },
  });

  const statusValue = watch('status');
  const vinValue = watch('vehicleVIN');

  // Fetch initial data
  useEffect(() => {
    if (!isAdmin || status === 'loading') return;

    const fetchData = async () => {
      try {
        setLoadingData(true);
        
        // Fetch users - fetch all users by using a large pageSize
        const usersResponse = await fetch('/api/users?pageSize=1000');
        if (usersResponse.ok) {
          const data = await usersResponse.json();
          setUsers(data.users || []);
        }
        setLoadingUsers(false);

        // Fetch shipment
        const shipmentResponse = await fetch(`/api/shipments/${params.id}`);
        if (shipmentResponse.ok) {
          const data = await shipmentResponse.json();
          const shipment = data.shipment;
          
          // Populate form
          reset({
            userId: shipment.userId,
            vehicleType: shipment.vehicleType,
            vehicleMake: shipment.vehicleMake || '',
            vehicleModel: shipment.vehicleModel || '',
            vehicleYear: shipment.vehicleYear?.toString() || '',
            vehicleVIN: shipment.vehicleVIN || '',
            vehicleColor: shipment.vehicleColor || '',
            lotNumber: shipment.lotNumber || '',
            auctionName: shipment.auctionName || '',
            weight: shipment.weight?.toString() || '',
            dimensions: shipment.dimensions || '',
            insuranceValue: shipment.insuranceValue?.toString() || '',
            price: shipment.price?.toString() || '',
            hasKey: shipment.hasKey,
            hasTitle: shipment.hasTitle,
            titleStatus: shipment.titleStatus || undefined,
            paymentMode: shipment.paymentMode || undefined,
            status: shipment.status,
            containerId: shipment.containerId || '',
            internalNotes: shipment.internalNotes || '',
            vehiclePhotos: shipment.vehiclePhotos || [],
          });

          setVehiclePhotos(shipment.vehiclePhotos || []);
          setArrivalPhotos(shipment.arrivalPhotos || []);

          // If in transit, fetch containers
          if (shipment.status === 'IN_TRANSIT') {
            fetchContainers();
          }
        } else {
          toast.error('Failed to load shipment details');
          router.push('/dashboard/shipments');
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('An error occurred while loading data');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [params.id, isAdmin, status, reset, router]);

  const fetchContainers = async () => {
    setLoadingContainers(true);
    try {
      // Fetch all active containers by using a large limit
      const response = await fetch('/api/containers?status=active&limit=1000');
      if (response.ok) {
        const data = await response.json();
        setContainers(data.containers);
      }
    } catch (error) {
      console.error('Error fetching containers:', error);
    } finally {
      setLoadingContainers(false);
    }
  };

  // Watch status changes to fetch containers if needed
  useEffect(() => {
    if (statusValue === 'IN_TRANSIT' && containers.length === 0) {
      fetchContainers();
    }
  }, [statusValue, containers.length]);

  // VIN Decoder
  const decodeVIN = async (vin: string) => {
    if (!vin || vin.length !== 17) return;

    setDecodingVin(true);
    try {
      const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`);
      const data = await response.json();

      if (data.Results) {
        const makeResult = data.Results.find((r: { Variable: string }) => r.Variable === 'Make');
        const modelResult = data.Results.find((r: { Variable: string }) => r.Variable === 'Model');
        const yearResult = data.Results.find((r: { Variable: string }) => r.Variable === 'Model Year');

        if (makeResult?.Value) setValue('vehicleMake', makeResult.Value);
        if (modelResult?.Value) setValue('vehicleModel', modelResult.Value);
        if (yearResult?.Value) setValue('vehicleYear', yearResult.Value);

        toast.success('VIN decoded successfully!');
      }
    } catch (error) {
      console.error('Error decoding VIN:', error);
      toast.error('Failed to decode VIN');
    } finally {
      setDecodingVin(false);
    }
  };

  // Photo upload with compression and progress tracking
  const handlePhotoUpload = async (file: File, fileId: string, isArrival: boolean = false) => {
    // Validate file type
    if (!isValidImageFile(file)) {
      toast.error('Invalid file type', {
        description: 'Please upload JPEG, PNG, or WebP images only'
      });
      return null;
    }

    // Validate file size (max 10MB before compression)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File too large', {
        description: `File size must be less than ${formatFileSize(maxSize)}`
      });
      return null;
    }

    setUploadingFiles((prev) => new Set(prev).add(fileId));
    setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

    try {
      // Compress image
      setUploadProgress((prev) => ({ ...prev, [fileId]: 10 }));
      const compressedFile = await compressImage(file, 1920, 1920, 0.8);
      setUploadProgress((prev) => ({ ...prev, [fileId]: 30 }));

      // Upload compressed file
      const formData = new FormData();
      formData.append('file', compressedFile);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = 30 + (e.loaded / e.total) * 60; // 30-90%
          setUploadProgress((prev) => ({ ...prev, [fileId]: percentComplete }));
        }
      });

      const uploadPromise = new Promise<string>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const result = JSON.parse(xhr.responseText);
              setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }));
              resolve(result.url);
            } catch (error) {
              reject(new Error('Failed to parse response'));
            }
          } else {
            reject(new Error('Upload failed'));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });

      const url = await uploadPromise;

      // Update photos state
      if (isArrival) {
        setArrivalPhotos((prev) => [...prev, url]);
      } else {
        setVehiclePhotos((prev) => {
          const newPhotos = [...prev, url];
          setValue('vehiclePhotos', newPhotos);
          return newPhotos;
        });
      }

      // Clean up progress tracking after a delay
      setTimeout(() => {
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
        setUploadingFiles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
      }, 500);

      return url;
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo', {
        description: error instanceof Error ? error.message : 'Please try again'
      });
      
      // Clean up on error
      setUploadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[fileId];
        return newProgress;
      });
      setUploadingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
      
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, isArrival: boolean = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    // Process all files in parallel
    const uploadPromises = Array.from(files).map((file, index) => {
      const fileId = `${Date.now()}-${index}-${file.name}-${isArrival ? 'arrival' : 'vehicle'}`;
      return handlePhotoUpload(file, fileId, isArrival);
    });

    await Promise.all(uploadPromises);

    e.target.value = '';
    setUploading(false);
  };

  const removePhoto = (index: number, isArrival: boolean = false) => {
    if (isArrival) {
        const newPhotos = arrivalPhotos.filter((_, i) => i !== index);
        setArrivalPhotos(newPhotos);
    } else {
        const newPhotos = vehiclePhotos.filter((_, i) => i !== index);
        setVehiclePhotos(newPhotos);
        setValue('vehiclePhotos', newPhotos);
    }
  };

  const onSubmit = async (data: ShipmentFormData) => {
    try {
      const response = await fetch(`/api/shipments/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...data,
            arrivalPhotos, // Send arrival photos separately as they might not be in the schema type
            replaceArrivalPhotos: true // Signal backend to replace the array
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Shipment updated successfully!');
        router.push(`/dashboard/shipments/${params.id}`);
      } else {
        toast.error(result.message || 'Failed to update shipment');
      }
    } catch (error) {
      console.error('Error updating shipment:', error);
      toast.error('An error occurred while updating');
    }
  };

  if (status === 'loading' || loadingData) {
    return (
        <ProtectedRoute>
            <FormPageSkeleton />
        </ProtectedRoute>
    );
  }

  if (!isAdmin) {
    return (
      <ProtectedRoute>
        <DashboardSurface>
          <EmptyState
            icon={<AlertCircle className="w-12 h-12" />}
            title="Access Restricted"
            description="Only administrators can modify shipment details"
            action={
              <Link href={`/dashboard/shipments/${params.id}`} style={{ textDecoration: 'none' }}>
                <Button variant="primary">Back to Shipment</Button>
              </Link>
            }
          />
        </DashboardSurface>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardSurface>
        <Box sx={{ px: 2, pt: 2 }}>
          <Breadcrumbs />
        </Box>

        <PageHeader
          title="Edit Shipment"
          description="Update shipment details, status, and documents"
          actions={
            <Link href={`/dashboard/shipments/${params.id}`} style={{ textDecoration: 'none' }}>
              <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />} size="sm">
                Cancel
              </Button>
            </Link>
          }
        />

        <form onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 4 }}>
            
            {/* 1. Vehicle Information */}
            <DashboardPanel title="Vehicle Information" description="Basic vehicle details and identification">
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                        <Box sx={{ flex: 1 }}>
                            <FormField
                                id="vehicleVIN"
                                label="VIN (Vehicle Identification Number)"
                                placeholder="17-character VIN"
                                error={!!errors.vehicleVIN}
                                helperText={errors.vehicleVIN?.message}
                                {...register('vehicleVIN')}
                                inputProps={{ maxLength: 17 }}
                            />
                        </Box>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => vinValue && decodeVIN(vinValue)}
                            disabled={!vinValue || vinValue.length !== 17 || decodingVin}
                            loading={decodingVin}
                        >
                            {decodingVin ? 'Decoding...' : 'Decode'}
                        </Button>
                    </Box>
                </Box>

                <Box>
                  <Typography
                    component="label"
                    htmlFor="vehicleType"
                    sx={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', mb: 1 }}
                  >
                    Vehicle Type *
                  </Typography>
                  <select
                    id="vehicleType"
                    {...register('vehicleType')}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '16px',
                      border: errors.vehicleType ? '2px solid var(--error)' : '1px solid rgba(var(--border-rgb), 0.9)',
                      backgroundColor: 'var(--background)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                    }}
                  >
                    <option value="">Select type</option>
                    <option value="sedan">Sedan</option>
                    <option value="suv">SUV</option>
                    <option value="truck">Truck</option>
                    <option value="motorcycle">Motorcycle</option>
                    <option value="van">Van</option>
                    <option value="coupe">Coupe</option>
                    <option value="convertible">Convertible</option>
                    <option value="wagon">Wagon</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.vehicleType && (
                    <Typography sx={{ fontSize: '0.75rem', color: 'var(--error)', mt: 0.5 }}>
                      {errors.vehicleType.message}
                    </Typography>
                  )}
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                  <FormField id="vehicleMake" label="Make" {...register('vehicleMake')} />
                  <FormField id="vehicleModel" label="Model" {...register('vehicleModel')} />
                  <FormField 
                    id="vehicleYear" 
                    label="Year" 
                    type="number" 
                    error={!!errors.vehicleYear}
                    helperText={errors.vehicleYear?.message}
                    {...register('vehicleYear')} 
                  />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                  <FormField id="vehicleColor" label="Color" {...register('vehicleColor')} />
                  <FormField id="lotNumber" label="Lot Number" {...register('lotNumber')} />
                  <FormField id="auctionName" label="Auction Name" {...register('auctionName')} />
                </Box>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                    <FormField
                        id="weight"
                        label="Weight (lbs)"
                        type="number"
                        error={!!errors.weight}
                        helperText={errors.weight?.message}
                        {...register('weight')}
                    />
                    <FormField
                        id="dimensions"
                        label="Dimensions"
                        placeholder="L x W x H"
                        error={!!errors.dimensions}
                        helperText={errors.dimensions?.message}
                        {...register('dimensions')}
                    />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <input
                            id="hasKey"
                            type="checkbox"
                            {...register('hasKey')}
                            style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '4px',
                                border: '1px solid var(--border)',
                                cursor: 'pointer',
                            }}
                        />
                        <Typography component="label" htmlFor="hasKey" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer' }}>
                            Has Key
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <input
                            id="hasTitle"
                            type="checkbox"
                            {...register('hasTitle')}
                            style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '4px',
                                border: '1px solid var(--border)',
                                cursor: 'pointer',
                            }}
                        />
                        <Typography component="label" htmlFor="hasTitle" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer' }}>
                            Has Title
                        </Typography>
                    </Box>
                </Box>

                {watch('hasTitle') && (
                    <Box>
                        <Typography component="label" htmlFor="titleStatus" sx={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', mb: 1 }}>
                            Title Status
                        </Typography>
                        <select
                            id="titleStatus"
                            {...register('titleStatus')}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '16px',
                                border: '1px solid rgba(var(--border-rgb), 0.9)',
                                backgroundColor: 'var(--background)',
                                color: 'var(--text-primary)',
                                fontSize: '0.875rem',
                            }}
                        >
                            <option value="">Select status</option>
                            <option value="PENDING">Pending</option>
                            <option value="DELIVERED">Delivered</option>
                        </select>
                    </Box>
                )}
              </Box>
            </DashboardPanel>

            {/* 2. Status & Assignment */}
            <DashboardPanel title="Status & Assignment" description="Customer assignment and shipment status">
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography component="label" htmlFor="userId" sx={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', mb: 1 }}>
                    Select Customer *
                  </Typography>
                  {loadingUsers ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Loader2 className="animate-spin w-4 h-4" />
                        <Typography variant="body2">Loading customers...</Typography>
                    </Box>
                  ) : (
                    <Autocomplete
                      options={users}
                      getOptionLabel={(option) => option.name || option.email}
                      value={users.find(u => u.id === watch('userId')) || null}
                      onChange={(_, newValue) => {
                        setValue('userId', newValue?.id || '', { shouldValidate: true });
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Select customer"
                          error={!!errors.userId}
                          helperText={errors.userId?.message}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '16px',
                              backgroundColor: 'var(--background)',
                              '& fieldset': {
                                borderColor: errors.userId ? 'var(--error)' : 'rgba(var(--border-rgb), 0.9)',
                              },
                              '&:hover fieldset': {
                                borderColor: errors.userId ? 'var(--error)' : 'var(--accent-gold)',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: errors.userId ? 'var(--error)' : 'var(--accent-gold)',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: 'var(--text-primary)',
                              fontSize: '0.875rem',
                            },
                            '& .MuiInputLabel-root': {
                              color: 'var(--text-secondary)',
                            },
                          }}
                        />
                      )}
                      sx={{
                        '& .MuiAutocomplete-paper': {
                          backgroundColor: 'var(--panel)',
                          border: '1px solid var(--border)',
                        },
                      }}
                    />
                  )}
                </Box>

                <Box>
                  <Typography component="label" htmlFor="status" sx={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', mb: 1 }}>
                    Shipment Status *
                  </Typography>
                  <select
                    id="status"
                    {...register('status')}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '16px',
                      border: errors.status ? '2px solid var(--error)' : '1px solid rgba(var(--border-rgb), 0.9)',
                      backgroundColor: 'var(--background)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                    }}
                  >
                    <option value="ON_HAND">On Hand</option>
                    <option value="IN_TRANSIT">In Transit</option>
                  </select>
                  {errors.status && (
                    <Typography sx={{ fontSize: '0.75rem', color: 'var(--error)', mt: 0.5 }}>
                      {errors.status.message}
                    </Typography>
                  )}
                </Box>

                {statusValue === 'IN_TRANSIT' && (
                  <Box>
                    <Typography component="label" htmlFor="containerId" sx={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', mb: 1 }}>
                      Container *
                    </Typography>
                    {loadingContainers ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Loader2 className="animate-spin w-4 h-4" />
                        <Typography variant="body2">Loading containers...</Typography>
                      </Box>
                    ) : (
                      <Autocomplete
                        options={containers}
                        getOptionLabel={(option) => 
                          `${option.containerNumber} - ${option.destinationPort || 'No destination'} (${option.currentCount}/${option.maxCapacity})`
                        }
                        value={containers.find(c => c.id === watch('containerId')) || null}
                        onChange={(_, newValue) => {
                          setValue('containerId', newValue?.id || '', { shouldValidate: true });
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Select a container"
                            error={!!errors.containerId}
                            helperText={errors.containerId?.message}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: '16px',
                                backgroundColor: 'var(--background)',
                                '& fieldset': {
                                  borderColor: errors.containerId ? 'var(--error)' : 'rgba(var(--border-rgb), 0.9)',
                                },
                                '&:hover fieldset': {
                                  borderColor: errors.containerId ? 'var(--error)' : 'var(--accent-gold)',
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: errors.containerId ? 'var(--error)' : 'var(--accent-gold)',
                                },
                              },
                              '& .MuiInputBase-input': {
                                color: 'var(--text-primary)',
                                fontSize: '0.875rem',
                              },
                              '& .MuiInputLabel-root': {
                                color: 'var(--text-secondary)',
                              },
                            }}
                          />
                        )}
                        sx={{
                          '& .MuiAutocomplete-paper': {
                            backgroundColor: 'var(--panel)',
                            border: '1px solid var(--border)',
                          },
                        }}
                      />
                    )}
                  </Box>
                )}
              </Box>
            </DashboardPanel>
            
            {/* 3. Photos */}
            <DashboardPanel title="Photos" description="Vehicle condition photos">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {/* Vehicle Photos */}
                    <Box>
                        <Typography sx={{ fontWeight: 600, mb: 2 }}>Vehicle Photos</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <label
                                htmlFor="vehicle-photos"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '100%',
                                    minHeight: '150px',
                                    border: '2px dashed var(--border)',
                                    borderRadius: '16px',
                                    cursor: uploading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    backgroundColor: 'var(--background)',
                                }}
                            >
                                <input
                                    id="vehicle-photos"
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={(e) => handleFileSelect(e, false)}
                                    style={{ display: 'none' }}
                                    disabled={uploading}
                                />
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
                                    {Array.from(uploadingFiles).some(id => !id.includes('arrival')) ? (
                                        <>
                                            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
                                            <Typography variant="body2" color="text.secondary">
                                                Uploading {Array.from(uploadingFiles).filter(id => !id.includes('arrival')).length} photo{Array.from(uploadingFiles).filter(id => !id.includes('arrival')).length !== 1 ? 's' : ''}...
                                            </Typography>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-[var(--text-secondary)]" />
                                            <Typography variant="body2" color="text.secondary">
                                                Click to upload vehicle photos
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                                PNG, JPG, WebP up to 10MB (Multiple files supported, auto-compressed)
                                            </Typography>
                                        </>
                                    )}
                                </Box>
                            </label>

                            {/* Upload Progress Indicator */}
                            {Object.keys(uploadProgress).filter(id => !id.includes('arrival')).length > 0 && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                                            Uploading {Object.keys(uploadProgress).filter(id => !id.includes('arrival')).length} photo{Object.keys(uploadProgress).filter(id => !id.includes('arrival')).length !== 1 ? 's' : ''}...
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--accent-gold)' }}>
                                            {vehiclePhotosProgress}%
                                        </Typography>
                                    </Box>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={vehiclePhotosProgress} 
                                        sx={{
                                            height: 8,
                                            borderRadius: 4,
                                            backgroundColor: 'rgba(var(--border-rgb), 0.2)',
                                            '& .MuiLinearProgress-bar': {
                                                backgroundColor: 'var(--accent-gold)',
                                                borderRadius: 4,
                                            },
                                        }}
                                    />
                                </Box>
                            )}

                            {vehiclePhotos.length > 0 && (
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2 }}>
                                    {vehiclePhotos.map((photo, index) => (
                                        <Box key={index} sx={{ position: 'relative', aspectRatio: '1', borderRadius: 2, overflow: 'hidden', border: '1px solid var(--border)' }}>
                                            <Image src={photo} alt={`Vehicle ${index + 1}`} fill className="object-cover" unoptimized />
                                            <button
                                                type="button"
                                                onClick={() => removePhoto(index, false)}
                                                className="absolute top-2 right-2 bg-red-500 rounded-full p-1 hover:bg-red-600 transition-colors z-10"
                                            >
                                                <X className="w-3 h-3 text-white" />
                                            </button>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    </Box>

                    {/* Arrival Photos */}
                    <Box>
                        <Typography sx={{ fontWeight: 600, mb: 2 }}>Arrival Photos (Optional)</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <label
                                htmlFor="arrival-photos"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '100%',
                                    minHeight: '150px',
                                    border: '2px dashed var(--border)',
                                    borderRadius: '16px',
                                    cursor: uploading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    backgroundColor: 'var(--background)',
                                }}
                            >
                                <input
                                    id="arrival-photos"
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={(e) => handleFileSelect(e, true)}
                                    style={{ display: 'none' }}
                                    disabled={uploading}
                                />
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
                                    {Array.from(uploadingFiles).some(id => id.includes('arrival')) ? (
                                        <>
                                            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
                                            <Typography variant="body2" color="text.secondary">
                                                Uploading {Array.from(uploadingFiles).filter(id => id.includes('arrival')).length} photo{Array.from(uploadingFiles).filter(id => id.includes('arrival')).length !== 1 ? 's' : ''}...
                                            </Typography>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-[var(--text-secondary)]" />
                                            <Typography variant="body2" color="text.secondary">
                                                Click to upload arrival photos
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                                PNG, JPG, WebP up to 10MB (Multiple files supported, auto-compressed)
                                            </Typography>
                                        </>
                                    )}
                                </Box>
                            </label>

                            {/* Upload Progress Indicator for Arrival Photos */}
                            {Object.keys(uploadProgress).filter(id => id.includes('arrival')).length > 0 && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                                            Uploading {Object.keys(uploadProgress).filter(id => id.includes('arrival')).length} photo{Object.keys(uploadProgress).filter(id => id.includes('arrival')).length !== 1 ? 's' : ''}...
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--accent-gold)' }}>
                                            {arrivalPhotosProgress}%
                                        </Typography>
                                    </Box>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={arrivalPhotosProgress} 
                                        sx={{
                                            height: 8,
                                            borderRadius: 4,
                                            backgroundColor: 'rgba(var(--border-rgb), 0.2)',
                                            '& .MuiLinearProgress-bar': {
                                                backgroundColor: 'var(--accent-gold)',
                                                borderRadius: 4,
                                            },
                                        }}
                                    />
                                </Box>
                            )}

                            {arrivalPhotos.length > 0 && (
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2 }}>
                                    {arrivalPhotos.map((photo, index) => (
                                        <Box key={index} sx={{ position: 'relative', aspectRatio: '1', borderRadius: 2, overflow: 'hidden', border: '1px solid var(--border)' }}>
                                            <Image src={photo} alt={`Arrival ${index + 1}`} fill className="object-cover" unoptimized />
                                            <button
                                                type="button"
                                                onClick={() => removePhoto(index, true)}
                                                className="absolute top-2 right-2 bg-red-500 rounded-full p-1 hover:bg-red-600 transition-colors z-10"
                                            >
                                                <X className="w-3 h-3 text-white" />
                                            </button>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Box>
            </DashboardPanel>

            {/* 4. Financial Information */}
            <DashboardPanel title="Financial Information" description="Pricing and insurance details">
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                  <FormField
                    id="price"
                    label="Price ($)"
                    type="number"
                    error={!!errors.price}
                    helperText={errors.price?.message}
                    {...register('price')}
                    inputProps={{ step: '0.01' }}
                    leftIcon={<DollarSign className="w-4 h-4 text-[var(--text-secondary)]" />}
                  />
                  <FormField
                    id="insuranceValue"
                    label="Insurance Value ($)"
                    type="number"
                    error={!!errors.insuranceValue}
                    helperText={errors.insuranceValue?.message}
                    {...register('insuranceValue')}
                    inputProps={{ step: '0.01' }}
                    leftIcon={<DollarSign className="w-4 h-4 text-[var(--text-secondary)]" />}
                  />
                </Box>
                
                <Box>
                    <Typography sx={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', mb: 1.5 }}>
                        Payment Mode
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                        <Box
                            component="label"
                            sx={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, p: 2,
                                border: watch('paymentMode') === 'CASH' ? '2px solid var(--accent-gold)' : '1px solid var(--border)',
                                borderRadius: 2,
                                bgcolor: watch('paymentMode') === 'CASH' ? 'rgba(var(--accent-gold-rgb), 0.08)' : 'var(--panel)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <input type="radio" value="CASH" {...register('paymentMode')} style={{ display: 'none' }} />
                            <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Cash</Typography>
                        </Box>
                        <Box
                            component="label"
                            sx={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, p: 2,
                                border: watch('paymentMode') === 'DUE' ? '2px solid var(--accent-gold)' : '1px solid var(--border)',
                                borderRadius: 2,
                                bgcolor: watch('paymentMode') === 'DUE' ? 'rgba(var(--accent-gold-rgb), 0.08)' : 'var(--panel)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <input type="radio" value="DUE" {...register('paymentMode')} style={{ display: 'none' }} />
                            <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Due</Typography>
                        </Box>
                    </Box>
                </Box>
              </Box>
            </DashboardPanel>

            {/* 5. Internal Notes */}
            <DashboardPanel title="Internal Notes" description="Private notes for staff">
                <FormField
                    id="internalNotes"
                    label="Internal Notes"
                    placeholder="Add any internal notes..."
                    multiline
                    rows={4}
                    error={!!errors.internalNotes}
                    helperText={errors.internalNotes?.message}
                    {...register('internalNotes')}
                />
            </DashboardPanel>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 2 }}>
                <Link href={`/dashboard/shipments/${params.id}`} style={{ textDecoration: 'none' }}>
                    <Button variant="ghost" type="button">Cancel</Button>
                </Link>
                <Button 
                    type="submit" 
                    variant="primary" 
                    disabled={isSubmitting}
                    icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                >
                    {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </Button>
            </Box>
          </Box>
        </form>
      </DashboardSurface>
    </ProtectedRoute>
  );
}