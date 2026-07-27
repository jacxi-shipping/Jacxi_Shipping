'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Receipt, CheckCircle, Clock, AlertCircle, Search as SearchIcon, Plus } from 'lucide-react';
import { Box, Typography } from '@mui/material';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { PageHeader, StatsCard, ActionButton, EmptyState, LoadingState, FormField } from '@/components/design-system';

interface Invoice {
	id: string;
	invoiceNumber: string;
	status: string;
	totalUSD: number;
	totalAED: number;
	dueDate: string | null;
	paidDate: string | null;
	overdue: boolean;
	createdAt: string;
	container: {
		containerNumber: string;
	};
}

export default function InvoicesPage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const [invoices, setInvoices] = useState<Invoice[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');

	const fetchInvoices = useCallback(async () => {
		try {
			setLoading(true);
			const response = await fetch('/api/invoices');
			if (!response.ok) {
				setInvoices([]);
				return;
			}
			const data = (await response.json()) as { invoices?: Invoice[] };
			setInvoices(data.invoices ?? []);
		} catch (error) {
			console.error('Error fetching invoices:', error);
			setInvoices([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (status === 'loading') return;
		const role = session?.user?.role;
		if (!session || role !== 'admin') {
			router.replace('/dashboard');
			return;
		}
		void fetchInvoices();
	}, [fetchInvoices, router, session, status]);

	const filteredInvoices = useMemo(
		() =>
			invoices.filter((invoice) => {
				const term = searchTerm.trim().toLowerCase();
				const matchesSearch =
					invoice.invoiceNumber.toLowerCase().includes(term) ||
					invoice.container.containerNumber.toLowerCase().includes(term);
				const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
				return matchesSearch && matchesStatus;
			}),
		[invoices, searchTerm, statusFilter]
	);

	const stats = useMemo(
		() => ({
			total: invoices.length,
			paid: invoices.filter((i) => i.status === 'PAID').length,
			overdue: invoices.filter((i) => i.overdue || i.status === 'OVERDUE').length,
			pending: invoices.filter((i) => i.status === 'SENT' || i.status === 'DRAFT').length,
		}),
		[invoices]
	);

	const getStatusColor = (status: string, overdue: boolean) => {
		if (status === 'PAID') return { bg: 'rgba(34, 197, 94, 0.15)', text: 'rgb(34, 197, 94)', border: 'rgba(34, 197, 94, 0.3)' };
		if (overdue || status === 'OVERDUE') return { bg: 'rgba(239, 68, 68, 0.15)', text: 'rgb(239, 68, 68)', border: 'rgba(239, 68, 68, 0.3)' };
		if (status === 'SENT') return { bg: 'rgba(14, 165, 233, 0.15)', text: 'rgb(14, 165, 233)', border: 'rgba(14, 165, 233, 0.3)' };
		return { bg: 'rgba(156, 163, 175, 0.15)', text: 'rgb(156, 163, 175)', border: 'rgba(156, 163, 175, 0.3)' };
	};

	const getStatusIcon = (status: string, overdue: boolean) => {
		if (status === 'PAID') return <CheckCircle style={{ fontSize: 16 }} />;
		if (overdue || status === 'OVERDUE') return <AlertCircle style={{ fontSize: 16 }} />;
		return <Clock style={{ fontSize: 16 }} />;
	};

	if (status === 'loading' || loading) {
		return <LoadingState fullScreen message="Loading invoices..." />;
	}

	const role = session?.user?.role;
	if (!session || role !== 'admin') {
		return null;
	}

	return (
		<DashboardSurface>
			<PageHeader
				title="Invoices"
				description="Manage and track all invoices"
				actions={
					<Link href="/dashboard/invoices/new" style={{ textDecoration: 'none' }}>
						<ActionButton variant="primary" icon={<Plus className="w-4 h-4" />}>
							New Invoice
						</ActionButton>
					</Link>
				}
			/>

			{/* Stats */}
			<DashboardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
				<StatsCard
					icon={<Receipt style={{ fontSize: 18 }} />}
					title="Total Invoices"
					value={stats.total}
					subtitle="All invoices"
				/>
				<StatsCard
					icon={<CheckCircle style={{ fontSize: 18 }} />}
					title="Paid"
					value={stats.paid}
					subtitle="Completed payments"
					iconColor="rgb(34, 197, 94)"
					iconBg="rgba(34, 197, 94, 0.15)"
					delay={0.1}
				/>
				<StatsCard
					icon={<AlertCircle style={{ fontSize: 18 }} />}
					title="Overdue"
					value={stats.overdue}
					subtitle="Requires attention"
					iconColor="rgb(239, 68, 68)"
					iconBg="rgba(239, 68, 68, 0.15)"
					delay={0.2}
				/>
				<StatsCard
					icon={<Clock style={{ fontSize: 18 }} />}
					title="Pending"
					value={stats.pending}
					subtitle="Awaiting payment"
					iconColor="rgb(14, 165, 233)"
					iconBg="rgba(14, 165, 233, 0.15)"
					delay={0.3}
				/>
			</DashboardGrid>

			{/* Filters */}
			<DashboardPanel title="Search & Filter" description="Find invoices quickly">
				<Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
					<Box sx={{ flex: 1 }}>
						<FormField
							label=""
							placeholder="Search by invoice number or container..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							leftIcon={<SearchIcon style={{ fontSize: 20, color: 'var(--text-secondary)' }} />}
						/>
					</Box>
					<Box sx={{ minWidth: { xs: '100%', md: 200 } }}>
						<Typography
							component="label"
							sx={{
								display: 'block',
								fontSize: '0.875rem',
								fontWeight: 500,
								color: 'var(--text-primary)',
								mb: 1,
							}}
						>
							Status Filter
						</Typography>
						<select
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
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
							<option value="all">All Status</option>
							<option value="DRAFT">Draft</option>
							<option value="SENT">Sent</option>
							<option value="PAID">Paid</option>
							<option value="OVERDUE">Overdue</option>
						</select>
					</Box>
				</Box>
			</DashboardPanel>

			{/* Invoices List */}
			<DashboardPanel title={`All Invoices (${filteredInvoices.length})`} description="Click to view details" fullHeight>
				{filteredInvoices.length === 0 ? (
					<EmptyState
						icon={<Receipt />}
						title="No invoices found"
						description={searchTerm || statusFilter !== 'all' ? "Try adjusting your filters" : "Create your first invoice to get started"}
						action={
							!searchTerm && statusFilter === 'all' && (
								<Link href="/dashboard/invoices/new" style={{ textDecoration: 'none' }}>
									<ActionButton variant="primary">Create Invoice</ActionButton>
								</Link>
							)
						}
					/>
				) : (
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
						{filteredInvoices.map((invoice, index) => {
							const statusStyle = getStatusColor(invoice.status, invoice.overdue);
							return (
								<Link key={invoice.id} href={`/dashboard/invoices/${invoice.id}`} style={{ textDecoration: 'none' }}>
									<Box
										sx={{
											borderRadius: 2,
											border: '1px solid var(--border)',
											background: 'var(--panel)',
											boxShadow: '0 8px 20px rgba(var(--text-primary-rgb), 0.06)',
											p: 2,
											cursor: 'pointer',
											transition: 'all 0.2s ease',
											'&:hover': {
												transform: 'translateY(-2px)',
												boxShadow: '0 16px 32px rgba(var(--text-primary-rgb), 0.1)',
												borderColor: 'var(--accent-gold)',
											},
										}}
									>
										<Box
											sx={{
												display: 'flex',
												flexDirection: { xs: 'column', sm: 'row' },
												justifyContent: 'space-between',
												alignItems: { xs: 'flex-start', sm: 'center' },
												gap: 2,
											}}
										>
											<Box sx={{ flex: 1, minWidth: 0 }}>
												<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
													<Typography sx={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
														{invoice.invoiceNumber}
													</Typography>
													<Box
														sx={{
															px: 1.5,
															py: 0.5,
															borderRadius: 1,
															fontSize: '0.7rem',
															fontWeight: 600,
															display: 'flex',
															alignItems: 'center',
															gap: 0.5,
															...statusStyle,
															border: `1px solid ${statusStyle.border}`,
															bgcolor: statusStyle.bg,
															color: statusStyle.text,
														}}
													>
														{getStatusIcon(invoice.status, invoice.overdue)}
														{invoice.status} {invoice.overdue && '(Overdue)'}
													</Box>
												</Box>
												<Typography sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)', mb: 0.5 }}>
													Container: {invoice.container.containerNumber}
												</Typography>
												{invoice.dueDate && (
													<Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
														Due: {new Date(invoice.dueDate).toLocaleDateString()}
													</Typography>
												)}
											</Box>
											<Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
												<Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
													${invoice.totalUSD.toFixed(2)}
												</Typography>
												<Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
													{invoice.totalAED.toFixed(2)} AED
												</Typography>
											</Box>
										</Box>
									</Box>
								</Link>
							);
						})}
					</Box>
				)}
			</DashboardPanel>
		</DashboardSurface>
	);
}
