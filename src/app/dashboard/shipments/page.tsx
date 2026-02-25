'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Add, ChevronLeft, ChevronRight, Inventory2 } from '@mui/icons-material';
import { Box, Typography } from '@mui/material';
import ShipmentRow from '@/components/dashboard/ShipmentRow';
import SmartSearch, { SearchFilters } from '@/components/dashboard/SmartSearch';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, EmptyState, Breadcrumbs, SkeletonTable, toast, StatusBadge } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import { exportToCSVWithHeaders } from '@/lib/export';

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

interface ShipmentTableRow {
	id: string;
	vehicle: string;
	vin: string;
	status: string;
	paymentStatus: string;
	container: string;
	createdAt: string;
	customer: string;
}

export default function ShipmentsListPage() {
	const router = useRouter();
	const { data: session } = useSession();
	const [shipments, setShipments] = useState<Shipment[]>([]);
	const [loading, setLoading] = useState(true);
	const [showBulkTable, setShowBulkTable] = useState(false);
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

	const formatDate = (value: string) => new Date(value).toLocaleDateString();

	const shipmentTableRows: ShipmentTableRow[] = shipments.map((shipment) => {
		const vehicleInfo =
			[shipment.vehicleMake, shipment.vehicleModel, shipment.vehicleYear]
				.filter(Boolean)
				.join(' ') || shipment.vehicleType;

		return {
			id: shipment.id,
			vehicle: vehicleInfo,
			vin: shipment.vehicleVIN ?? '-',
			status: shipment.status,
			paymentStatus: shipment.paymentStatus ?? '-',
			container: shipment.container?.containerNumber ?? '-',
			createdAt: shipment.createdAt,
			customer: shipment.user?.name || shipment.user?.email || '-',
		};
	});

	const shipmentColumns: Column<ShipmentTableRow>[] = [
		{ key: 'vehicle', header: 'Vehicle', sortable: true },
		{ key: 'vin', header: 'VIN', sortable: true },
		{
			key: 'status',
			header: 'Status',
			render: (value) => <StatusBadge status={String(value)} size="sm" />,
		},
		{
			key: 'paymentStatus',
			header: 'Payment',
			render: (value) => <StatusBadge status={String(value)} size="sm" />,
		},
		{ key: 'container', header: 'Container', sortable: true },
		{
			key: 'createdAt',
			header: 'Created',
			sortable: true,
			render: (value) => formatDate(String(value)),
		},
		...(isAdmin ? [{ key: 'customer', header: 'Customer', sortable: true }] : []),
	];

	const shipmentStatusOptions = [
		{ value: 'ON_HAND', label: 'On Hand' },
		{ value: 'IN_TRANSIT', label: 'In Transit' },
	];

	const handleBulkDelete = async (shipmentIds: string[]) => {
		if (!isAdmin) return;
		if (!confirm(`Delete ${shipmentIds.length} shipment(s)? This cannot be undone.`)) {
			return;
		}

		try {
			const response = await fetch('/api/bulk/shipments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'delete', shipmentIds }),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data?.message || 'Bulk delete failed');
			}

			const data = await response.json();
			toast.success('Shipments deleted', {
				description: `${data.count || 0} shipment(s) removed`,
			});
			fetchShipments();
		} catch (error) {
			console.error('Error deleting shipments:', error);
			toast.error('Failed to delete shipments');
		}
	};

	const handleBulkExport = (rows: ShipmentTableRow[]) => {
		try {
			exportToCSVWithHeaders(
				rows,
				[
					{ key: 'vehicle', label: 'Vehicle' },
					{ key: 'vin', label: 'VIN' },
					{ key: 'status', label: 'Status' },
					{ key: 'paymentStatus', label: 'Payment' },
					{ key: 'container', label: 'Container' },
					{ key: 'createdAt', label: 'Created' },
					...(isAdmin ? [{ key: 'customer' as const, label: 'Customer' }] : []),
				],
				'shipments'
			);
			toast.success('Export ready');
		} catch (error) {
			console.error('Error exporting shipments:', error);
			toast.error('Failed to export shipments');
		}
	};

	const handleBulkStatusUpdate = async (shipmentIds: string[], status: string) => {
		if (!isAdmin) return;

		try {
			const response = await fetch('/api/bulk/shipments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'updateStatus', shipmentIds, data: { status } }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data?.message || 'Bulk status update failed');
			}

			toast.success('Shipments updated', {
				description: `${data.count || 0} shipment(s) updated`,
			});
			fetchShipments();
		} catch (error) {
			console.error('Error updating shipments:', error);
			toast.error('Failed to update shipments');
		}
	};

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
				actions={
					isAdmin ? (
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowBulkTable((prev) => !prev)}
						>
							{showBulkTable ? 'Card view' : 'Bulk mode'}
						</Button>
					) : null
				}
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
						{showBulkTable ? (
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <DataTable
                  data={shipmentTableRows}
                  columns={shipmentColumns}
                  keyField="id"
                  selectable={isAdmin}
                  onRowClick={(row) => router.push(`/dashboard/shipments/${row.id}`)}
                  onDelete={isAdmin ? handleBulkDelete : undefined}
                  onExport={isAdmin ? handleBulkExport : undefined}
                  bulkStatusOptions={shipmentStatusOptions}
                  onBulkStatusChange={isAdmin ? handleBulkStatusUpdate : undefined}
                />
              </Box>
					) : null}

          {/* Mobile/Tablet Card View - Always shown if not bulk table, or if bulk table is active but screen is small */}
          <Box sx={{
            display: showBulkTable ? { xs: 'flex', md: 'none' } : 'flex',
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
								sx={{ width: { xs: '100%', sm: 'auto' }, minHeight: '44px' }} // Touch target size
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
								sx={{ width: { xs: '100%', sm: 'auto' }, minHeight: '44px' }} // Touch target size
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
