'use client';

import Link from 'next/link';
import { Add } from '@mui/icons-material';
import { Box } from '@mui/material';
import SmartSearch, { SearchFilters } from '@/components/dashboard/SmartSearch';
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button } from '@/components/design-system';

type ShipmentsSearchPanelProps = {
	onSearch: (filters: SearchFilters) => void;
	canManageShipments: boolean;
	isAdmin: boolean;
};

export default function ShipmentsSearchPanel({
	onSearch,
	canManageShipments,
	isAdmin,
}: ShipmentsSearchPanelProps) {
	return (
		<DashboardPanel
			title="Search"
			description="Filter shipments instantly"
			noBodyPadding
			className="overflow-hidden"
			actions={
				canManageShipments ? (
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
					onSearch={onSearch}
					placeholder="Search shipments by tracking number, VIN, origin, destination..."
					showTypeFilter={false}
					showStatusFilter
					showWorkflowStageFilter
					showYardFilter
					showDateFilter
					showPriceFilter
					showUserFilter={isAdmin}
					defaultType="shipments"
				/>
			</Box>
		</DashboardPanel>
	);
}