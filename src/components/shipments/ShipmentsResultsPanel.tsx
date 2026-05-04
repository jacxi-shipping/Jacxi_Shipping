'use client';

import Link from 'next/link';
import { Add, ChevronLeft, ChevronRight, Inventory2 } from '@mui/icons-material';
import { Box, Typography } from '@mui/material';
import ShipmentRow from '@/components/dashboard/ShipmentRow';
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, EmptyState, SkeletonTable } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import type { Shipment, ShipmentTableRow } from '@/components/shipments/shipment-list-types';

type BulkStatusOption = {
	value: string;
	label: string;
};

type ShipmentsResultsPanelProps = {
	loading: boolean;
	shipments: Shipment[];
	searchQuery: string;
	canManageShipments: boolean;
	canUseBulkMode: boolean;
	showBulkTable: boolean;
	onToggleBulkMode: () => void;
	shipmentTableRows: ShipmentTableRow[];
	shipmentColumns: Column<ShipmentTableRow>[];
	onRowClick: (row: ShipmentTableRow) => void;
	onBulkDelete?: (shipmentIds: string[]) => void;
	onBulkExport?: (rows: ShipmentTableRow[]) => void;
	bulkStatusOptions: BulkStatusOption[];
	onBulkStatusChange?: (shipmentIds: string[], status: string) => void;
	isAdmin: boolean;
	canViewFinance: boolean;
	currentPage: number;
	totalPages: number;
	onPreviousPage: () => void;
	onNextPage: () => void;
};

export default function ShipmentsResultsPanel({
	loading,
	shipments,
	searchQuery,
	canManageShipments,
	canUseBulkMode,
	showBulkTable,
	onToggleBulkMode,
	shipmentTableRows,
	shipmentColumns,
	onRowClick,
	onBulkDelete,
	onBulkExport,
	bulkStatusOptions,
	onBulkStatusChange,
	isAdmin,
	canViewFinance,
	currentPage,
	totalPages,
	onPreviousPage,
	onNextPage,
}: ShipmentsResultsPanelProps) {
	return (
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
				canUseBulkMode ? (
					<Button variant="outline" size="sm" onClick={onToggleBulkMode}>
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
					description={searchQuery ? 'Try adjusting your search filters' : 'Get started by creating your first shipment'}
					action={
						canManageShipments ? (
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
								selectable={canUseBulkMode}
								onRowClick={onRowClick}
								onDelete={onBulkDelete}
								onExport={onBulkExport}
								bulkStatusOptions={bulkStatusOptions}
								onBulkStatusChange={onBulkStatusChange}
							/>
						</Box>
					) : null}

					<Box
						sx={{
							display: showBulkTable ? { xs: 'flex', md: 'none' } : 'flex',
							flexDirection: 'column',
							gap: { xs: 1, sm: 1.15, md: 1.25 },
							minWidth: 0,
							width: '100%',
							overflow: 'hidden',
						}}
					>
						{shipments.map((shipment, index) => (
							<ShipmentRow
								key={shipment.id}
								{...shipment}
								purchasePrice={canViewFinance ? (shipment.purchasePrice ?? null) : null}
								purchasePricePaid={canViewFinance ? (shipment.purchasePricePaid ?? null) : null}
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
								onClick={onPreviousPage}
								disabled={currentPage === 1}
								sx={{ width: { xs: '100%', sm: 'auto' }, minHeight: '44px' }}
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
								onClick={onNextPage}
								disabled={currentPage === totalPages}
								sx={{ width: { xs: '100%', sm: 'auto' }, minHeight: '44px' }}
							>
								Next
							</Button>
						</Box>
					)}
				</>
			)}
		</DashboardPanel>
	);
}