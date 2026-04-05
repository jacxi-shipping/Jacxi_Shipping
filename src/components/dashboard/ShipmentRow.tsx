"use client";

import Link from 'next/link';
import { Visibility, Edit, LocalShipping, CreditCard, LocationOn, CalendarToday } from '@mui/icons-material';
import { Box, Typography, LinearProgress, Chip } from '@mui/material';
import { StatusBadge, Button } from '@/components/design-system';

interface ShipmentRowProps {
	id: string;
	vehicleType: string;
	vehicleMake: string | null;
	vehicleModel: string | null;
	vehicleYear?: number | null;
	vehicleVIN?: string | null;
	status: string;
	createdAt: string;
	paymentStatus?: string;
	dispatchId?: string | null;
	containerId?: string | null;
	dispatch?: {
		id: string;
		referenceNumber: string;
		status?: string | null;
		origin?: string | null;
		destination?: string | null;
	} | null;
	container?: {
		id: string;
		containerNumber: string;
		trackingNumber?: string | null;
		status?: string;
		currentLocation?: string | null;
		progress?: number;
		estimatedArrival?: string | null;
		vesselName?: string | null;
		shippingLine?: string | null;
	} | null;
	transit?: {
		id: string;
		referenceNumber: string;
		status?: string | null;
		destination?: string | null;
	} | null;
	yardReceived?: boolean;
	yardReceivedAt?: string | null;
	user?: {
		name: string | null;
		email: string;
	};
	showCustomer?: boolean;
	isAdmin?: boolean;
	onStatusUpdated?: () => void;
	delay?: number;
}

const formatStatus = (status: string) => {
	return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
};

export default function ShipmentRow({
	id,
	vehicleType,
	vehicleMake,
	vehicleModel,
	vehicleYear,
	vehicleVIN,
	status,
	createdAt,
	paymentStatus,
	dispatchId,
	dispatch,
	containerId,
	container,
	transit,
	yardReceived = false,
	yardReceivedAt,
	user,
	showCustomer = false,
	delay = 0,
}: ShipmentRowProps) {
	const vehicleInfo = [vehicleMake, vehicleModel, vehicleYear].filter(Boolean).join(' ') || vehicleType;

	// ⚡ Bolt: Removed `useState` and `useEffect` for visibility and replaced `<Slide>` with a pure CSS animation
	// from `globals.css` (`className="animate-fade-in-up"`) applying the delay using inline styles.
	// This eliminates the double-render on mount for each row, significantly boosting list rendering performance.
	return (
			<Box
				component="article"
				className="animate-fade-in-up"
				sx={{
					animationDelay: `${delay}s`,
					animationFillMode: 'both',
					background: 'var(--panel)',
					border: '1px solid rgba(var(--panel-rgb), 0.9)',
					borderRadius: 2,
					boxShadow: '0 18px 32px rgba(var(--text-primary-rgb), 0.08)',
					padding: { xs: 1.25, sm: 1.5, md: 1.75 },
					display: 'grid',
					gridTemplateColumns: {
						xs: '1fr',
						md: 'minmax(0, 1.5fr) minmax(0, 1.2fr) minmax(0, 1fr) auto',
					},
					gap: { xs: 1.25, md: 1.5 },
					alignItems: 'center',
					minWidth: 0,
					width: '100%',
					boxSizing: 'border-box',
				}}
			>
				{/* Column 1: Vehicle Info & Status */}
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0, overflow: 'hidden' }}>
					<Typography
						sx={{
							fontSize: { xs: '0.8rem', sm: '0.85rem', md: '0.9rem' },
							fontWeight: 600,
							color: 'var(--text-primary)',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
						}}
					>
						{vehicleInfo}
					</Typography>
					{vehicleVIN && (
						<Typography sx={{ fontSize: { xs: '0.62rem', sm: '0.65rem', md: '0.68rem' }, color: 'var(--text-secondary)' }}>
							VIN: {vehicleVIN}
						</Typography>
					)}
					<Typography sx={{ fontSize: { xs: '0.62rem', sm: '0.65rem', md: '0.68rem' }, color: 'var(--text-secondary)' }}>
						Created: {new Date(createdAt).toLocaleDateString()}
					</Typography>
				<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, minWidth: 0, mt: 0.5 }}>
					<StatusBadge 
						status={status} 
						variant="default" 
						size="sm"
					/>
					{yardReceived && (
						<Chip
							label={yardReceivedAt ? `Yard Received ${new Date(yardReceivedAt).toLocaleDateString()}` : 'Yard Received'}
							size="small"
							sx={{
								height: 24,
								fontSize: '0.7rem',
								fontWeight: 700,
								bgcolor: 'rgba(34, 197, 94, 0.12)',
								color: 'rgb(21, 128, 61)',
								border: '1px solid rgba(34, 197, 94, 0.28)',
							}}
						/>
					)}
					{paymentStatus && (
						<StatusBadge 
							status={paymentStatus} 
							variant="default" 
							size="sm"
							icon={<CreditCard sx={{ fontSize: 12 }} />}
						/>
					)}
				</Box>
				</Box>

				{/* Column 2: Vehicle Type */}
				<Box sx={{ minWidth: 0, overflow: 'hidden' }}>
					<Typography sx={{ fontSize: { xs: '0.6rem', sm: '0.62rem', md: '0.65rem' }, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-secondary)', mb: 0.3 }}>
						Vehicle Type
					</Typography>
					<Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.78rem', md: '0.8rem' }, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vehicleType}</Typography>
					{showCustomer && user && (
						<Typography sx={{ fontSize: { xs: '0.62rem', sm: '0.65rem', md: '0.68rem' }, color: 'var(--text-secondary)', mt: 0.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
							{user.name || user.email}
						</Typography>
					)}
				</Box>

				{/* Column 3: Container Info or Status Info */}
				<Box sx={{ minWidth: 0, overflow: 'hidden' }}>
					{transit ? (
						<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
							<Typography sx={{ fontSize: { xs: '0.6rem', sm: '0.62rem', md: '0.65rem' }, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-secondary)', mb: 0.3 }}>
								Transit
							</Typography>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
								<LocalShipping sx={{ fontSize: { xs: 14, sm: 16 }, color: 'var(--accent-gold)' }} />
								<Link href={`/dashboard/transits/${transit.id}`} style={{ textDecoration: 'none' }}>
									<Typography
										sx={{
											fontSize: { xs: '0.72rem', sm: '0.75rem', md: '0.78rem' },
											fontWeight: 600,
											color: 'var(--accent-gold)',
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap',
											'&:hover': { textDecoration: 'underline' },
										}}
									>
										{transit.referenceNumber}
									</Typography>
								</Link>
							</Box>
							<Typography sx={{ fontSize: { xs: '0.62rem', sm: '0.65rem', md: '0.68rem' }, color: 'var(--text-secondary)', mt: 0.2 }}>
								Final-mile delivery in progress
							</Typography>
							{transit.destination && (
								<Typography sx={{ fontSize: { xs: '0.58rem', sm: '0.6rem', md: '0.62rem' }, color: 'var(--text-secondary)', mt: 0.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
									Destination: {transit.destination}
								</Typography>
							)}
						</Box>
					) : container ? (
						<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
							<Typography sx={{ fontSize: { xs: '0.6rem', sm: '0.62rem', md: '0.65rem' }, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-secondary)', mb: 0.3 }}>
								Container Shipping
							</Typography>
							
							{/* Container Number */}
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
								<LocalShipping sx={{ fontSize: { xs: 14, sm: 16 }, color: 'var(--accent-gold)' }} />
								<Link href={`/dashboard/containers/${containerId}`} style={{ textDecoration: 'none' }}>
									<Typography
										sx={{
											fontSize: { xs: '0.72rem', sm: '0.75rem', md: '0.78rem' },
											fontWeight: 600,
											color: 'var(--accent-gold)',
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap',
											'&:hover': { textDecoration: 'underline' },
										}}
									>
										{container.containerNumber}
									</Typography>
								</Link>
							</Box>

							{/* Progress Bar */}
							{typeof container.progress === 'number' && (
								<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, mt: 0.3 }}>
									<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
										<Typography
											sx={{
												fontSize: { xs: '0.58rem', sm: '0.6rem', md: '0.62rem' },
												color: 'var(--text-secondary)',
											}}
										>
											Progress
										</Typography>
										<Typography
											sx={{
												fontSize: { xs: '0.62rem', sm: '0.65rem', md: '0.68rem' },
												fontWeight: 600,
												color: 'var(--accent-gold)',
											}}
										>
											{container.progress}%
										</Typography>
									</Box>
									<LinearProgress
										variant="determinate"
										value={container.progress}
										sx={{
											height: 4,
											borderRadius: 1,
											backgroundColor: 'rgba(var(--border-rgb), 0.3)',
											'& .MuiLinearProgress-bar': {
												backgroundColor: 'var(--accent-gold)',
												borderRadius: 1,
											},
										}}
									/>
								</Box>
							)}

							{/* Status */}
							{container.status && (
								<Typography sx={{ fontSize: { xs: '0.62rem', sm: '0.65rem', md: '0.68rem' }, color: 'var(--text-secondary)', mt: 0.2 }}>
									Status: {formatStatus(container.status)}
								</Typography>
							)}

							{/* Current Location */}
							{container.currentLocation && (
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
									<LocationOn sx={{ fontSize: { xs: 12, sm: 14 }, color: 'var(--text-secondary)' }} />
									<Typography sx={{ fontSize: { xs: '0.58rem', sm: '0.6rem', md: '0.62rem' }, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
										{container.currentLocation}
									</Typography>
								</Box>
							)}

							{/* Vessel Name */}
							{container.vesselName && (
								<Typography sx={{ fontSize: { xs: '0.58rem', sm: '0.6rem', md: '0.62rem' }, color: 'var(--text-secondary)', mt: 0.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
									🚢 {container.vesselName}
								</Typography>
							)}

							{/* Estimated Arrival */}
							{container.estimatedArrival && (
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
									<CalendarToday sx={{ fontSize: { xs: 12, sm: 14 }, color: 'var(--text-secondary)' }} />
									<Typography sx={{ fontSize: { xs: '0.58rem', sm: '0.6rem', md: '0.62rem' }, color: 'var(--text-secondary)' }}>
										ETA: {new Date(container.estimatedArrival).toLocaleDateString()}
									</Typography>
								</Box>
							)}

							{/* Shipping Line */}
							{container.shippingLine && (
								<Typography sx={{ fontSize: { xs: '0.58rem', sm: '0.6rem', md: '0.62rem' }, color: 'var(--text-secondary)', mt: 0.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
									Line: {container.shippingLine}
									</Typography>
							)}
						</Box>
					) : dispatch ? (
						<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
							<Typography sx={{ fontSize: { xs: '0.6rem', sm: '0.62rem', md: '0.65rem' }, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-secondary)', mb: 0.3 }}>
								Dispatch To Port
							</Typography>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
								<LocalShipping sx={{ fontSize: { xs: 14, sm: 16 }, color: 'var(--accent-gold)' }} />
								<Link href={`/dashboard/dispatches/${dispatch.id}`} style={{ textDecoration: 'none' }}>
									<Typography
										sx={{
											fontSize: { xs: '0.72rem', sm: '0.75rem', md: '0.78rem' },
											fontWeight: 600,
											color: 'var(--accent-gold)',
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap',
											'&:hover': { textDecoration: 'underline' },
										}}
									>
										{dispatch.referenceNumber}
									</Typography>
								</Link>
							</Box>
							<Typography sx={{ fontSize: { xs: '0.62rem', sm: '0.65rem', md: '0.68rem' }, color: 'var(--text-secondary)', mt: 0.2 }}>
								{dispatch.origin || 'USA Yard'} to {dispatch.destination || 'Port of Loading'}
							</Typography>
							{dispatch.status && (
								<Typography sx={{ fontSize: { xs: '0.58rem', sm: '0.6rem', md: '0.62rem' }, color: 'var(--text-secondary)', mt: 0.2 }}>
									Status: {formatStatus(dispatch.status)}
								</Typography>
							)}
						</Box>
					) : (
						<>
							<Typography sx={{ fontSize: { xs: '0.6rem', sm: '0.62rem', md: '0.65rem' }, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-secondary)', mb: 0.3 }}>
								Location
							</Typography>
							<Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.78rem', md: '0.8rem' }, fontWeight: 600, color: 'var(--text-primary)' }}>
								Warehouse
							</Typography>
							<Typography sx={{ fontSize: { xs: '0.62rem', sm: '0.65rem', md: '0.68rem' }, color: 'var(--text-secondary)', mt: 0.2 }}>
								{dispatchId ? 'Dispatch assigned' : 'On Hand'}
							</Typography>
						</>
					)}
				</Box>

				{/* Column 4: Actions */}
				<Box
					sx={{
						display: 'flex',
						flexDirection: { xs: 'row', md: 'column' },
						gap: 0.75,
						justifyContent: { xs: 'flex-end', md: 'center' },
						alignItems: { xs: 'center', md: 'flex-end' },
						flexShrink: 0,
					}}
				>
				<Link href={`/dashboard/shipments/${id}`} style={{ textDecoration: 'none' }}>
					<Button
						variant="outline"
						size="sm"
						icon={<Visibility sx={{ fontSize: 14 }} />}
						iconPosition="start"
					>
						View
					</Button>
				</Link>
				<Link href={`/dashboard/shipments/${id}/edit`} style={{ textDecoration: 'none' }}>
					<Button
						variant="ghost"
						size="sm"
						icon={<Edit sx={{ fontSize: 14 }} />}
						iconPosition="start"
					>
						Edit
					</Button>
				</Link>
				</Box>
			</Box>
	);
}
