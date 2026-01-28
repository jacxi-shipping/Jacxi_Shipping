'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Upload, X, Loader2, Package, User, DollarSign, FileText, CheckCircle, ArrowRight } from 'lucide-react';
import { Box, Stepper, Step, StepLabel, Typography, LinearProgress, Autocomplete, TextField } from '@mui/material';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { PageHeader, Button, FormField, Breadcrumbs, toast } from '@/components/design-system';
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

const steps = [
	{ label: 'Vehicle Info', icon: Package },
	{ label: 'Photos', icon: Upload },
	{ label: 'Status', icon: CheckCircle },
	{ label: 'Customer', icon: User },
	{ label: 'Review', icon: FileText },
];

export default function NewShipmentPage() {
	const { data: session } = useSession();
	const router = useRouter();
	const [activeStep, setActiveStep] = useState(0);
	const [users, setUsers] = useState<UserOption[]>([]);
	const [containers, setContainers] = useState<ContainerOption[]>([]);
	const [loadingUsers, setLoadingUsers] = useState(true);
	const [loadingContainers, setLoadingContainers] = useState(false);
	const [vehiclePhotos, setVehiclePhotos] = useState<string[]>([]);
	const [uploading, setUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
	const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
	const [decodingVin, setDecodingVin] = useState(false);

	// Calculate overall upload progress
	const overallProgress = useMemo(() => {
		const progressValues = Object.values(uploadProgress);
		if (progressValues.length === 0) return 0;
		const sum = progressValues.reduce((acc, val) => acc + val, 0);
		return Math.round(sum / progressValues.length);
	}, [uploadProgress]);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		setValue,
		watch,
		trigger,
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
	const formValues = watch();

	// Fetch users
	useEffect(() => {
		const fetchUsers = async () => {
			try {
				// Fetch all users by using a large pageSize
				const response = await fetch('/api/users?pageSize=1000');
				if (response.ok) {
					const data = await response.json();
					setUsers(data.users);
				}
			} catch (error) {
				console.error('Error fetching users:', error);
			} finally {
				setLoadingUsers(false);
			}
		};

		void fetchUsers();
	}, []);

	// Fetch containers when status changes to IN_TRANSIT
	useEffect(() => {
		if (statusValue === 'IN_TRANSIT') {
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

			void fetchContainers();
		}
	}, [statusValue]);

	// VIN Decoder
	const decodeVIN = async (vin: string) => {
		if (vin.length !== 17) return;

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
			toast.error('Failed to decode VIN', {
				description: 'Please check the VIN and try again'
			});
		} finally {
			setDecodingVin(false);
		}
	};

	// Photo upload with compression and progress tracking
	const handlePhotoUpload = async (file: File, fileId: string) => {
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
			setVehiclePhotos((prev) => {
				const newPhotos = [...prev, url];
				setValue('vehiclePhotos', newPhotos);
				return newPhotos;
			});

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

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;

		setUploading(true);

		// Process all files in parallel
		const uploadPromises = Array.from(files).map((file, index) => {
			const fileId = `${Date.now()}-${index}-${file.name}`;
			return handlePhotoUpload(file, fileId);
		});

		await Promise.all(uploadPromises);

		e.target.value = '';
		setUploading(false);
	};

	const removePhoto = (index: number) => {
		const newPhotos = vehiclePhotos.filter((_, i) => i !== index);
		setVehiclePhotos(newPhotos);
		setValue('vehiclePhotos', newPhotos);
	};

	// Form submission
	const onSubmit = async (data: ShipmentFormData) => {
		try {
			const response = await fetch('/api/shipments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});

			const result = await response.json();

			if (response.ok) {
				toast.success('Shipment created successfully!');
				setTimeout(() => {
					router.push('/dashboard/shipments');
				}, 1500);
			} else {
				toast.error(result.message || 'Failed to create shipment', {
					description: 'Please check your inputs and try again'
				});
			}
		} catch (error) {
			console.error('Error creating shipment:', error);
			toast.error('An error occurred', {
				description: 'Please try again later'
			});
		}
	};

	const handleNext = async () => {
		let fieldsToValidate: (keyof ShipmentFormData)[] = [];

		switch (activeStep) {
			case 0: // Vehicle Info
				fieldsToValidate = ['vehicleType', 'vehicleVIN', 'vehicleMake', 'vehicleModel', 'vehicleYear'];
				break;
			case 1: // Photos - optional, can skip
				break;
			case 2: // Status
				fieldsToValidate = ['status'];
				if (statusValue === 'IN_TRANSIT') {
					fieldsToValidate.push('containerId');
				}
				break;
			case 3: // Customer & Financial
				fieldsToValidate = ['userId', 'price'];
				break;
		}

		if (fieldsToValidate.length > 0) {
			const isValid = await trigger(fieldsToValidate);
			if (!isValid) return;
		}

		setActiveStep((prev) => prev + 1);
	};

	const handleBack = () => {
		setActiveStep((prev) => prev - 1);
	};

	if (session?.user?.role !== 'admin') {
		return (
			<ProtectedRoute>
				<DashboardSurface>
					<Box sx={{ textAlign: 'center', py: 12 }}>
						<Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
							Access Denied
						</Typography>
						<Typography sx={{ color: 'var(--text-secondary)', mt: 2 }}>
							Only administrators can create shipments.
						</Typography>
					</Box>
				</DashboardSurface>
			</ProtectedRoute>
		);
	}

	return (
		<ProtectedRoute>
			<DashboardSurface>
				{/* Breadcrumbs */}
				<Box sx={{ px: 2, pt: 2 }}>
					<Breadcrumbs />
				</Box>
				
				<PageHeader
					title="Create New Shipment"
					description="Add vehicle information with guided steps"
					actions={
						<Link href="/dashboard/shipments" style={{ textDecoration: 'none' }}>
							<Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />} iconPosition="start" size="sm">
								Back
							</Button>
						</Link>
					}
				/>

				{/* Stepper */}
				<DashboardPanel>
					<Stepper
						activeStep={activeStep}
						alternativeLabel
						sx={{
							'& .MuiStepLabel-root .Mui-completed': {
								color: 'var(--accent-gold)',
							},
							'& .MuiStepLabel-label.Mui-completed': {
								color: 'var(--text-primary)',
								fontWeight: 600,
							},
							'& .MuiStepLabel-root .Mui-active': {
								color: 'var(--accent-gold)',
							},
							'& .MuiStepLabel-label.Mui-active': {
								color: 'var(--text-primary)',
								fontWeight: 600,
							},
							'& .MuiStepLabel-label': {
								color: 'var(--text-secondary)',
								fontSize: '0.85rem',
							},
							'& .MuiStepConnector-line': {
								borderColor: 'var(--border)',
							},
							'& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line': {
								borderColor: 'var(--accent-gold)',
							},
							'& .MuiStepIcon-root': {
								color: 'var(--border)',
								fontSize: '2rem',
							},
							'& .MuiStepIcon-root.Mui-active': {
								color: 'var(--accent-gold)',
							},
							'& .MuiStepIcon-root.Mui-completed': {
								color: 'var(--accent-gold)',
							},
						}}
					>
						{steps.map((step, index) => (
							<Step key={step.label}>
								<StepLabel>{step.label}</StepLabel>
							</Step>
						))}
					</Stepper>
				</DashboardPanel>

				{/* Form Content */}
				<form onSubmit={handleSubmit(onSubmit)}>
					{/* Step 0: Vehicle Information */}
					{activeStep === 0 && (
						<DashboardPanel title="Vehicle Information" description="Enter basic vehicle details">
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
								{/* VIN */}
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

								{/* Vehicle Type */}
								<Box>
									<Typography
										component="label"
										htmlFor="vehicleType"
										sx={{
											display: 'block',
											fontSize: '0.875rem',
											fontWeight: 500,
											color: 'var(--text-primary)',
											mb: 1,
										}}
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

								{/* Make, Model, Year */}
								<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
									<FormField
										id="vehicleMake"
										label="Make"
										placeholder="e.g., Toyota"
										{...register('vehicleMake')}
									/>
									<FormField
										id="vehicleModel"
										label="Model"
										placeholder="e.g., Camry"
										{...register('vehicleModel')}
									/>
									<FormField
										id="vehicleYear"
										label="Year"
										type="number"
										placeholder="e.g., 2022"
										error={!!errors.vehicleYear}
										helperText={errors.vehicleYear?.message}
										{...register('vehicleYear')}
									/>
								</Box>

								{/* Color, Lot Number, Auction */}
								<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
									<FormField
										id="vehicleColor"
										label="Color"
										placeholder="e.g., Blue"
										{...register('vehicleColor')}
									/>
									<FormField
										id="lotNumber"
										label="Lot Number"
										placeholder="Auction lot #"
										{...register('lotNumber')}
									/>
									<FormField
										id="auctionName"
										label="Auction Name"
										placeholder="e.g., Copart"
										{...register('auctionName')}
									/>
								</Box>

								{/* Weight, Dimensions */}
								<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
									<FormField
										id="weight"
										label="Weight (lbs)"
										type="number"
										placeholder="Vehicle weight"
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

								{/* Has Key, Has Title */}
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

								{/* Title Status */}
								{watch('hasTitle') && (
									<Box>
										<Typography
											component="label"
											htmlFor="titleStatus"
											sx={{
												display: 'block',
												fontSize: '0.875rem',
												fontWeight: 500,
												color: 'var(--text-primary)',
												mb: 1,
											}}
										>
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
					)}

					{/* Step 1: Photos */}
					{activeStep === 1 && (
						<DashboardPanel title="Vehicle Photos" description="Upload images of the vehicle">
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
								<label
									htmlFor="photos"
									style={{
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										justifyContent: 'center',
										width: '100%',
										minHeight: '200px',
										border: '2px dashed var(--border)',
										borderRadius: '16px',
										cursor: uploading ? 'not-allowed' : 'pointer',
										transition: 'all 0.2s ease',
										backgroundColor: 'var(--background)',
									}}
									onMouseEnter={(e) => {
										if (!uploading) {
											e.currentTarget.style.borderColor = 'var(--accent-gold)';
											e.currentTarget.style.backgroundColor = 'rgba(var(--accent-gold-rgb), 0.05)';
										}
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.borderColor = 'var(--border)';
										e.currentTarget.style.backgroundColor = 'var(--background)';
									}}
								>
									<input
										id="photos"
										type="file"
										multiple
										accept="image/*"
										onChange={handleFileSelect}
										style={{ display: 'none' }}
										disabled={uploading}
									/>
									<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
										{uploadingFiles.size > 0 ? (
											<>
												<Loader2 style={{ fontSize: 40, color: 'var(--accent-gold)' }} className="animate-spin" />
												<Typography sx={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
													Uploading {uploadingFiles.size} photo{uploadingFiles.size !== 1 ? 's' : ''}...
												</Typography>
											</>
										) : (
											<>
												<Upload style={{ fontSize: 40, color: 'var(--accent-gold)' }} />
												<Typography sx={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>
													Click to upload vehicle photos
												</Typography>
												<Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
													PNG, JPG, WebP up to 10MB (Multiple files supported, auto-compressed)
												</Typography>
											</>
										)}
									</Box>
								</label>

								{/* Upload Progress Indicator */}
								{Object.keys(uploadProgress).length > 0 && (
									<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
										<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
											<Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
												Uploading {Object.keys(uploadProgress).length} photo{Object.keys(uploadProgress).length !== 1 ? 's' : ''}...
											</Typography>
											<Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--accent-gold)' }}>
												{overallProgress}%
											</Typography>
										</Box>
										<LinearProgress 
											variant="determinate" 
											value={overallProgress} 
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
									<Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
										{vehiclePhotos.map((photo, index) => (
											<Box
												key={index}
												sx={{
													position: 'relative',
													aspectRatio: '1',
													borderRadius: 2,
													overflow: 'hidden',
													border: '1px solid var(--border)',
													'&:hover .remove-button': {
														opacity: 1,
													},
												}}
											>
												<Image
													src={photo}
													alt={`Vehicle photo ${index + 1}`}
													fill
													className="object-cover"
													unoptimized
												/>
												<Box
													className="remove-button"
													component="button"
													type="button"
													onClick={() => removePhoto(index)}
													sx={{
														position: 'absolute',
														top: 8,
														right: 8,
														bgcolor: 'rgba(239, 68, 68, 0.9)',
														borderRadius: '50%',
														p: 0.5,
														opacity: 0,
														transition: 'opacity 0.2s ease',
														cursor: 'pointer',
														border: 'none',
														zIndex: 1,
														'&:hover': {
															bgcolor: 'rgb(239, 68, 68)',
														},
													}}
												>
													<X style={{ fontSize: 16, color: 'white' }} />
												</Box>
											</Box>
										))}
									</Box>
								)}
							</Box>
						</DashboardPanel>
					)}

					{/* Step 2: Status & Container */}
					{activeStep === 2 && (
						<DashboardPanel title="Status & Container" description="Set shipment status and assign to container">
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
								{/* Status */}
								<Box>
									<Typography
										component="label"
										htmlFor="status"
										sx={{
											display: 'block',
											fontSize: '0.875rem',
											fontWeight: 500,
											color: 'var(--text-primary)',
											mb: 1,
										}}
									>
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
									<Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mt: 0.5 }}>
										{statusValue === 'ON_HAND' 
											? 'Vehicle is currently on hand, not yet assigned to a container'
											: 'Vehicle is in transit - must be assigned to a container'}
									</Typography>
								</Box>

								{/* Container Selection - Only shown when IN_TRANSIT */}
								{statusValue === 'IN_TRANSIT' && (
									<Box>
										<Typography
											component="label"
											htmlFor="containerId"
											sx={{
												display: 'block',
												fontSize: '0.875rem',
												fontWeight: 500,
												color: 'var(--text-primary)',
												mb: 1,
											}}
										>
											Container *
										</Typography>
										{loadingContainers ? (
											<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'var(--text-secondary)' }}>
												<Loader2 style={{ fontSize: 18 }} className="animate-spin" />
												<Typography sx={{ fontSize: '0.85rem' }}>Loading containers...</Typography>
											</Box>
										) : (
											<>
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
												<Box sx={{ mt: 2 }}>
													<Link href="/dashboard/containers/new" target="_blank" style={{ textDecoration: 'none' }}>
														<Button type="button" variant="outline" size="sm">
															Create New Container
														</Button>
													</Link>
												</Box>
											</>
										)}
									</Box>
								)}
							</Box>
						</DashboardPanel>
					)}

					{/* Step 3: Customer & Financial */}
					{activeStep === 3 && (
						<DashboardPanel title="Customer & Financial" description="Select customer and enter pricing">
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
								{/* Customer Selection */}
								<Box>
									<Typography
										component="label"
										htmlFor="userId"
										sx={{
											display: 'block',
											fontSize: '0.875rem',
											fontWeight: 500,
											color: 'var(--text-primary)',
											mb: 1,
										}}
									>
										Select Customer *
									</Typography>
									{loadingUsers ? (
										<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'var(--text-secondary)' }}>
											<Loader2 style={{ fontSize: 18 }} className="animate-spin" />
											<Typography sx={{ fontSize: '0.85rem' }}>Loading customers...</Typography>
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

								{/* Financial Fields */}
								<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
									<FormField
										id="price"
										label="Price ($)"
										type="number"
										placeholder="0.00"
										error={!!errors.price}
										helperText={errors.price?.message}
										{...register('price')}
										inputProps={{ step: '0.01' }}
										leftIcon={<DollarSign style={{ fontSize: 18, color: 'var(--text-secondary)' }} />}
									/>
									<FormField
										id="insuranceValue"
										label="Insurance Value ($)"
										type="number"
										placeholder="0.00"
										error={!!errors.insuranceValue}
										helperText={errors.insuranceValue?.message}
										{...register('insuranceValue')}
										inputProps={{ step: '0.01' }}
										leftIcon={<DollarSign style={{ fontSize: 18, color: 'var(--text-secondary)' }} />}
									/>
								</Box>

								{/* Payment Mode */}
								<Box>
									<Typography
										sx={{
											display: 'block',
											fontSize: '0.875rem',
											fontWeight: 500,
											color: 'var(--text-primary)',
											mb: 1.5,
										}}
									>
										Payment Mode
									</Typography>
									<Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
										<Box
											component="label"
											sx={{
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												gap: 1.5,
												p: 2,
												border: watch('paymentMode') === 'CASH' ? '2px solid var(--accent-gold)' : '1px solid var(--border)',
												borderRadius: 2,
												bgcolor: watch('paymentMode') === 'CASH' ? 'rgba(var(--accent-gold-rgb), 0.08)' : 'var(--panel)',
												cursor: 'pointer',
												transition: 'all 0.2s ease',
												'&:hover': {
													borderColor: 'var(--accent-gold)',
												},
											}}
										>
											<input
												type="radio"
												value="CASH"
												{...register('paymentMode')}
												style={{ display: 'none' }}
											/>
											<Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
												Cash
											</Typography>
										</Box>
										<Box
											component="label"
											sx={{
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												gap: 1.5,
												p: 2,
												border: watch('paymentMode') === 'DUE' ? '2px solid var(--accent-gold)' : '1px solid var(--border)',
												borderRadius: 2,
												bgcolor: watch('paymentMode') === 'DUE' ? 'rgba(var(--accent-gold-rgb), 0.08)' : 'var(--panel)',
												cursor: 'pointer',
												transition: 'all 0.2s ease',
												'&:hover': {
													borderColor: 'var(--accent-gold)',
												},
											}}
										>
											<input
												type="radio"
												value="DUE"
												{...register('paymentMode')}
												style={{ display: 'none' }}
											/>
											<Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
												Due
											</Typography>
										</Box>
									</Box>
								</Box>
							</Box>
						</DashboardPanel>
					)}

					{/* Step 4: Review & Submit */}
					{activeStep === 4 && (
						<DashboardPanel title="Review & Submit" description="Verify all details before creating">
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
								{/* Summary */}
								<Box
									sx={{
										p: 3,
										borderRadius: 2,
										border: '1px solid var(--border)',
										bgcolor: 'var(--background)',
									}}
								>
									<Typography sx={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', mb: 2 }}>
										Shipment Summary
									</Typography>
									<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
										<Box>
											<Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>
												Vehicle
											</Typography>
											<Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
												{formValues.vehicleYear} {formValues.vehicleMake} {formValues.vehicleModel}
											</Typography>
										</Box>
										<Box>
											<Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>
												VIN
											</Typography>
											<Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
												{formValues.vehicleVIN || 'N/A'}
											</Typography>
										</Box>
										<Box>
											<Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>
												Type
											</Typography>
											<Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
												{formValues.vehicleType}
											</Typography>
										</Box>
										<Box>
											<Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>
												Status
											</Typography>
											<Box
												sx={{
													display: 'inline-block',
													px: 1.5,
													py: 0.5,
													borderRadius: 1,
													bgcolor: formValues.status === 'IN_TRANSIT' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(156, 163, 175, 0.15)',
													color: formValues.status === 'IN_TRANSIT' ? 'rgb(99, 102, 241)' : 'rgb(156, 163, 175)',
													fontSize: '0.75rem',
													fontWeight: 600,
												}}
											>
												{formValues.status === 'IN_TRANSIT' ? 'In Transit' : 'On Hand'}
											</Box>
										</Box>
										<Box>
											<Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>
												Price
											</Typography>
											<Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-gold)' }}>
												${formValues.price || '0.00'}
											</Typography>
										</Box>
										<Box>
											<Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>
												Payment Mode
											</Typography>
											<Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
												{formValues.paymentMode || 'N/A'}
											</Typography>
										</Box>
									</Box>

									{vehiclePhotos.length > 0 && (
										<Box sx={{ mt: 2, pt: 2, borderTop: '1px solid var(--border)' }}>
											<Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 1 }}>
												Photos Uploaded
											</Typography>
											<Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
												{vehiclePhotos.length} photo{vehiclePhotos.length !== 1 ? 's' : ''}
											</Typography>
										</Box>
									)}
								</Box>

								{/* Internal Notes */}
								<Box>
									<FormField
										id="internalNotes"
										label="Internal Notes (Optional)"
										placeholder="Add any internal notes about this shipment..."
										multiline
										rows={4}
										error={!!errors.internalNotes}
										helperText={errors.internalNotes?.message}
										{...register('internalNotes')}
									/>
								</Box>
							</Box>
						</DashboardPanel>
					)}

					{/* Navigation Buttons */}
					<Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
						<Button
							type="button"
							variant="outline"
							onClick={handleBack}
							disabled={activeStep === 0}
							icon={<ArrowLeft className="w-4 h-4" />}
						>
							Back
						</Button>

						<Box sx={{ display: 'flex', gap: 2 }}>
							<Link href="/dashboard/shipments" style={{ textDecoration: 'none' }}>
								<Button type="button" variant="ghost">
									Cancel
								</Button>
							</Link>
							
							{activeStep === steps.length - 1 ? (
								<Button
									type="submit"
									variant="primary"
									disabled={isSubmitting}
									icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
								>
									{isSubmitting ? 'Creating...' : 'Create Shipment'}
								</Button>
							) : (
								<Button
									type="button"
									variant="primary"
									onClick={handleNext}
									icon={<ArrowRight className="w-4 h-4" />}
									iconPosition="end"
								>
									Next
								</Button>
							)}
						</Box>
					</Box>
				</form>
			</DashboardSurface>
		</ProtectedRoute>
	);
}
