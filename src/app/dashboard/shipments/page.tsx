'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Add, ChevronLeft, ChevronRight, Inventory2 } from '@mui/icons-material';
import { Box, CircularProgress, Typography } from '@mui/material';
import ShipmentRow from '@/components/dashboard/ShipmentRow';
import SmartSearch, { SearchFilters } from '@/components/dashboard/SmartSearch';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, EmptyState, Breadcrumbs, SkeletonTable, toast } from '@/components/design-system';

interface Shipment {
	id: string;
	trackingNumber?: string;
	vehicleType: string;
	vehicleMake: string | null;
	vehicleModel: string | null;
	vehicleYear?: number | null;
	vehicleVIN?: string | null;
	origin?: string;
	destination?: string;
	status: string;
	progress?: number;
	estimatedDelivery?: string | null;
	createdAt: string;
	paymentStatus?: string;
	containerId?: string | null;
	container?: {
		id: string;
		containerNumber: string;
		trackingNumber?: string | null;
		status?: string;
		currentLocation?: string | null;
		progress?: number;
	} | null;
	user?: {
		name: string | null;
		email: string;
	};
}

export default function ShipmentsListPage() {
	const { data: session } = useSession();
	const [shipments, setShipments] = useState<Shipment[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchFilters, setSearchFilters] = useState<SearchFilters>({
		query: '',
		type: 'shipments',
	});
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);

	const fetchShipments = useCallback(async () => {
		try {
			setLoading(true);
			
			// Build query params from search filters
			const params = new URLSearchParams();
			params.append('page', currentPage.toString());
			params.append('limit', '10');
			
			if (searchFilters.query) params.append('query', searchFilters.query);
			if (searchFilters.status) params.append('status', searchFilters.status);
			if (searchFilters.dateFrom) params.append('dateFrom', searchFilters.dateFrom);
			if (searchFilters.dateTo) params.append('dateTo', searchFilters.dateTo);
			if (searchFilters.minPrice) params.append('minPrice', searchFilters.minPrice);
			if (searchFilters.maxPrice) params.append('maxPrice', searchFilters.maxPrice);

			const response = await fetch(`/api/search?${params.toString()}&type=shipments&sortBy=createdAt&sortOrder=desc`);
			const data = await response.json();
			
			setShipments(data.shipments ?? []);
			setTotalPages(Math.ceil((data.totalShipments ?? 0) / 10) || 1);
		} catch (error) {
			console.error('Error fetching shipments:', error);
			toast.error('Failed to load shipments', {
				description: 'Please try again or refresh the page'
			});
			setShipments([]);
		} finally {
			setLoading(false);
		}
	}, [searchFilters, currentPage]);

	useEffect(() => {
		fetchShipments();
	}, [fetchShipments]);

	const handleSearch = (filters: SearchFilters) => {
		setSearchFilters(filters);
		setCurrentPage(1); // Reset to first page on new search
	};

	const isAdmin = session?.user?.role === 'admin';

	return (
		<DashboardSurface className="overflow-hidden">
			{/* Breadcrumbs */}
			<Box sx={{ px: 2, pt: 2 }}>
				<Breadcrumbs />
			</Box>
			
			<DashboardPanel
				title="Search"
				description="Filter shipments instantly"
				noBodyPadding
				className="overflow-hidden"
				actions={
					isAdmin ? (
						<Link href="/dashboard/shipments/new" style={{ textDecoration: 'none' }}>
							<Button
								variant="primary"
								size="sm"
								icon={<Add fontSize="small" />}
								iconPosition="start"
							>
								New shipment
							</Button>
						</Link>
					) : null
				}
			>
				<Box sx={{ px: { xs: 1, sm: 1.25, md: 1.5 }, py: { xs: 1, sm: 1.25, md: 1.5 } }}>
					<SmartSearch
						onSearch={handleSearch}
						placeholder="Search shipments by tracking number, VIN, origin, destination..."
						showTypeFilter={false}
						showStatusFilter
						showDateFilter
						showPriceFilter
						showUserFilter={isAdmin}
						defaultType="shipments"
					/>
				</Box>
			</DashboardPanel>

			<DashboardPanel
				title="Results"
				description={
					shipments.length
						? `Showing ${shipments.length} shipment${shipments.length !== 1 ? 's' : ''}`
						: 'No shipments found'
				}
				fullHeight
				className="overflow-hidden"
				bodyClassName="overflow-hidden"
			>
				{loading ? (
					<SkeletonTable rows={5} columns={6} />
				) : shipments.length === 0 ? (
					<EmptyState
						icon={<Inventory2 />}
						title="No shipments found"
						description={searchFilters.query ? "Try adjusting your search filters" : "Get started by creating your first shipment"}
						action={
							isAdmin ? (
								<Link href="/dashboard/shipments/new" style={{ textDecoration: 'none' }}>
									<Button variant="primary" icon={<Add />} iconPosition="start">
										Create shipment
									</Button>
								</Link>
							) : undefined
						}
					/>
				) : (
					<>
						<Box sx={{ 
							display: 'flex', 
							flexDirection: 'column', 
							gap: { xs: 1, sm: 1.15, md: 1.25 },
							minWidth: 0,
							width: '100%',
							overflow: 'hidden',
						}}>
							{shipments.map((shipment, index) => (
								<ShipmentRow
									key={shipment.id}
									{...shipment}
									showCustomer={isAdmin}
									delay={index * 0.05}
								/>
							))}
						</Box>

						{totalPages > 1 && (
							<Box
								sx={{
									mt: 2,
									display: 'flex',
									flexDirection: { xs: 'column', sm: 'row' },
									alignItems: 'center',
									justifyContent: 'space-between',
									gap: 1,
									width: '100%',
								}}
							>
								<Button
									variant="outline"
									size="sm"
									icon={<ChevronLeft sx={{ fontSize: { xs: 12, sm: 14 } }} />}
									iconPosition="start"
									onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
									disabled={currentPage === 1}
									sx={{ width: { xs: '100%', sm: 'auto' } }}
								>
									Previous
								</Button>
								<Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.72rem', md: '0.75rem' }, color: 'var(--text-secondary)' }}>
									Page {currentPage} of {totalPages}
								</Typography>
								<Button
									variant="outline"
									size="sm"
									icon={<ChevronRight sx={{ fontSize: { xs: 12, sm: 14 } }} />}
									iconPosition="end"
									onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
									disabled={currentPage === totalPages}
									sx={{ width: { xs: '100%', sm: 'auto' } }}
								>
									Next
								</Button>
							</Box>
						)}
					</>
				)}
			</DashboardPanel>
		</DashboardSurface>
	);
}
