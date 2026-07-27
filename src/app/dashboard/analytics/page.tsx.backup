'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
	Activity,
	TrendingUp,
	AlertTriangle,
	Package,
	User as UserIcon,
	Layers,
	RefreshCcw,
} from 'lucide-react';
import {
	ResponsiveContainer,
	LineChart,
	Line,
	CartesianGrid,
	XAxis,
	YAxis,
	Tooltip,
	BarChart,
	Bar,
} from 'recharts';
import { Box, Button, Typography, Zoom, CircularProgress } from '@mui/material';

import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';

interface SummaryRow {
	totalShipments: number;
	activeShipments: number;
	adminUsers: number;
	totalRevenue: number;
	overdueInvoices: number;
	activeContainers: number;
}

interface StatusDatum {
	status: string;
	count: number;
}

interface MonthDatum {
	month: string;
	count?: number;
	totalUSD?: number;
}

interface InvoiceStatusDatum {
	status: string;
	count: number;
	totalUSD: number;
}

interface OutstandingInvoice {
	id: string;
	invoiceNumber: string;
	status: string;
	totalUSD: number;
	dueDate: string | null;
}

interface TopCustomer {
	userId: string;
	name: string;
	email: string;
	shipmentCount: number;
	revenue: number;
	lastShipmentAt: string | null;
}

interface AnalyticsPayload {
	summary: SummaryRow;
	shipmentsByStatus: StatusDatum[];
	shipmentsByMonth: Array<Required<Pick<MonthDatum, 'month' | 'count'>>>;
	revenueByMonth: Array<Required<Pick<MonthDatum, 'month' | 'totalUSD'>>>;
	invoiceStatusDistribution: InvoiceStatusDatum[];
	outstandingInvoices: OutstandingInvoice[];
	topCustomers: TopCustomer[];
	lastUpdated: string;
}

const formatCurrency = (value: number) =>
	new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
		Number.isFinite(value) ? value : 0,
	);

export default function AnalyticsPage() {
	const { data: session, status } = useSession();
	const router = useRouter();

	const [data, setData] = useState<AnalyticsPayload | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [refreshing, setRefreshing] = useState(false);
	const show = true;

	const isAdmin = session?.user?.role === 'admin';

	useEffect(() => {
		if (status === 'loading') return;
		if (!session || !isAdmin) {
			router.replace('/dashboard');
			return;
		}

		const fetchAnalytics = async () => {
			try {
				setLoading(true);
				const response = await fetch('/api/analytics');
				if (!response.ok) throw new Error('Failed to load analytics payload.');
				const payload: AnalyticsPayload = await response.json();
				setData(payload);
				setError(null);
			} catch (err: unknown) {
				console.error(err);
				setError(err instanceof Error ? err.message : 'Unexpected analytics error.');
			} finally {
				setLoading(false);
			}
		};

		fetchAnalytics();
	}, [session, status, isAdmin, router]);

	const handleRefresh = async () => {
		setRefreshing(true);
		try {
			const response = await fetch('/api/analytics', { cache: 'no-store' });
			if (!response.ok) throw new Error('Unable to refresh analytics.');
			const payload: AnalyticsPayload = await response.json();
			setData(payload);
			setError(null);
		} catch (err: unknown) {
			console.error(err);
			setError(err instanceof Error ? err.message : 'Unexpected analytics error.');
		} finally {
			setRefreshing(false);
		}
	};

	const summaryCards = useMemo(() => {
		if (!data) return [];
		const summary = data.summary;
		return [
			{
				label: 'Total Shipments',
				value: summary.totalShipments,
				icon: Package,
				description: 'All shipments recorded in Jacxi.',
				iconBg: 'rgba(var(--accent-gold-rgb), 0.12)',
				iconColor: 'var(--accent-gold)',
			},
			{
				label: 'Active Shipments',
				value: summary.activeShipments,
				icon: Activity,
				description: 'Currently moving through the network.',
				iconBg: 'rgba(var(--text-primary-rgb), 0.08)',
				iconColor: 'var(--text-primary)',
			},
			{
				label: 'Total Revenue',
				value: formatCurrency(summary.totalRevenue),
				icon: TrendingUp,
				description: 'Paid invoices converted to USD.',
				iconBg: 'rgba(var(--accent-gold-rgb), 0.15)',
				iconColor: 'var(--accent-gold)',
			},
			{
				label: 'Team Admins',
				value: summary.adminUsers,
				icon: UserIcon,
				description: 'Administrators with dashboard access.',
				iconBg: 'rgba(var(--text-secondary-rgb), 0.12)',
				iconColor: 'var(--text-secondary)',
			},
			{
				label: 'Overdue Invoices',
				value: summary.overdueInvoices,
				icon: AlertTriangle,
				description: 'Invoices past due date & unpaid.',
				iconBg: 'rgba(var(--error-rgb), 0.15)',
				iconColor: 'var(--error)',
			},
			{
				label: 'Active Containers',
				value: summary.activeContainers,
				icon: Layers,
				description: 'Containers currently assigned & active.',
				iconBg: 'rgba(var(--text-secondary-rgb), 0.1)',
				iconColor: 'var(--text-primary)',
			},
		];
	}, [data]);

	if (status === 'loading' || loading) {
		return (
			<Box
				className="light-surface"
				sx={{
					minHeight: '100vh',
					background: 'var(--background)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<CircularProgress size={60} sx={{ color: 'var(--accent-gold)' }} />
			</Box>
		);
	}

	if (!session || !isAdmin || !data) {
		return null;
	}

	const headerMeta = [
		{ label: 'Shipments', value: data.summary.totalShipments },
		{ label: 'Revenue', value: formatCurrency(data.summary.totalRevenue) },
		{ label: 'Admins', value: data.summary.adminUsers },
	];

	return (
		<DashboardSurface className="light-surface">
			<Box
				sx={{
					display: 'flex',
					flexDirection: { xs: 'column', md: 'row' },
					justifyContent: 'space-between',
					alignItems: { xs: 'flex-start', md: 'center' },
					gap: 2.5,
				}}
			>
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
					<Typography component="h1" sx={{ fontSize: '1.25rem', fontWeight: 600 }}>
						Analytics
					</Typography>
					<Typography sx={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
						Financial and operational intelligence updated in real time.
					</Typography>
				</Box>
				<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
					{headerMeta.map((item) => (
						<Box
							key={item.label}
							sx={{
								minWidth: 110,
								border: '1px solid var(--border)',
								borderRadius: 2,
								padding: '6px 12px',
								backgroundColor: 'var(--panel)',
								boxShadow: '0 8px 20px rgba(var(--text-primary-rgb), 0.04)',
							}}
						>
							<Typography sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-secondary)' }}>
								{item.label}
							</Typography>
							<Typography sx={{ fontSize: '1rem', fontWeight: 600 }}>{item.value}</Typography>
						</Box>
					))}
					<Button
						variant="outlined"
						size="small"
						startIcon={<RefreshCcw size={14} />}
						onClick={handleRefresh}
						disabled={refreshing}
						sx={{ textTransform: 'none', fontSize: '0.75rem' }}
					>
						Refresh
					</Button>
				</Box>
			</Box>

			{error && (
				<Box
					sx={{
						borderRadius: 2,
						border: '1px solid rgba(var(--error-rgb), 0.3)',
						background: 'rgba(var(--error-rgb), 0.08)',
						px: 2.5,
						py: 1.5,
						color: 'var(--error)',
					}}
				>
					{error}
				</Box>
			)}

			<DashboardGrid className="grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
				{summaryCards.map((card, index) => {
					const Icon = card.icon;
					return (
						<Zoom key={card.label} in={show} timeout={600} style={{ transitionDelay: `${(index + 2) * 80}ms` }}>
							<Box
								sx={{
									borderRadius: 3,
									border: '1px solid rgba(var(--text-primary-rgb), 0.08)',
									background: 'linear-gradient(180deg, rgba(var(--panel-rgb), 1), rgba(var(--panel-rgb), 0.85))',
									boxShadow: '0 22px 45px rgba(var(--text-primary-rgb), 0.12)',
									minHeight: 150,
									display: 'flex',
									flexDirection: 'column',
									gap: 1.5,
									padding: 2,
								}}
							>
								<Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
									<Box>
										<Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.12em' }}>
											{card.label}
										</Typography>
										<Typography sx={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>{card.value}</Typography>
									</Box>
									<Box
										sx={{
											width: 40,
											height: 40,
											borderRadius: 2,
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											backgroundColor: card.iconBg,
											color: card.iconColor,
										}}
									>
										<Icon style={{ width: 20, height: 20 }} />
									</Box>
								</Box>
								<Typography sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{card.description}</Typography>
							</Box>
						</Zoom>
					);
				})}
			</DashboardGrid>

			<DashboardGrid className="lg:grid-cols-2">
				<DashboardPanel title="Shipment volume" description="Six month rolling window" fullHeight>
					<Box sx={{ height: 300 }}>
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={data.shipmentsByMonth}>
								<CartesianGrid strokeDasharray="3 3" stroke="var(--text-primary)" />
								<XAxis dataKey="month" stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
								<YAxis allowDecimals={false} stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
								<Tooltip contentStyle={{ backgroundColor: 'var(--text-primary)', border: '1px solid var(--text-primary)', borderRadius: 8 }} />
								<Line type="monotone" dataKey="count" stroke="var(--accent-gold)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
							</LineChart>
						</ResponsiveContainer>
					</Box>
				</DashboardPanel>

				<DashboardPanel title="Revenue (USD)" description="Paid invoices (six months)" fullHeight>
					<Box sx={{ height: 300 }}>
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={data.revenueByMonth}>
								<CartesianGrid strokeDasharray="3 3" stroke="var(--text-primary)" />
								<XAxis dataKey="month" stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
								<YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
								<Tooltip
									contentStyle={{ backgroundColor: 'var(--text-primary)', border: '1px solid var(--text-primary)', borderRadius: 8 }}
									formatter={(value: number) => formatCurrency(value)}
								/>
								<Bar dataKey="totalUSD" fill="var(--accent-gold)" radius={[6, 6, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</Box>
				</DashboardPanel>
			</DashboardGrid>
		</DashboardSurface>
	);
}
