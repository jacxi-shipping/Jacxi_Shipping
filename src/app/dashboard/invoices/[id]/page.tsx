'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
	Divider,
	Chip,
	MenuItem,
	Select,
	FormControl,
	InputLabel,
} from '@mui/material';
import {
	ArrowLeft,
	FileText,
	Calendar,
	DollarSign,
	Package,
	User,
	Mail,
	Phone,
	MapPin,
	Download,
	Send,
	Edit,
	Trash2,
	Check,
} from 'lucide-react';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { 
	PageHeader, 
	Button, 
	Breadcrumbs, 
	toast, 
	LoadingState, 
	EmptyState, 
	StatsCard,
	DetailPageSkeleton, 
} from '@/components/design-system';
import { AdminRoute } from '@/components/auth/AdminRoute';

interface LineItem {
	id: string;
	description: string;
	type: string;
	quantity: number;
	unitPrice: number;
	amount: number;
	shipment?: {
		id: string;
		vehicleType: string;
		vehicleMake: string | null;
		vehicleModel: string | null;
		vehicleYear: number | null;
		vehicleVIN: string | null;
		vehicleColor: string | null;
	};
}

interface Invoice {
	id: string;
	invoiceNumber: string;
	userId: string;
	containerId: string;
	status: string;
	issueDate: string;
	dueDate: string | null;
	paidDate: string | null;
	subtotal: number;
	tax: number;
	discount: number;
	total: number;
	paymentMethod: string | null;
	paymentReference: string | null;
	notes: string | null;
	internalNotes: string | null;
	user: {
		id: string;
		name: string | null;
		email: string;
		phone: string | null;
		address: string | null;
		city: string | null;
		country: string | null;
	};
	container: {
		id: string;
		containerNumber: string;
		trackingNumber: string | null;
		status: string;
		vesselName: string | null;
		loadingPort: string | null;
		destinationPort: string | null;
		estimatedArrival: string | null;
	};
	lineItems: LineItem[];
}

const statusConfig: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
	DRAFT: { label: 'Draft', color: 'default' },
	PENDING: { label: 'Pending', color: 'warning' },
	SENT: { label: 'Sent', color: 'info' },
	PAID: { label: 'Paid', color: 'success' },
	OVERDUE: { label: 'Overdue', color: 'error' },
	CANCELLED: { label: 'Cancelled', color: 'default' },
};

function normalizeShipmentRefInDescription(
	description: string,
	shipment?: { id: string; vehicleVIN: string | null }
): string {
	if (!shipment?.id || !shipment.vehicleVIN) return description;
	return description
		.replace(new RegExp(`\\(Shipment\\s+${shipment.id}\\)`, 'gi'), `(VIN ${shipment.vehicleVIN})`)
		.replace(new RegExp(`Shipment\\s+${shipment.id}`, 'gi'), `VIN ${shipment.vehicleVIN}`)
		.replace(new RegExp(`shipment\\s+${shipment.id}`, 'g'), `VIN ${shipment.vehicleVIN}`);
}

export default function InvoiceDetailPage() {
	const params = useParams();
	const router = useRouter();
	const { data: session } = useSession();
	const [invoice, setInvoice] = useState<Invoice | null>(null);
	const [loading, setLoading] = useState(true);
	const [updating, setUpdating] = useState(false);

	const isAdmin = session?.user?.role === 'admin';

	useEffect(() => {
		fetchInvoice();
	}, [params.id]);

	const fetchInvoice = async () => {
		try {
			setLoading(true);
			const response = await fetch(`/api/invoices/${params.id}`);
			const data = await response.json();

			if (response.ok) {
				setInvoice(data);
			} else {
				toast.error('Failed to load invoice');
			}
		} catch (error) {
			console.error('Error fetching invoice:', error);
			toast.error('An error occurred');
		} finally {
			setLoading(false);
		}
	};

	const handleStatusUpdate = async (newStatus: string) => {
		if (!invoice) return;

		try {
			setUpdating(true);
			const response = await fetch(`/api/invoices/${params.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus }),
			});

			if (response.ok) {
				toast.success('Status updated successfully');
				fetchInvoice();
			} else {
				const data = await response.json();
				toast.error(data.error || 'Failed to update status');
			}
		} catch (error) {
			console.error('Error updating status:', error);
			toast.error('An error occurred');
		} finally {
			setUpdating(false);
		}
	};

	const handleMarkAsPaid = async () => {
		if (!invoice) return;

		try {
			setUpdating(true);
			const response = await fetch(`/api/invoices/${params.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					status: 'PAID',
					paidDate: new Date().toISOString(),
				}),
			});

			if (response.ok) {
				toast.success('Invoice marked as paid');
				fetchInvoice();
			} else {
				const data = await response.json();
				toast.error(data.error || 'Failed to update invoice');
			}
		} catch (error) {
			console.error('Error marking as paid:', error);
			toast.error('An error occurred');
		} finally {
			setUpdating(false);
		}
	};

	const handleDownloadPDF = () => {
		if (!invoice) return;
		// Open the server-side PDF generation endpoint
		window.open(`/api/invoices/${params.id}/pdf`, '_blank');
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

	// Group line items by shipment
	const groupedLineItems = invoice?.lineItems.reduce((acc, item) => {
		const key = item.shipment?.id || 'other';
		if (!acc[key]) {
			acc[key] = {
				shipment: item.shipment,
				items: [],
			};
		}
		acc[key].items.push(item);
		return acc;
	}, {} as Record<string, { shipment?: LineItem['shipment']; items: LineItem[] }>);

	if (loading) {
		return (
			<AdminRoute>
				<DetailPageSkeleton />
			</AdminRoute>
		);
	}

	if (!invoice) {
		return (
			<AdminRoute>
				<EmptyState
					icon={<FileText className="w-16 h-16" />}
					title="Invoice Not Found"
					description="The invoice you're looking for doesn't exist or you don't have permission to view it"
				/>
			</AdminRoute>
		);
	}

	const statusInfo = statusConfig[invoice.status] || { label: invoice.status, color: 'default' };

	return (
		<AdminRoute>
			<Box sx={{ maxWidth: '1400px', mx: 'auto', p: { xs: 2, md: 3 } }}>
				{/* Breadcrumbs */}
				<Breadcrumbs
					items={[
						{ label: 'Dashboard', href: '/dashboard' },
						{ label: 'Containers', href: '/dashboard/containers' },
						{ label: invoice.container.containerNumber, href: `/dashboard/containers/${invoice.containerId}` },
						{ label: invoice.invoiceNumber, href: '#' },
					]}
				/>

				{/* Page Header */}
				<PageHeader
					title={invoice.invoiceNumber}
					description={`Invoice for ${invoice.user.name || invoice.user.email}`}
					actions={
						<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
							<Chip 
								label={statusInfo.label} 
								color={statusInfo.color}
								sx={{ fontWeight: 600 }}
							/>
							{isAdmin && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
								<Button
									variant="outline"
									size="sm"
									icon={<Check className="w-4 h-4" />}
									onClick={handleMarkAsPaid}
									disabled={updating}
								>
									Mark as Paid
								</Button>
							)}
							<Button
								variant="primary"
								size="sm"
								icon={<Download className="w-4 h-4" />}
								onClick={handleDownloadPDF}
								sx={{
									bgcolor: 'var(--accent-gold)',
									color: 'white',
									'&:hover': {
										bgcolor: 'var(--accent-gold)',
										opacity: 0.9,
									}
								}}
							>
								Download PDF
							</Button>
							<Button
								variant="outline"
								size="sm"
								icon={<ArrowLeft className="w-4 h-4" />}
								onClick={() => router.push(`/dashboard/containers/${invoice.containerId}`)}
							>
								Back to Container
							</Button>
						</Box>
					}
				/>

				{/* Main Content */}
				<DashboardSurface>
					<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
						{/* Invoice Information */}
						<DashboardPanel 
							title="Invoice Details"
							description="Basic invoice information"
						>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
								<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Invoice Number</Box>
									<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
										{invoice.invoiceNumber}
									</Box>
								</Box>
								<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Issue Date</Box>
									<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
										{formatDate(invoice.issueDate)}
									</Box>
								</Box>
								<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Due Date</Box>
									<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
										{formatDate(invoice.dueDate)}
									</Box>
								</Box>
								{invoice.paidDate && (
									<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Paid Date</Box>
										<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--success)' }}>
											{formatDate(invoice.paidDate)}
										</Box>
									</Box>
								)}
								<Divider sx={{ borderColor: 'var(--border)' }} />
								<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Status</Box>
									<Chip 
										label={statusInfo.label} 
										size="small"
										color={statusInfo.color}
										sx={{ fontSize: '0.75rem' }}
									/>
								</Box>
								{isAdmin && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
									<FormControl fullWidth size="small">
										<InputLabel>Update Status</InputLabel>
										<Select
											value={invoice.status}
											onChange={(e) => handleStatusUpdate(e.target.value)}
											disabled={updating}
										>
											<MenuItem value="DRAFT">Draft</MenuItem>
											<MenuItem value="PENDING">Pending</MenuItem>
											<MenuItem value="SENT">Sent</MenuItem>
											<MenuItem value="PAID">Paid</MenuItem>
											<MenuItem value="CANCELLED">Cancelled</MenuItem>
										</Select>
									</FormControl>
								)}
							</Box>
						</DashboardPanel>

						{/* Customer Information */}
						<DashboardPanel 
							title="Customer"
							description="Customer details"
						>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
								<Box>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)', mb: 0.5 }}>Name</Box>
									<Box sx={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
										{invoice.user.name || 'N/A'}
									</Box>
								</Box>
								<Box>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)', mb: 0.5 }}>Email</Box>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
										{invoice.user.email}
									</Box>
								</Box>
								{invoice.user.phone && (
									<Box>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)', mb: 0.5 }}>Phone</Box>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
											{invoice.user.phone}
										</Box>
									</Box>
								)}
								{invoice.user.address && (
									<Box>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)', mb: 0.5 }}>Address</Box>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
											{invoice.user.address}
											{invoice.user.city && `, ${invoice.user.city}`}
											{invoice.user.country && `, ${invoice.user.country}`}
										</Box>
									</Box>
								)}
								<Divider sx={{ borderColor: 'var(--border)' }} />
								<Button
									variant="outline"
									size="sm"
									icon={<User className="w-3 h-3" />}
									onClick={() => router.push(`/dashboard/customers?search=${invoice.user.email}`)}
								>
									View Customer
								</Button>
							</Box>
						</DashboardPanel>

						{/* Container Information */}
						<DashboardPanel 
							title="Container"
							description="Shipping container"
						>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
								<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Container #</Box>
									<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
										{invoice.container.containerNumber}
									</Box>
								</Box>
								{invoice.container.trackingNumber && (
									<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Tracking #</Box>
										<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
											{invoice.container.trackingNumber}
										</Box>
									</Box>
								)}
								{invoice.container.vesselName && (
									<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Vessel</Box>
										<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
											{invoice.container.vesselName}
										</Box>
									</Box>
								)}
								{invoice.container.loadingPort && (
									<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>From</Box>
										<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
											{invoice.container.loadingPort}
										</Box>
									</Box>
								)}
								{invoice.container.destinationPort && (
									<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>To</Box>
										<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
											{invoice.container.destinationPort}
										</Box>
									</Box>
								)}
								<Divider sx={{ borderColor: 'var(--border)' }} />
								<Button
									variant="outline"
									size="sm"
									icon={<Package className="w-3 h-3" />}
									onClick={() => router.push(`/dashboard/containers/${invoice.containerId}`)}
								>
									View Container
								</Button>
							</Box>
						</DashboardPanel>
					</Box>

					{/* Line Items */}
					<Box sx={{ mt: 3 }}>
						<DashboardPanel 
							title="Line Items"
							description="Detailed breakdown of charges"
						>
						<TableContainer>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
										<TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
										<TableCell sx={{ fontWeight: 600 }} align="right">Qty</TableCell>
										<TableCell sx={{ fontWeight: 600 }} align="right">Unit Price</TableCell>
										<TableCell sx={{ fontWeight: 600 }} align="right">Amount</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{Object.entries(groupedLineItems || {}).map(([key, group]) => (
										<>
											{group.shipment && (
												<TableRow key={`header-${key}`}>
													<TableCell colSpan={5} sx={{ 
														bgcolor: 'var(--background)', 
														fontWeight: 600,
														fontSize: '0.875rem',
														py: 1,
													}}>
														{group.shipment.vehicleYear} {group.shipment.vehicleMake} {group.shipment.vehicleModel}
														{group.shipment.vehicleVIN && ` (VIN: ${group.shipment.vehicleVIN})`}
													</TableCell>
												</TableRow>
											)}
											{group.items.map((item) => (
												<TableRow key={item.id} hover>
													<TableCell sx={{ pl: group.shipment ? 4 : 2 }}>
														{normalizeShipmentRefInDescription(item.description, group.shipment)}
													</TableCell>
													<TableCell>
														<Chip 
															label={item.type.replace('_', ' ')} 
															size="small"
															sx={{ fontSize: '0.7rem' }}
														/>
													</TableCell>
													<TableCell align="right">{item.quantity}</TableCell>
													<TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
													<TableCell align="right" sx={{ fontWeight: 600 }}>
														{formatCurrency(item.amount)}
													</TableCell>
												</TableRow>
											))}
										</>
									))}
									<TableRow>
										<TableCell colSpan={4} sx={{ fontWeight: 600, borderTop: '2px solid var(--border)' }}>
											Subtotal
										</TableCell>
										<TableCell align="right" sx={{ fontWeight: 600, borderTop: '2px solid var(--border)' }}>
											{formatCurrency(invoice.subtotal)}
										</TableCell>
									</TableRow>
									{invoice.discount > 0 && (
										<TableRow>
											<TableCell colSpan={4} sx={{ fontWeight: 600, color: 'var(--success)' }}>
												Discount
											</TableCell>
											<TableCell align="right" sx={{ fontWeight: 600, color: 'var(--success)' }}>
												-{formatCurrency(invoice.discount)}
											</TableCell>
										</TableRow>
									)}
									{invoice.tax > 0 && (
										<TableRow>
											<TableCell colSpan={4} sx={{ fontWeight: 600 }}>
												Tax
											</TableCell>
											<TableCell align="right" sx={{ fontWeight: 600 }}>
												{formatCurrency(invoice.tax)}
											</TableCell>
										</TableRow>
									)}
									<TableRow>
										<TableCell colSpan={4} sx={{ 
											fontWeight: 700, 
											fontSize: '1.1rem',
											borderTop: '2px solid var(--border)',
										}}>
											TOTAL
										</TableCell>
										<TableCell align="right" sx={{ 
											fontWeight: 700, 
											fontSize: '1.1rem',
											color: 'var(--accent-gold)',
											borderTop: '2px solid var(--border)',
										}}>
											{formatCurrency(invoice.total)}
										</TableCell>
									</TableRow>
								</TableBody>
							</Table>
						</TableContainer>
						</DashboardPanel>
					</Box>

					{/* Notes */}
					{(invoice.notes || invoice.internalNotes) && (
						<Box sx={{ mt: 3 }}>
							<DashboardPanel 
								title="Notes"
								description="Additional information"
							>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
								{invoice.notes && (
									<Box>
										<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', mb: 1 }}>
											Customer Notes
										</Box>
										<Box sx={{ 
											p: 2, 
											bgcolor: 'var(--background)', 
											borderRadius: 1,
											fontSize: '0.875rem',
											color: 'var(--text-primary)',
										}}>
											{invoice.notes}
										</Box>
									</Box>
								)}
								{isAdmin && invoice.internalNotes && (
									<Box>
										<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', mb: 1 }}>
											Internal Notes
										</Box>
										<Box sx={{ 
											p: 2, 
											bgcolor: 'rgba(var(--warning-rgb), 0.1)', 
											border: '1px solid rgba(var(--warning-rgb), 0.3)',
											borderRadius: 1,
											fontSize: '0.875rem',
											color: 'var(--text-primary)',
										}}>
											{invoice.internalNotes}
										</Box>
									</Box>
								)}
							</Box>
							</DashboardPanel>
						</Box>
					)}
				</DashboardSurface>
			</Box>
		</AdminRoute>
	);
}
