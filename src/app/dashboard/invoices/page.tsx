'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
	Box, 
	Table, 
	TableBody, 
	TableCell, 
	TableContainer, 
	TableHead, 
	TableRow,
	Chip,
	MenuItem,
	Select,
	FormControl,
	InputLabel,
	TextField,
	InputAdornment,
} from '@mui/material';
import {
	FileText,
	Search,
	Download,
	Eye,
	Calendar,
	DollarSign,
	User,
	Package,
} from 'lucide-react';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { 
	PageHeader, 
	Button, 
	Breadcrumbs, 
	toast, 
	LoadingState, 
	EmptyState, 
	StatsCard,
	DashboardPageSkeleton,
	StatusBadge,
} from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import { exportToCSVWithHeaders } from '@/lib/export';

interface Invoice {
	id: string;
	invoiceNumber: string;
	userId: string;
	containerId: string;
	status: string;
	issueDate: string;
	dueDate: string | null;
	total: number;
	user: {
		name: string | null;
		email: string;
	};
	container: {
		containerNumber: string;
	};
	_count: {
		lineItems: number;
	};
}

interface InvoiceTableRow {
	id: string;
	invoiceNumber: string;
	customer: string;
	containerNumber: string;
	containerId: string;
	issueDate: string;
	dueDate: string | null;
	status: string;
	total: number;
}

const statusConfig: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
	DRAFT: { label: 'Draft', color: 'default' },
	PENDING: { label: 'Pending', color: 'warning' },
	SENT: { label: 'Sent', color: 'info' },
	PAID: { label: 'Paid', color: 'success' },
	OVERDUE: { label: 'Overdue', color: 'error' },
	CANCELLED: { label: 'Cancelled', color: 'default' },
};

export default function InvoicesPage() {
	const router = useRouter();
	const { data: session } = useSession();
	const [invoices, setInvoices] = useState<Invoice[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [showBulkTable, setShowBulkTable] = useState(false);

	const isAdmin = session?.user?.role === 'admin';

	useEffect(() => {
		fetchInvoices();
	}, [statusFilter]);

	const fetchInvoices = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams();
			if (statusFilter !== 'all') {
				params.append('status', statusFilter.toUpperCase());
			}
			
			const response = await fetch(`/api/invoices?${params}`, { cache: 'no-store' });
			const data = await response.json();

			if (response.ok) {
				setInvoices(data.invoices || []);
			} else {
				toast.error('Failed to load invoices');
			}
		} catch (error) {
			console.error('Error fetching invoices:', error);
			toast.error('An error occurred');
		} finally {
			setLoading(false);
		}
	};

	const handleDownloadPDF = async (invoice: Invoice) => {
		try {
			toast.success('Generating PDF...', {
				description: 'Please wait a moment'
			});

			// Fetch full invoice details
			const response = await fetch(`/api/invoices/${invoice.id}`, { cache: 'no-store' });
			const fullInvoice = await response.json();

			// Dynamically import the PDF generator
			const { downloadInvoicePDF } = await import('@/lib/utils/generateInvoicePDF');
			
			// Generate and download the PDF
			downloadInvoicePDF(fullInvoice);

			toast.success('PDF downloaded successfully!', {
				description: 'Check your downloads folder'
			});
		} catch (error) {
			console.error('Error generating PDF:', error);
			toast.error('Failed to generate PDF', {
				description: 'Please try again'
			});
		}
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
		}).format(amount);
	};

	const formatDate = (date: string | null) => {
		if (!date) return 'N/A';
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	};

	// Filter invoices based on search
	const filteredInvoices = invoices.filter(invoice => {
		const searchLower = searchTerm.toLowerCase();
		return (
			invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
			invoice.user.email.toLowerCase().includes(searchLower) ||
			(invoice.user.name && invoice.user.name.toLowerCase().includes(searchLower)) ||
			invoice.container.containerNumber.toLowerCase().includes(searchLower)
		);
	});

	const invoiceRows: InvoiceTableRow[] = filteredInvoices.map((invoice) => ({
		id: invoice.id,
		invoiceNumber: invoice.invoiceNumber,
		customer: invoice.user.name || invoice.user.email,
		containerNumber: invoice.container.containerNumber,
		containerId: invoice.containerId,
		issueDate: invoice.issueDate,
		dueDate: invoice.dueDate,
		status: invoice.status,
		total: invoice.total,
	}));

	const invoiceColumns: Column<InvoiceTableRow>[] = [
		{ key: 'invoiceNumber', header: 'Invoice #', sortable: true },
		...(isAdmin ? [{ key: 'customer', header: 'Customer', sortable: true }] : []),
		{
			key: 'containerNumber',
			header: 'Container',
			render: (value, row) => (
				<Link
					href={`/dashboard/containers/${row.containerId}`}
					style={{
						color: 'var(--accent-gold)',
						textDecoration: 'none',
						fontFamily: 'monospace',
						fontWeight: 600,
					}}
				>
					{String(value)}
				</Link>
			),
		},
		{
			key: 'issueDate',
			header: 'Issue Date',
			sortable: true,
			render: (value) => formatDate(String(value)),
		},
		{
			key: 'dueDate',
			header: 'Due Date',
			render: (value) => formatDate(value ? String(value) : null),
		},
		{
			key: 'status',
			header: 'Status',
			render: (value) => <StatusBadge status={String(value)} size="sm" />,
		},
		{
			key: 'total',
			header: 'Total',
			render: (value) => formatCurrency(Number(value)),
		},
	];

	const invoiceStatusOptions = Object.entries(statusConfig).map(([value, config]) => ({
		value,
		label: config.label,
	}));

	const handleBulkStatusUpdate = async (invoiceIds: string[], status: string) => {
		if (!isAdmin) return;

		try {
			const response = await fetch('/api/bulk/invoices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'updateStatus', invoiceIds, data: { status } }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data?.message || 'Bulk status update failed');
			}

			toast.success('Invoices updated', {
				description: `${data.count || 0} invoice(s) updated`,
			});
			fetchInvoices();
		} catch (error) {
			console.error('Error updating invoices:', error);
			toast.error('Failed to update invoices');
		}
	};

	const handleBulkDelete = async (invoiceIds: string[]) => {
		if (!isAdmin) return;

		if (!confirm(`Delete ${invoiceIds.length} invoice(s)? This cannot be undone.`)) {
			return;
		}

		try {
			const response = await fetch('/api/bulk/invoices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'delete', invoiceIds }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data?.message || 'Bulk delete failed');
			}

			toast.success('Invoices deleted', {
				description: `${data.count || 0} invoice(s) removed`,
			});
			fetchInvoices();
		} catch (error) {
			console.error('Error deleting invoices:', error);
			toast.error('Failed to delete invoices');
		}
	};

	const handleBulkExport = (rows: InvoiceTableRow[]) => {
		try {
			exportToCSVWithHeaders(
				rows.map((row) => ({
					invoiceNumber: row.invoiceNumber,
					customer: row.customer,
					containerNumber: row.containerNumber,
					issueDate: formatDate(row.issueDate),
					dueDate: formatDate(row.dueDate),
					status: row.status,
					total: formatCurrency(row.total),
				})),
				[
					{ key: 'invoiceNumber', label: 'Invoice #' },
					{ key: 'customer', label: 'Customer' },
					{ key: 'containerNumber', label: 'Container' },
					{ key: 'issueDate', label: 'Issue Date' },
					{ key: 'dueDate', label: 'Due Date' },
					{ key: 'status', label: 'Status' },
					{ key: 'total', label: 'Total' },
				],
				'invoices'
			);
			toast.success('Export ready');
		} catch (error) {
			console.error('Error exporting invoices:', error);
			toast.error('Failed to export invoices');
		}
	};

	// Calculate stats
	const stats = {
		total: invoices.length,
		paid: invoices.filter(i => i.status === 'PAID').length,
		pending: invoices.filter(i => i.status === 'PENDING' || i.status === 'SENT').length,
		overdue: invoices.filter(i => i.status === 'OVERDUE').length,
		totalAmount: invoices.reduce((sum, i) => sum + i.total, 0),
		paidAmount: invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.total, 0),
	};

	if (loading) {
		return <DashboardPageSkeleton />;
	}

	return (
		<Box sx={{ maxWidth: '1400px', mx: 'auto', p: { xs: 2, md: 3 } }}>
			{/* Breadcrumbs */}
			<Breadcrumbs
				items={[
					{ label: 'Dashboard', href: '/dashboard' },
					{ label: isAdmin ? 'All Invoices' : 'My Invoices', href: '#' },
				]}
			/>

			{/* Page Header */}
			<PageHeader
				title={isAdmin ? 'All Invoices' : 'My Invoices'}
				description={isAdmin ? 'Manage customer invoices' : 'View and download your invoices'}
				actions={
					isAdmin ? (
						<Button variant="outline" onClick={() => setShowBulkTable((prev) => !prev)}>
							{showBulkTable ? 'Table view' : 'Bulk mode'}
						</Button>
					) : null
				}
			/>

			{/* Stats Cards */}
			<Box sx={{ 
				display: 'grid', 
				gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, 
				gap: 3, 
				mb: 3 
			}}>
				<StatsCard
					title="Total Invoices"
					value={stats.total}
					icon={<FileText className="w-5 h-5" />}
					trend={{ value: 0, isPositive: true }}
				/>
				<StatsCard
					title="Paid"
					value={stats.paid}
					subtitle={formatCurrency(stats.paidAmount)}
					icon={<DollarSign className="w-5 h-5" />}
					trend={{ value: 0, isPositive: true }}
					variant="success"
				/>
				<StatsCard
					title="Pending"
					value={stats.pending}
					icon={<Calendar className="w-5 h-5" />}
					trend={{ value: 0, isPositive: true }}
					variant="warning"
				/>
				<StatsCard
					title="Overdue"
					value={stats.overdue}
					icon={<FileText className="w-5 h-5" />}
					trend={{ value: 0, isPositive: false }}
					variant="error"
				/>
			</Box>

			{/* Main Content */}
			<DashboardSurface>
				<DashboardPanel 
					title="Invoices"
					description={`${filteredInvoices.length} invoice(s)`}
				>
					{/* Filters */}
					<Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
						<TextField
							placeholder="Search by invoice #, customer, or container..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							size="small"
							sx={{ flex: 1, minWidth: '250px' }}
							InputProps={{
								startAdornment: (
									<InputAdornment position="start">
										<Search className="w-4 h-4" />
									</InputAdornment>
								),
							}}
						/>
						<FormControl size="small" sx={{ minWidth: 150 }}>
							<InputLabel>Status</InputLabel>
							<Select
								value={statusFilter}
								label="Status"
								onChange={(e) => setStatusFilter(e.target.value)}
							>
								<MenuItem value="all">All Status</MenuItem>
								<MenuItem value="draft">Draft</MenuItem>
								<MenuItem value="pending">Pending</MenuItem>
								<MenuItem value="sent">Sent</MenuItem>
								<MenuItem value="paid">Paid</MenuItem>
								<MenuItem value="overdue">Overdue</MenuItem>
								<MenuItem value="cancelled">Cancelled</MenuItem>
							</Select>
						</FormControl>
					</Box>

					{/* Invoices Table */}
					{filteredInvoices.length === 0 ? (
						<EmptyState
							icon={<FileText className="w-12 h-12" />}
							title="No Invoices"
							description={searchTerm ? 'No invoices match your search' : 'No invoices have been created yet'}
						/>
					) : showBulkTable ? (
						<DataTable
							data={invoiceRows}
							columns={invoiceColumns}
							keyField="id"
							selectable={isAdmin}
							onRowClick={(row) => router.push(`/dashboard/invoices/${row.id}`)}
							onDelete={isAdmin ? handleBulkDelete : undefined}
							onExport={isAdmin ? handleBulkExport : undefined}
							bulkStatusOptions={invoiceStatusOptions}
							onBulkStatusChange={isAdmin ? handleBulkStatusUpdate : undefined}
						/>
					) : (
						<TableContainer>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell sx={{ fontWeight: 600 }}>Invoice #</TableCell>
										{isAdmin && <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>}
										<TableCell sx={{ fontWeight: 600 }}>Container</TableCell>
										<TableCell sx={{ fontWeight: 600 }}>Issue Date</TableCell>
										<TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
										<TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
										<TableCell sx={{ fontWeight: 600 }} align="right">Total</TableCell>
										<TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{filteredInvoices.map((invoice) => {
										const statusInfo = statusConfig[invoice.status] || { label: invoice.status, color: 'default' };
										return (
											<TableRow key={invoice.id} hover>
												<TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
													{invoice.invoiceNumber}
												</TableCell>
												{isAdmin && (
													<TableCell>
														<Box>
															<Box sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
																{invoice.user.name || 'N/A'}
															</Box>
															<Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
																{invoice.user.email}
															</Box>
														</Box>
													</TableCell>
												)}
												<TableCell>
													<Link 
														href={`/dashboard/containers/${invoice.containerId}`}
														style={{ 
															color: 'var(--accent-gold)', 
															textDecoration: 'none',
															fontFamily: 'monospace',
															fontWeight: 600,
														}}
													>
														{invoice.container.containerNumber}
													</Link>
												</TableCell>
												<TableCell>{formatDate(invoice.issueDate)}</TableCell>
												<TableCell>{formatDate(invoice.dueDate)}</TableCell>
												<TableCell>
													<Chip 
														label={statusInfo.label} 
														size="small"
														color={statusInfo.color}
														sx={{ fontSize: '0.75rem' }}
													/>
												</TableCell>
												<TableCell align="right" sx={{ fontWeight: 600, color: 'var(--accent-gold)' }}>
													{formatCurrency(invoice.total)}
												</TableCell>
												<TableCell align="right">
													<Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
														<Button
															variant="outline"
															size="sm"
															icon={<Eye className="w-3 h-3" />}
															onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
														>
															View
														</Button>
														<Button
															variant="outline"
															size="sm"
															icon={<Download className="w-3 h-3" />}
															onClick={() => handleDownloadPDF(invoice)}
														>
															PDF
														</Button>
													</Box>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</TableContainer>
					)}
				</DashboardPanel>
			</DashboardSurface>
		</Box>
	);
}
