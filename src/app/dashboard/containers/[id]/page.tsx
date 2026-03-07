'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
	Box, 
	Tabs, 
	Tab, 
	Table, 
	TableBody, 
	TableCell, 
	TableContainer, 
	TableHead, 
	TableRow,
	LinearProgress,
	Divider,
	Chip,
	Typography,
	TextField,
	MenuItem,
} from '@mui/material';
import {
	ArrowLeft,
	Package,
	Ship,
	Calendar,
	DollarSign,
	FileText,
	MapPin,
	TrendingUp,
	Download,
	Eye,
	Plus,
	Trash2,
	AlertTriangle,
	Copy,
	Printer,
	FileDown,
    Activity,
    QrCode,
    RefreshCw
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { 
	PageHeader, 
	Button, 
	Breadcrumbs, 
	toast, 
	LoadingState, 
	EmptyState, 
	StatsCard,
	DashboardPageSkeleton, 
	DetailPageSkeleton, 
	FormPageSkeleton
} from '@/components/design-system';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AddExpenseModal from '@/components/containers/AddExpenseModal';
import AddDamageModal from '@/components/containers/AddDamageModal';
import AddInvoiceModal from '@/components/containers/AddInvoiceModal';
import AddTrackingEventModal from '@/components/containers/AddTrackingEventModal';
import AddShipmentExpenseModal from '@/components/shipments/AddShipmentExpenseModal';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { DocumentManager } from '@/components/dashboard/DocumentManager';
import { ActivityLog } from '@/components/dashboard/ActivityLog';
import { TrackingMap } from '@/components/dashboard/TrackingMap';
import { hasAnyPermission, hasPermission } from '@/lib/rbac';

interface Shipment {
	id: string;
	vehicleMake: string | null;
	vehicleModel: string | null;
	vehicleVIN: string | null;
	status: string;
	user?: {
		id: string;
		name: string | null;
		email: string;
	};
}

interface Expense {
	id: string;
	type: string;
	amount: number;
	currency: string;
	date: string;
	vendor: string | null;
	source?: 'CONTAINER' | 'SHIPMENT';
	shipmentId?: string | null;
	description?: string;
}

interface Damage {
	id: string;
	shipmentId: string;
	damageType: 'WE_PAY' | 'COMPANY_PAYS';
	amount: number;
	description: string;
	createdAt: string;
	shipment?: {
		id: string;
		vehicleMake: string | null;
		vehicleModel: string | null;
		vehicleVIN: string | null;
		user?: { id: string; name: string | null; email: string };
	};
}

interface Invoice {
	id: string;
	invoiceNumber: string;
	amount: number;
	currency: string;
	status: string;
	date: string;
}

interface Document {
	id: string;
	name: string;
	type: string;
	fileUrl: string;
	fileType: string;
	uploadedAt: string;
    category: string;
    fileSize: number;
    uploadedBy: string;
}

interface TrackingEvent {
	id: string;
	status: string;
	location: string | null;
	description: string | null;
	eventDate: string;
    latitude?: number | null;
    longitude?: number | null;
}

interface UserInvoice {
	id: string;
	invoiceNumber: string;
	userId: string;
	status: string;
	issueDate: string;
	dueDate: string | null;
	total: number;
	user: {
		name: string | null;
		email: string;
	};
	_count: {
		lineItems: number;
	};
}

interface AuditLogEntry {
    id: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE';
    description: string;
    performedBy: string;
    timestamp: string;
    metadata?: any;
}

interface Container {
	id: string;
	containerNumber: string;
	companyId: string | null;
	company?: {
		id: string;
		name: string;
		code?: string | null;
	} | null;
	trackingNumber: string | null;
	vesselName: string | null;
	voyageNumber: string | null;
	shippingLine: string | null;
	bookingNumber: string | null;
	loadingPort: string | null;
	destinationPort: string | null;
	transshipmentPorts: string[];
	loadingDate: string | null;
	departureDate: string | null;
	estimatedArrival: string | null;
	actualArrival: string | null;
	status: string;
	currentLocation: string | null;
	progress: number;
	maxCapacity: number;
	currentCount: number;
	notes: string | null;
	autoTrackingEnabled: boolean;
	expenseAllocationMethod: string | null;
	createdAt: string;
	shipments: Shipment[];
	expenses: Expense[];
	damages: Damage[];
	invoices: Invoice[];
	userInvoices?: UserInvoice[];
	documents: Document[];
	trackingEvents: TrackingEvent[];
    auditLogs: AuditLogEntry[];
	totals: {
		expenses: number;
		invoices: number;
	};
}

interface CompanyOption {
	id: string;
	name: string;
	code?: string | null;
}

const statusConfig: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
	CREATED: { label: 'Created', color: 'default' },
	WAITING_FOR_LOADING: { label: 'Waiting for Loading', color: 'warning' },
	LOADED: { label: 'Loaded', color: 'info' },
	IN_TRANSIT: { label: 'In Transit', color: 'info' },
	ARRIVED_PORT: { label: 'Arrived at Port', color: 'success' },
	CUSTOMS_CLEARANCE: { label: 'Customs Clearance', color: 'warning' },
	RELEASED: { label: 'Released', color: 'success' },
	CLOSED: { label: 'Closed', color: 'default' },
};

export default function ContainerDetailPage() {
	const params = useParams();
	const router = useRouter();
    const { data: session } = useSession();
	const userRole = session?.user?.role;
	const isAdmin = userRole === 'admin';
	const canManageExpenses = hasAnyPermission(userRole, ['finance:manage', 'containers:manage']);
	const canViewExpenses = hasAnyPermission(userRole, ['finance:view', 'finance:manage', 'containers:read_all', 'containers:manage']);
	const canManageInvoices = hasAnyPermission(userRole, ['invoices:manage', 'finance:manage']);
	const canViewInvoices = hasAnyPermission(userRole, ['invoices:view', 'invoices:manage', 'finance:view', 'finance:manage']);
	const [container, setContainer] = useState<Container | null>(null);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState('overview');
	const [updating, setUpdating] = useState(false);
	const [expenseModalOpen, setExpenseModalOpen] = useState(false);
	const [expenseView, setExpenseView] = useState<'CONTAINER' | 'SHIPMENT'>('CONTAINER');
	const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
	const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
	const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);
	const [trackingModalOpen, setTrackingModalOpen] = useState(false);
	const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
	const [duplicating, setDuplicating] = useState(false);
	const [newContainerNumber, setNewContainerNumber] = useState('');
	const [generatingInvoices, setGeneratingInvoices] = useState(false);
    const [refreshingTracking, setRefreshingTracking] = useState(false);
	const [invoiceGenerationModalOpen, setInvoiceGenerationModalOpen] = useState(false);
    const [qrModalOpen, setQrModalOpen] = useState(false);
	const [shipmentExpenseModalOpen, setShipmentExpenseModalOpen] = useState(false);
	const [selectedShipmentForExpense, setSelectedShipmentForExpense] = useState<string | undefined>(undefined);
	const [damageModalOpen, setDamageModalOpen] = useState(false);
	const [deletingDamageId, setDeletingDamageId] = useState<string | null>(null);
	const [companies, setCompanies] = useState<CompanyOption[]>([]);
	const [selectedCompanyId, setSelectedCompanyId] = useState('');

	useEffect(() => {
		if (params.id) {
			fetchContainer();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [params.id]);

	useEffect(() => {
		const fetchCompanies = async () => {
			if (!isAdmin) return;
			try {
				const response = await fetch('/api/finance/companies?active=true&companyType=SHIPPING');
				const data = await response.json();
				if (response.ok) {
					setCompanies(data.companies || []);
				}
			} catch (error) {
				console.error('Failed to load companies:', error);
			}
		};

		void fetchCompanies();
	}, [isAdmin]);

	const fetchContainer = async () => {
		try {
			setLoading(true);
			const response = await fetch(`/api/containers/${params.id}`, { cache: 'no-store' });
			const data = await response.json();

			if (response.ok) {
				const containerData = data.container;
				// Ensure trackingEvents is an array
				if (!containerData.trackingEvents) {
					containerData.trackingEvents = [];
				}
                if (!containerData.auditLogs) {
                    containerData.auditLogs = [];
                }
				if (!containerData.damages) {
					containerData.damages = [];
				}
				// Ensure progress is a number
				if (typeof containerData.progress !== 'number') {
					containerData.progress = 0;
				}
				setSelectedCompanyId(containerData.companyId || '');
				setContainer(containerData);
			} else {
				toast.error('Container not found');
				router.push('/dashboard/containers');
			}
		} catch (error) {
			console.error('Error fetching container:', error);
			toast.error('Failed to load container');
		} finally {
			setLoading(false);
		}
	};

	const refreshContainerPage = async () => {
		await fetchContainer();
		router.refresh();
	};

    const handleRefreshTracking = async () => {
        if (!container) return;
        
        setRefreshingTracking(true);
        try {
            const response = await fetch('/api/cron/sync-tracking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ containerId: container.id }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                const newEvents = data.stats?.newEvents || 0;
                if (newEvents > 0) {
                    toast.success(`Tracking updated: ${newEvents} new event(s)`);
                    fetchContainer();
                } else {
                    toast.info('Tracking up to date');
                }
            } else {
                toast.error('Failed to refresh tracking');
            }
        } catch (error) {
            console.error('Error refreshing tracking:', error);
            toast.error('An error occurred');
        } finally {
            setRefreshingTracking(false);
        }
    };

	const handleStatusUpdate = async (newStatus: string) => {
		if (!container) return;
		
		try {
			setUpdating(true);
			const response = await fetch(`/api/containers/${params.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus }),
			});

			if (response.ok) {
				toast.success('Status updated successfully');
				fetchContainer();
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

	const handleCompanyUpdate = async () => {
		if (!container || !selectedCompanyId) {
			toast.error('Please select a company');
			return;
		}

		try {
			setUpdating(true);
			const response = await fetch(`/api/containers/${params.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ companyId: selectedCompanyId }),
			});

			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.error || 'Failed to update company');
			}

			toast.success('Container company updated successfully');
			await fetchContainer();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update company');
		} finally {
			setUpdating(false);
		}
	};

	const handleDeleteExpense = async (expenseId: string) => {
		const isShipmentExpense = expenseId.startsWith('shipment-');
		if (!confirm('Are you sure you want to delete this expense? Linked company and user ledger transactions will also be removed.')) return;

		setDeletingExpenseId(expenseId);
		try {
			const query = isShipmentExpense
				? `shipmentExpenseEntryId=${expenseId.replace('shipment-', '')}`
				: `expenseId=${expenseId}`;

			const response = await fetch(`/api/containers/${params.id}/expenses?${query}`, {
				method: 'DELETE',
			});

			if (response.ok) {
				toast.success('Expense deleted successfully');
				fetchContainer();
			} else {
				const data = await response.json();
				toast.error(data.error || 'Failed to delete expense');
			}
		} catch (error) {
			console.error('Error deleting expense:', error);
			toast.error('An error occurred');
		} finally {
			setDeletingExpenseId(null);
		}
	};

	const handleDeleteDamage = async (damageId: string) => {
		if (!confirm('Are you sure you want to delete this damage record? Associated ledger entries will also be removed.')) return;

		setDeletingDamageId(damageId);
		try {
			const response = await fetch(`/api/containers/${params.id}/damages?damageId=${damageId}`, {
				method: 'DELETE',
			});

			if (response.ok) {
				toast.success('Damage record deleted successfully');
				fetchContainer();
			} else {
				const data = await response.json();
				toast.error(data.error || 'Failed to delete damage record');
			}
		} catch (error) {
			console.error('Error deleting damage record:', error);
			toast.error('An error occurred');
		} finally {
			setDeletingDamageId(null);
		}
	};

	const handleDeleteInvoice = async (invoiceId: string) => {
		if (!confirm('Are you sure you want to delete this invoice?')) return;

		setDeletingInvoiceId(invoiceId);
		try {
			const response = await fetch(`/api/containers/${params.id}/invoices?invoiceId=${invoiceId}`, {
				method: 'DELETE',
			});

			if (response.ok) {
				toast.success('Invoice deleted successfully');
				fetchContainer();
			} else {
				const data = await response.json();
				toast.error(data.error || 'Failed to delete invoice');
			}
		} catch (error) {
			console.error('Error deleting invoice:', error);
			toast.error('An error occurred');
		} finally {
			setDeletingInvoiceId(null);
		}
	};

	const handleDeleteTrackingEvent = async (eventId: string) => {
		if (!confirm('Are you sure you want to delete this tracking event?')) return;

		setDeletingEventId(eventId);
		try {
			const response = await fetch(`/api/containers/${params.id}/tracking?eventId=${eventId}`, {
				method: 'DELETE',
			});

			if (response.ok) {
				toast.success('Tracking event deleted successfully');
				fetchContainer();
			} else {
				const data = await response.json();
				toast.error(data.error || 'Failed to delete tracking event');
			}
		} catch (error) {
			console.error('Error deleting tracking event:', error);
			toast.error('An error occurred');
		} finally {
			setDeletingEventId(null);
		}
	};

	const handleDeleteContainer = async () => {
		if (!container) return;

		setDeleting(true);
		try {
			const response = await fetch(`/api/containers/${params.id}`, {
				method: 'DELETE',
			});

			const data = await response.json();

			if (response.ok) {
				toast.success('Container deleted successfully', {
					description: 'Redirecting to containers list...'
				});
				setTimeout(() => {
					router.push('/dashboard/containers');
				}, 1000);
			} else {
				toast.error('Failed to delete container', {
					description: data.error || 'Please try again'
				});
			}
		} catch (error) {
			console.error('Error deleting container:', error);
			toast.error('An error occurred', {
				description: 'Please try again later'
			});
		} finally {
			setDeleting(false);
			setDeleteModalOpen(false);
		}
	};

	const handleDuplicateContainer = async () => {
		if (!container || !newContainerNumber.trim()) {
			toast.error('Please enter a container number');
			return;
		}

		if (!container.companyId) {
			toast.error('Assign a company before duplicating this container');
			return;
		}

		setDuplicating(true);
		try {
			// Create new container with same details but new number
			const payload = {
				containerNumber: newContainerNumber.trim(),
				companyId: container.companyId,
				trackingNumber: container.trackingNumber,
				vesselName: container.vesselName,
				voyageNumber: container.voyageNumber,
				shippingLine: container.shippingLine,
				bookingNumber: '', // Don't copy booking number
				loadingPort: container.loadingPort,
				destinationPort: container.destinationPort,
				transshipmentPorts: container.transshipmentPorts,
				loadingDate: container.loadingDate,
				departureDate: container.departureDate,
				estimatedArrival: container.estimatedArrival,
				maxCapacity: container.maxCapacity,
				notes: container.notes,
				autoTrackingEnabled: container.autoTrackingEnabled,
			};

			const response = await fetch('/api/containers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			const data = await response.json();

			if (response.ok) {
				toast.success('Container duplicated successfully!', {
					description: 'Redirecting to new container...'
				});
				setTimeout(() => {
					router.push(`/dashboard/containers/${data.container.id}`);
				}, 1000);
			} else {
				toast.error('Failed to duplicate container', {
					description: data.error || 'Please try again'
				});
			}
		} catch (error) {
			console.error('Error duplicating container:', error);
			toast.error('An error occurred', {
				description: 'Please try again later'
			});
		} finally {
			setDuplicating(false);
			setDuplicateModalOpen(false);
		}
	};

	const handlePrint = () => {
		window.print();
	};

	const handleDownloadPDF = async () => {
		if (!container) return;

		try {
			toast.success('Generating PDF...', {
				description: 'Please wait a moment'
			});

			// Dynamically import the PDF generator to avoid SSR issues
			const { downloadContainerPDF } = await import('@/lib/utils/generateContainerPDF');
			
			// Generate and download the PDF
			downloadContainerPDF(container as any);

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

	const handleGenerateInvoices = async () => {
		if (!container) return;

		setGeneratingInvoices(true);
		try {
			const response = await fetch('/api/invoices/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					containerId: container.id,
					sendEmail: false,
				}),
			});

			const data = await response.json();

			if (response.ok) {
				toast.success('Invoices generated successfully!', {
					description: `Created ${data.summary.newInvoices} new invoice(s)`
				});
				await refreshContainerPage();
				setInvoiceGenerationModalOpen(false);
			} else {
				toast.error('Failed to generate invoices', {
					description: data.error || 'Please try again'
				});
			}
		} catch (error) {
			console.error('Error generating invoices:', error);
			toast.error('An error occurred', {
				description: 'Please try again later'
			});
		} finally {
			setGeneratingInvoices(false);
		}
	};

	const formatCurrency = (amount: number, currency: string = 'USD') => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency,
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

	if (loading) {
		return (
			<ProtectedRoute>
				<DetailPageSkeleton />
			</ProtectedRoute>
		);
	}

	if (!container) {
		return (
			<ProtectedRoute>
				<DashboardSurface>
					<EmptyState
						icon={<Package className="w-12 h-12" />}
						title="Container Not Found"
						description="The container you're looking for doesn't exist"
						action={
							<Button 
								variant="primary" 
								onClick={() => router.push('/dashboard/containers')}
							>
								Back to Containers
							</Button>
						}
					/>
				</DashboardSurface>
			</ProtectedRoute>
		);
	}

	const capacityPercentage = (container.currentCount / container.maxCapacity) * 100;
	const netProfit = container.totals.expenses > 0 ? container.totals.invoices - container.totals.expenses : 0;
	const isShipmentExpense = (expense: Expense) => {
		const source = expense.source?.toUpperCase();
		return source === 'SHIPMENT' || expense.id.startsWith('shipment-') || Boolean(expense.shipmentId);
	};
	const containerOnlyExpenses = container.expenses.filter((expense) => !isShipmentExpense(expense));
	const shipmentOnlyExpenses = container.expenses.filter(isShipmentExpense);
	const displayedExpenses = expenseView === 'CONTAINER' ? containerOnlyExpenses : shipmentOnlyExpenses;
	const displayedExpenseTotal = displayedExpenses.reduce((sum, expense) => sum + expense.amount, 0);

	return (
		<ProtectedRoute>
			<DashboardSurface>
				{/* Breadcrumbs */}
				<Box sx={{ px: 2, pt: 2 }}>
					<Breadcrumbs />
				</Box>

				{/* Page Header */}
				<PageHeader
					title={container.containerNumber}
					description={container.trackingNumber ? `Tracking: ${container.trackingNumber}` : 'Container details and management'}
					actions={
						<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
							<Chip 
								label={statusConfig[container.status]?.label || container.status}
								color={statusConfig[container.status]?.color || 'default'}
								sx={{ fontWeight: 600 }}
								className="no-print"
							/>
                            {isAdmin && (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    icon={<QrCode className="w-4 h-4" />}
                                    onClick={() => setQrModalOpen(true)}
                                    className="no-print"
                                >
                                    QR Code
                                </Button>
                            )}
                            {isAdmin && (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    icon={<Copy className="w-4 h-4" />}
                                    onClick={() => {
                                        setNewContainerNumber('');
                                        setDuplicateModalOpen(true);
                                    }}
                                    className="no-print"
                                >
                                    Duplicate
                                </Button>
                            )}
							<Button 
								variant="primary" 
								size="sm" 
								icon={<FileDown className="w-4 h-4" />}
								onClick={handleDownloadPDF}
								className="no-print"
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
								icon={<Printer className="w-4 h-4" />}
								onClick={handlePrint}
								className="no-print"
							>
								Print
							</Button>
                            {isAdmin && (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    icon={<Trash2 className="w-4 h-4" />}
                                    onClick={() => setDeleteModalOpen(true)}
                                    sx={{
                                        borderColor: 'var(--error)',
                                        color: 'var(--error)',
                                        '&:hover': {
                                            bgcolor: 'rgba(var(--error-rgb), 0.1)',
                                            borderColor: 'var(--error)',
                                        }
                                    }}
                                    className="no-print"
                                >
                                    Delete
                                </Button>
                            )}
							<Link href="/dashboard/containers" style={{ textDecoration: 'none' }}>
								<Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />} className="no-print">
									Back
								</Button>
							</Link>
						</Box>
					}
				/>

				{/* Stats Overview */}
				<Box sx={{ px: 2, mb: 3 }}>
					<DashboardGrid className="grid-cols-1 md:grid-cols-4">
						<StatsCard
							icon={<Package style={{ fontSize: 18 }} />}
							title="Capacity"
							value={`${container.currentCount}/${container.maxCapacity}`}
							variant="info"
							size="md"
						/>
                        {isAdmin && (
                            <StatsCard
                                icon={<DollarSign style={{ fontSize: 18 }} />}
                                title="Net Profit"
                                value={formatCurrency(netProfit)}
                                variant={netProfit >= 0 ? 'success' : 'error'}
                                size="md"
                            />
                        )}
						<StatsCard
							icon={<TrendingUp style={{ fontSize: 18 }} />}
							title="Progress"
							value={`${container.progress}%`}
							variant="default"
							size="md"
						/>
						<StatsCard
							icon={<Ship style={{ fontSize: 18 }} />}
							title="Status"
							value={statusConfig[container.status]?.label || container.status}
							variant={statusConfig[container.status]?.color || 'default'}
							size="md"
						/>
					</DashboardGrid>
				</Box>

				{/* Progress Bar */}
				{container.progress > 0 && (
					<Box sx={{ px: 2, mb: 3 }}>
						<DashboardPanel noHeaderBorder>
							<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
								<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
									Shipping Progress
								</Box>
								<Box sx={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
									{container.progress}%
								</Box>
							</Box>
							<LinearProgress 
								variant="determinate" 
								value={container.progress} 
								sx={{
									height: 8,
									borderRadius: 1,
									bgcolor: 'rgba(201, 155, 47, 0.1)',
									'& .MuiLinearProgress-bar': {
										bgcolor: 'var(--accent-gold)',
									},
								}}
							/>
						</DashboardPanel>
					</Box>
				)}

				{/* Tabs */}
				<Box sx={{ px: 2, mb: 2 }}>
					<Tabs 
						value={activeTab} 
						onChange={(_, newValue) => setActiveTab(newValue)}
						variant="scrollable"
						scrollButtons="auto"
						sx={{
							borderBottom: 1,
							borderColor: 'divider',
							'& .MuiTab-root': {
								textTransform: 'none',
								fontWeight: 600,
								fontSize: '0.875rem',
							},
						}}
					>
						<Tab label="Overview" value="overview" />
						<Tab label={`Shipments (${container.shipments.length})`} value="shipments" />
						{canViewExpenses && <Tab label={`Expenses (${container.expenses.length})`} value="expenses" />}
						{isAdmin && <Tab label={`Shipment Damages (${container.damages?.length || 0})`} value="damages" />}
						{canViewInvoices && <Tab label={`Invoices (${container.invoices.length})`} value="invoices" />}
						{canViewInvoices && <Tab label={`User Invoices (${container.userInvoices?.length || 0})`} value="user-invoices" />}
						<Tab label={`Documents (${container.documents.length})`} value="documents" />
						<Tab label={`Tracking (${container.trackingEvents?.length || 0})`} value="tracking" />
                        {isAdmin && <Tab label="Activity" icon={<Activity className="w-4 h-4" />} iconPosition="start" value="activity" />}
					</Tabs>
				</Box>

				{/* Tab Content */}
				<Box sx={{ px: 2, pb: 4 }}>
					{/* Overview Tab */}
					{activeTab === 'overview' && (
						<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
							<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
								{/* Container Information */}
								<DashboardPanel 
									title="Container Information"
									description="Basic container details"
								>
									<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
										<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
											<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Container Number</Box>
											<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
												{container.containerNumber}
											</Box>
										</Box>
										{isAdmin && (
											<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
												<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Assigned Company</Box>
												<TextField
													select
													size="small"
													value={selectedCompanyId}
													onChange={(e) => setSelectedCompanyId(e.target.value)}
													disabled={updating}
												>
													<MenuItem value="">Select a company...</MenuItem>
													{companies.map((company) => (
														<MenuItem key={company.id} value={company.id}>
															{company.name}{company.code ? ` (${company.code})` : ''}
														</MenuItem>
													))}
												</TextField>
												<Button
													variant="outline"
													size="sm"
													onClick={handleCompanyUpdate}
													disabled={updating || !selectedCompanyId || selectedCompanyId === (container.companyId || '')}
												>
													{updating ? 'Saving...' : 'Save Company'}
												</Button>
											</Box>
										)}
										{container.trackingNumber && (
											<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
												<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Tracking Number</Box>
												<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
													{container.trackingNumber}
												</Box>
											</Box>
										)}
										{container.bookingNumber && (
											<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
												<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Booking Number</Box>
												<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
													{container.bookingNumber}
												</Box>
											</Box>
										)}
										<Divider sx={{ borderColor: 'var(--border)' }} />
										<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
											<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Capacity</Box>
											<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
												{container.currentCount} / {container.maxCapacity} vehicles ({capacityPercentage.toFixed(0)}%)
											</Box>
										</Box>
										<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
											<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Created</Box>
											<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
												{formatDate(container.createdAt)}
											</Box>
										</Box>
									</Box>
								</DashboardPanel>

								{/* Shipping Details */}
								<DashboardPanel 
									title="Shipping Details"
									description="Vessel and shipping information"
								>
									<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
										{container.vesselName && (
											<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
												<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Vessel Name</Box>
												<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
													{container.vesselName}
												</Box>
											</Box>
										)}
										{container.voyageNumber && (
											<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
												<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Voyage Number</Box>
												<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
													{container.voyageNumber}
												</Box>
											</Box>
										)}
										{container.shippingLine && (
											<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
												<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Shipping Line</Box>
												<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
													{container.shippingLine}
												</Box>
											</Box>
										)}
										<Divider sx={{ borderColor: 'var(--border)' }} />
										{container.loadingPort && (
											<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
												<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Loading Port</Box>
												<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
													{container.loadingPort}
												</Box>
											</Box>
										)}
										{container.destinationPort && (
											<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
												<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Destination Port</Box>
												<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
													{container.destinationPort}
												</Box>
											</Box>
										)}
										{container.currentLocation && (
											<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
												<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Current Location</Box>
												<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
													{container.currentLocation}
												</Box>
											</Box>
										)}
									</Box>
								</DashboardPanel>

								{/* Important Dates */}
								<DashboardPanel 
									title="Important Dates"
									description="Shipping timeline"
								>
									<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
										{container.loadingDate && (
											<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
												<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Loading Date</Box>
												<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
													{formatDate(container.loadingDate)}
												</Box>
											</Box>
										)}
										{container.departureDate && (
											<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
												<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Departure Date</Box>
												<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
													{formatDate(container.departureDate)}
												</Box>
											</Box>
										)}
										{container.estimatedArrival && (
											<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
												<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Estimated Arrival</Box>
												<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
													{formatDate(container.estimatedArrival)}
												</Box>
											</Box>
										)}
										{container.actualArrival && (
											<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
												<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Actual Arrival</Box>
												<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
													{formatDate(container.actualArrival)}
												</Box>
											</Box>
										)}
									</Box>
								</DashboardPanel>

								{/* Financial Summary */}
								<DashboardPanel 
									title="Financial Summary"
									description="Revenue and expenses"
								>
									<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
										<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
											<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Expenses</Box>
											<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--error)' }}>
												{formatCurrency(container.totals.expenses)}
											</Box>
										</Box>
										<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
											<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Revenue</Box>
											<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--success)' }}>
												{formatCurrency(container.totals.invoices)}
											</Box>
										</Box>
										<Divider sx={{ borderColor: 'var(--border)' }} />
										<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
											<Box sx={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Net Profit</Box>
											<Box sx={{ 
												fontSize: '1rem', 
												fontWeight: 700, 
												color: netProfit >= 0 ? 'var(--success)' : 'var(--error)' 
											}}>
												{formatCurrency(netProfit)}
											</Box>
										</Box>
									</Box>
								</DashboardPanel>
							</Box>

							{/* Notes */}
							{container.notes && (
								<DashboardPanel title="Notes" description="Additional information">
									<Box sx={{ 
										fontSize: '0.875rem', 
										color: 'var(--text-secondary)', 
										lineHeight: 1.6,
										whiteSpace: 'pre-wrap',
									}}>
										{container.notes}
									</Box>
								</DashboardPanel>
							)}

							{/* Status Management */}
							{isAdmin && (
								<DashboardPanel 
									title="Update Container Status"
									description="Change the container's current status"
								>
									<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
										{Object.entries(statusConfig).map(([status, config]) => (
											<Button
												key={status}
												variant={container.status === status ? 'primary' : 'outline'}
												size="sm"
												onClick={() => handleStatusUpdate(status)}
												disabled={updating || container.status === status}
											>
												{config.label}
											</Button>
										))}
									</Box>
								</DashboardPanel>
							)}
						</Box>
					)}

					{/* Shipments Tab */}
					{activeTab === 'shipments' && (
						<DashboardPanel
							title={`Assigned Vehicles (${container.currentCount}/${container.maxCapacity})`}
							description="Vehicles currently loaded in this container"
						>
							{container.shipments.length === 0 ? (
								<EmptyState
									icon={<Package className="w-12 h-12" />}
									title="No Vehicles Assigned"
									description="This container doesn't have any vehicles assigned yet"
								/>
							) : (
								<TableContainer>
									<Table size="small">
										<TableHead>
											<TableRow>
												<TableCell sx={{ fontWeight: 600 }}>Vehicle</TableCell>
												<TableCell sx={{ fontWeight: 600 }}>VIN</TableCell>
												<TableCell sx={{ fontWeight: 600 }}>Payment</TableCell>
												<TableCell sx={{ fontWeight: 600 }} align="right">Price</TableCell>
												<TableCell sx={{ fontWeight: 600 }} align="right">Insurance</TableCell>
												<TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
												<TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{container.shipments.map((shipment) => (
												<TableRow 
													key={shipment.id}
													hover
													sx={{ cursor: 'pointer' }}
													onClick={() => router.push(`/dashboard/shipments/${shipment.id}`)}
												>
													<TableCell>
														{shipment.vehicleMake} {shipment.vehicleModel}
													</TableCell>
													<TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
														{shipment.vehicleVIN || 'N/A'}
													</TableCell>
													<TableCell>
														<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
															{(shipment as any).paymentMode && (
																<Chip 
																	label={(shipment as any).paymentMode} 
																	size="small"
																	color={(shipment as any).paymentMode === 'CASH' ? 'success' : 'warning'}
																	sx={{ fontSize: '0.7rem', width: 'fit-content' }}
																/>
															)}
															<Chip 
																label={(shipment as any).paymentStatus || 'PENDING'} 
																size="small"
																color={(shipment as any).paymentStatus === 'COMPLETED' ? 'success' : 'default'}
																sx={{ fontSize: '0.7rem', width: 'fit-content' }}
															/>
														</Box>
													</TableCell>
													<TableCell align="right" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
														{(shipment as any).price ? formatCurrency((shipment as any).price) : 'N/A'}
													</TableCell>
													<TableCell align="right" sx={{ fontWeight: 600, color: 'var(--accent-gold)' }}>
														{(shipment as any).insuranceValue ? formatCurrency((shipment as any).insuranceValue) : 'N/A'}
													</TableCell>
													<TableCell>
														<Chip 
															label={shipment.status} 
															size="small"
															color="primary"
															sx={{ fontSize: '0.75rem' }}
														/>
													</TableCell>
													<TableCell align="right">
														<Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
															{isAdmin && (
																<Button
																	variant="outline"
																	size="sm"
																	icon={<DollarSign className="w-3 h-3" />}
																	onClick={(e) => {
																		e.stopPropagation();
																		setSelectedShipmentForExpense(shipment.id);
																		setShipmentExpenseModalOpen(true);
																	}}
																	sx={{
																		color: 'var(--accent-gold)',
																		borderColor: 'var(--accent-gold)',
																	}}
																>
																	Expense
																</Button>
															)}
															<Button
																variant="outline"
																size="sm"
																icon={<Eye className="w-3 h-3" />}
																onClick={(e) => {
																	e.stopPropagation();
																	router.push(`/dashboard/shipments/${shipment.id}`);
																}}
															>
																View
															</Button>
														</Box>
													</TableCell>
												</TableRow>
											))}
											{/* Totals Row */}
											<TableRow sx={{ bgcolor: 'var(--surface)' }}>
												<TableCell colSpan={3} sx={{ fontWeight: 700, borderTop: '2px solid var(--border)' }}>
													Total Revenue from Shipments
												</TableCell>
												<TableCell align="right" sx={{ fontWeight: 700, borderTop: '2px solid var(--border)', color: 'var(--success)' }}>
													{formatCurrency(container.shipments.reduce((sum, s) => sum + ((s as any).price || 0), 0))}
												</TableCell>
												<TableCell align="right" sx={{ fontWeight: 700, borderTop: '2px solid var(--border)', color: 'var(--accent-gold)' }}>
													{formatCurrency(container.shipments.reduce((sum, s) => sum + ((s as any).insuranceValue || 0), 0))}
												</TableCell>
												<TableCell colSpan={2} sx={{ borderTop: '2px solid var(--border)' }}></TableCell>
											</TableRow>
										</TableBody>
									</Table>
								</TableContainer>
							)}
						</DashboardPanel>
					)}

					{/* Expenses Tab */}
					{activeTab === 'expenses' && (
						<DashboardPanel
							title="Container Expenses"
							description="All costs and expenses for this container"
						>
							<Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 2 }}>
								{canManageExpenses && (
									<Button
										variant="outline"
										size="sm"
										icon={<Plus className="w-4 h-4" />}
										onClick={() => {
											setSelectedShipmentForExpense(undefined);
											setShipmentExpenseModalOpen(true);
										}}
									>
										Add Shipment Expense
									</Button>
								)}
								{canManageExpenses && (
									<Button
										variant="primary"
										size="sm"
										icon={<Plus className="w-4 h-4" />}
										onClick={() => setExpenseModalOpen(true)}
									>
										Add Container Expense
									</Button>
								)}
							</Box>

							<Box sx={{ borderBottom: '1px solid var(--border)', mb: 2 }}>
								<Tabs
									value={expenseView}
									onChange={(_, value) => setExpenseView(value)}
									sx={{
										'& .MuiTab-root': {
											textTransform: 'none',
											fontSize: '0.875rem',
											fontWeight: 600,
											color: 'var(--text-secondary)',
											minHeight: 40,
										},
										'& .Mui-selected': {
											color: 'var(--accent-gold) !important',
										},
										'& .MuiTabs-indicator': {
											backgroundColor: 'var(--accent-gold)',
										},
									}}
								>
									<Tab label={`Container Expenses (${containerOnlyExpenses.length})`} value="CONTAINER" />
									<Tab label={`Shipment Expenses (${shipmentOnlyExpenses.length})`} value="SHIPMENT" />
								</Tabs>
							</Box>

							{displayedExpenses.length === 0 ? (
								<EmptyState
									icon={<DollarSign className="w-12 h-12" />}
									title={expenseView === 'CONTAINER' ? 'No Container Expenses' : 'No Shipment Expenses'}
									description={expenseView === 'CONTAINER'
										? 'No direct container expenses have been added yet'
										: 'No shipment-level expenses found for this container'}
								/>
							) : (
								<TableContainer>
									<Table size="small">
										<TableHead>
											<TableRow>
												<TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
												<TableCell sx={{ fontWeight: 600 }}>Vendor</TableCell>
												<TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
												<TableCell sx={{ fontWeight: 600 }} align="right">Amount</TableCell>
												<TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{displayedExpenses.map((expense) => (
												<TableRow key={expense.id} hover>
													<TableCell>{expense.type}</TableCell>
													<TableCell>{expense.vendor || 'N/A'}</TableCell>
													<TableCell>{formatDate(expense.date)}</TableCell>
													<TableCell align="right" sx={{ fontWeight: 600, color: 'var(--error)' }}>
														{formatCurrency(expense.amount, expense.currency)}
													</TableCell>
													<TableCell align="right">
														{isShipmentExpense(expense) ? (
															<Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => {
																		if (expense.shipmentId) {
																			router.push(`/dashboard/shipments/${expense.shipmentId}`);
																		}
																	}}
																>
																	View
																</Button>
																{canManageExpenses && (
																	<Button
																		variant="outline"
																		size="sm"
																		icon={<Trash2 className="w-3 h-3" />}
																		onClick={() => handleDeleteExpense(expense.id)}
																		disabled={deletingExpenseId === expense.id}
																		sx={{
																			color: 'var(--error)',
																			borderColor: 'var(--error)',
																			'&:hover': { bgcolor: 'rgba(var(--error-rgb), 0.1)' }
																		}}
																	>
																		{deletingExpenseId === expense.id ? 'Deleting...' : 'Delete'}
																	</Button>
																)}
															</Box>
														) : (
															canManageExpenses ? (
																<Button
																	variant="outline"
																	size="sm"
																	icon={<Trash2 className="w-3 h-3" />}
																	onClick={() => handleDeleteExpense(expense.id)}
																	disabled={deletingExpenseId === expense.id}
																	sx={{ 
																		color: 'var(--error)',
																		borderColor: 'var(--error)',
																		'&:hover': { bgcolor: 'rgba(var(--error-rgb), 0.1)' }
																	}}
																>
																	{deletingExpenseId === expense.id ? 'Deleting...' : 'Delete'}
																</Button>
															) : null
														)}
													</TableCell>
												</TableRow>
											))}
											<TableRow>
												<TableCell colSpan={4} sx={{ fontWeight: 700 }}>
													{expenseView === 'CONTAINER' ? 'Total Container Expenses' : 'Total Shipment Expenses'}
												</TableCell>
												<TableCell align="right" sx={{ fontWeight: 700, color: 'var(--error)' }}>
													{formatCurrency(displayedExpenseTotal)}
												</TableCell>
											</TableRow>
											<TableRow>
												<TableCell colSpan={4} sx={{ fontWeight: 700 }}>Grand Total (All Expenses)</TableCell>
												<TableCell align="right" sx={{ fontWeight: 700, color: 'var(--error)' }}>
													{formatCurrency(container.totals.expenses)}
												</TableCell>
											</TableRow>
										</TableBody>
									</Table>
								</TableContainer>
							)}
						</DashboardPanel>
					)}

					{/* Shipment Damages Tab */}
					{activeTab === 'damages' && (
						<DashboardPanel
							title="Shipment Damages"
							description="Damage records for shipments in this container"
						>
							<Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
								{isAdmin && (
									<Button
										variant="primary"
										size="sm"
										icon={<Plus className="w-4 h-4" />}
										onClick={() => {
											if (!container.companyId) {
												toast.error('This container must be assigned to a shipping company before adding expenses or damages.');
												return;
											}
											setDamageModalOpen(true);
										}}
									>
										Add Damage
									</Button>
								)}
							</Box>

							{!container.companyId && (
								<Box sx={{ p: 2, mb: 2, bgcolor: 'rgba(var(--warning-rgb), 0.1)', border: '1px solid rgba(var(--warning-rgb), 0.3)', borderRadius: 1 }}>
									<Typography sx={{ fontSize: '0.875rem', color: 'var(--warning)' }}>
										⚠ This container must be assigned to a shipping company before adding expenses or damages.
									</Typography>
								</Box>
							)}

							{!container.damages || container.damages.length === 0 ? (
								<EmptyState
									icon={<AlertTriangle className="w-12 h-12" />}
									title="No Damage Records"
									description="No damage records have been added to this container yet"
								/>
							) : (
								<TableContainer>
									<Table size="small">
										<TableHead>
											<TableRow>
												<TableCell sx={{ fontWeight: 600 }}>Shipment</TableCell>
												<TableCell sx={{ fontWeight: 600 }}>Damage Type</TableCell>
												<TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
												<TableCell sx={{ fontWeight: 600 }} align="right">Amount</TableCell>
												<TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
												<TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{container.damages.map((damage) => (
												<TableRow key={damage.id} hover>
													<TableCell>
														<Box sx={{ fontSize: '0.8rem' }}>
															{damage.shipment
																? [damage.shipment.vehicleMake, damage.shipment.vehicleModel].filter(Boolean).join(' ') || 'Vehicle'
																: damage.shipmentId}
															{damage.shipment?.vehicleVIN && (
																<Box component="span" sx={{ color: 'var(--text-secondary)', ml: 0.5 }}>
																	({damage.shipment.vehicleVIN})
																</Box>
															)}
														</Box>
													</TableCell>
													<TableCell>
														<Chip
															label={damage.damageType === 'WE_PAY' ? 'We Pay' : 'Company Pays'}
															size="small"
															color={damage.damageType === 'WE_PAY' ? 'warning' : 'error'}
														/>
													</TableCell>
													<TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
														{damage.description}
													</TableCell>
													<TableCell align="right" sx={{ fontWeight: 600, color: 'var(--error)' }}>
														{formatCurrency(damage.amount)}
													</TableCell>
													<TableCell>{formatDate(damage.createdAt)}</TableCell>
													<TableCell align="right">
														<Button
															variant="outline"
															size="sm"
															icon={<Trash2 className="w-3 h-3" />}
															onClick={() => handleDeleteDamage(damage.id)}
															disabled={deletingDamageId === damage.id}
															sx={{
																color: 'var(--error)',
																borderColor: 'var(--error)',
																'&:hover': { bgcolor: 'rgba(var(--error-rgb), 0.1)' }
															}}
														>
															{deletingDamageId === damage.id ? 'Deleting...' : 'Delete'}
														</Button>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</TableContainer>
							)}
						</DashboardPanel>
					)}

					{/* Invoices Tab */}
					{activeTab === 'invoices' && (
						<DashboardPanel
							title="Container Invoices"
							description="Billing and revenue for this container"
						>
							<Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
								{canManageInvoices && (
									<Button
										variant="primary"
										size="sm"
										icon={<Plus className="w-4 h-4" />}
										onClick={() => setInvoiceModalOpen(true)}
									>
										Create Invoice
									</Button>
								)}
							</Box>

							{container.invoices.length === 0 ? (
								<EmptyState
									icon={<FileText className="w-12 h-12" />}
									title="No Invoices"
									description="No invoices have been created for this container yet"
								/>
							) : (
								<TableContainer>
									<Table size="small">
										<TableHead>
											<TableRow>
												<TableCell sx={{ fontWeight: 600 }}>Invoice #</TableCell>
												<TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
												<TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
												<TableCell sx={{ fontWeight: 600 }} align="right">Amount</TableCell>
												<TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{container.invoices.map((invoice) => (
												<TableRow key={invoice.id} hover>
													<TableCell sx={{ fontFamily: 'monospace' }}>{invoice.invoiceNumber}</TableCell>
													<TableCell>{formatDate(invoice.date)}</TableCell>
													<TableCell>
														<Chip 
															label={invoice.status} 
															size="small"
															color={invoice.status === 'PAID' ? 'success' : 'default'}
															sx={{ fontSize: '0.75rem' }}
														/>
													</TableCell>
													<TableCell align="right" sx={{ fontWeight: 600, color: 'var(--success)' }}>
														{formatCurrency(invoice.amount, invoice.currency)}
													</TableCell>
													<TableCell align="right">
														{canManageInvoices && (
															<Button
																variant="outline"
																size="sm"
																icon={<Trash2 className="w-3 h-3" />}
																onClick={() => handleDeleteInvoice(invoice.id)}
																disabled={deletingInvoiceId === invoice.id}
																sx={{ 
																	color: 'var(--error)',
																	borderColor: 'var(--error)',
																	'&:hover': { bgcolor: 'rgba(var(--error-rgb), 0.1)' }
																}}
															>
																{deletingInvoiceId === invoice.id ? 'Deleting...' : 'Delete'}
															</Button>
														)}
													</TableCell>
												</TableRow>
											))}
											<TableRow>
												<TableCell colSpan={4} sx={{ fontWeight: 700 }}>Total Revenue</TableCell>
												<TableCell align="right" sx={{ fontWeight: 700, color: 'var(--success)' }}>
													{formatCurrency(container.totals.invoices)}
												</TableCell>
											</TableRow>
										</TableBody>
									</Table>
								</TableContainer>
							)}
						</DashboardPanel>
					)}

					{/* User Invoices Tab */}
					{activeTab === 'user-invoices' && (
						<DashboardPanel
							title="User Invoices"
							description="Customer invoices for shipments in this container"
						>
							{/* Info box explaining invoice generation */}
							{isAdmin && (!container.userInvoices || container.userInvoices.length === 0) && container.shipments.length > 0 && (
								<Box sx={{ 
									mb: 3, 
									p: 2, 
									bgcolor: 'rgba(var(--info-rgb), 0.1)', 
									border: '1px solid rgba(var(--info-rgb), 0.3)',
									borderRadius: 2,
									display: 'flex',
									gap: 2,
									alignItems: 'flex-start'
								}}>
									<FileText className="w-5 h-5" style={{ color: 'var(--info)', marginTop: '2px', flexShrink: 0 }} />
									<Box sx={{ flex: 1 }}>
										<Typography sx={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem', mb: 0.5 }}>
											Generate Official Customer Invoices
										</Typography>
										<Typography sx={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
											Click "Generate Invoices" to create official invoices for all customers with shipments in this container. 
											The system will consolidate each customer's shipments, allocate container expenses, and send email notifications with PDF links.
											{container.expenses && container.expenses.length > 0 && (
												<> Container expenses will be allocated using the <strong>{container.expenseAllocationMethod || 'EQUAL'}</strong> method.</>
											)}
										</Typography>
										<Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mt: 1, fontStyle: 'italic' }}>
											💡 Tip: For quick reference PDFs of individual shipments, use the "Download Receipt" button on each shipment page.
										</Typography>
									</Box>
								</Box>
							)}

							<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
								<Box sx={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
									{container.shipments.length > 0 
										? `${new Set(container.shipments.map(s => s.user?.id)).size} unique customer(s) with shipments`
										: 'No shipments in container'
									}
								</Box>
								{isAdmin && (
									<Button
										variant="primary"
										size="sm"
										icon={<Plus className="w-4 h-4" />}
										onClick={() => setInvoiceGenerationModalOpen(true)}
										disabled={container.shipments.length === 0}
									>
										Generate Invoices
									</Button>
								)}
							</Box>

							{!container.userInvoices || container.userInvoices.length === 0 ? (
								<EmptyState
									icon={<FileText className="w-12 h-12" />}
									title="No User Invoices"
									description={
										container.shipments.length > 0
											? 'Click "Generate Invoices" to create invoices for all customers'
											: 'Add shipments to this container before generating invoices'
									}
								/>
							) : (
								<TableContainer>
									<Table size="small">
										<TableHead>
											<TableRow>
												<TableCell sx={{ fontWeight: 600 }}>Invoice #</TableCell>
												<TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
												<TableCell sx={{ fontWeight: 600 }}>Issue Date</TableCell>
												<TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
												<TableCell sx={{ fontWeight: 600 }} align="right">Total</TableCell>
												<TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{container.userInvoices.map((invoice) => (
												<TableRow key={invoice.id} hover>
													<TableCell sx={{ fontFamily: 'monospace' }}>{invoice.invoiceNumber}</TableCell>
													<TableCell>
														<Box>
															<Box sx={{ fontWeight: 600 }}>{invoice.user.name || 'N/A'}</Box>
															<Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
																{invoice.user.email}
															</Box>
														</Box>
													</TableCell>
													<TableCell>{formatDate(invoice.issueDate)}</TableCell>
													<TableCell>
														<Chip 
															label={invoice.status} 
															size="small"
															color={
																invoice.status === 'PAID' ? 'success' : 
																invoice.status === 'OVERDUE' ? 'error' :
																invoice.status === 'SENT' ? 'info' : 
																'default'
															}
															sx={{ fontSize: '0.75rem' }}
														/>
													</TableCell>
													<TableCell align="right" sx={{ fontWeight: 600, color: 'var(--success)' }}>
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
														</Box>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</TableContainer>
							)}
						</DashboardPanel>
					)}

					{/* Documents Tab */}
					{activeTab === 'documents' && (
						<DashboardPanel
							title="Container Documents"
							description="Files and documents related to this container"
						>
                            <DocumentManager 
                                documents={container.documents.map(d => ({
                                    id: d.id,
                                    name: d.name,
                                    type: d.type,
                                    fileUrl: d.fileUrl,
                                    url: d.fileUrl,
                                    fileType: d.fileType,
                                    fileSize: d.fileSize,
                                    size: d.fileSize,
                                    category: d.type,
                                    uploadedBy: d.uploadedBy,
                                    createdAt: d.uploadedAt.toString()
                                }))}
                                entityId={container.id}
                                entityType="container"
								onDocumentsChange={() => {
									void refreshContainerPage();
								}}
                            />
						</DashboardPanel>
					)}

					{/* Tracking Tab */}
					{activeTab === 'tracking' && (
						<DashboardPanel
							title="Tracking History"
							description="Location updates and status changes"
						>
                            <Box sx={{ mb: 4 }}>
                                {(() => {
                                    // Find latest event with coordinates
                                    const latestEventWithCoords = container.trackingEvents
                                        ?.filter(e => e.latitude && e.longitude)
                                        .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())[0];
                                    
                                    const currentCoordinates = latestEventWithCoords && latestEventWithCoords.latitude && latestEventWithCoords.longitude 
                                        ? { lat: latestEventWithCoords.latitude, lng: latestEventWithCoords.longitude }
                                        : null;

                                    return (
                                        <TrackingMap 
                                            origin={container.loadingPort} 
                                            destination={container.destinationPort}
                                            currentLocation={container.currentLocation}
                                            currentCoordinates={currentCoordinates}
                                        />
                                    );
                                })()}
                            </Box>

							<Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 2 }}>
                                {isAdmin && container.trackingNumber && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        icon={<RefreshCw className={`w-4 h-4 ${refreshingTracking ? 'animate-spin' : ''}`} />}
                                        onClick={handleRefreshTracking}
                                        disabled={refreshingTracking}
                                    >
                                        {refreshingTracking ? 'Syncing...' : 'Refresh Tracking'}
                                    </Button>
                                )}
								{isAdmin && (
									<Button
										variant="primary"
										size="sm"
										icon={<Plus className="w-4 h-4" />}
										onClick={() => setTrackingModalOpen(true)}
									>
										Add Tracking Event
									</Button>
								)}
							</Box>

							{(!container.trackingEvents || container.trackingEvents.length === 0) ? (
								<EmptyState
									icon={<MapPin className="w-12 h-12" />}
									title="No Tracking Events"
									description="No tracking updates have been recorded yet"
								/>
							) : (
								<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
									{container.trackingEvents.map((event, index) => (
										<Box 
											key={event.id}
											sx={{ 
												position: 'relative',
												pl: 4,
												borderLeft: index < container.trackingEvents.length - 1 ? '2px solid var(--border)' : 'none',
												pb: index < container.trackingEvents.length - 1 ? 3 : 0,
											}}
										>
											<Box
												sx={{
													position: 'absolute',
													left: -9,
													top: 0,
													width: 16,
													height: 16,
													borderRadius: '50%',
													bgcolor: (event as any).completed ? 'var(--success)' : 'var(--accent-gold)',
													border: '2px solid var(--background)',
												}}
											/>
											<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, alignItems: 'start' }}>
												<Box>
													<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
														{event.status}
													</Box>
													{(event as any).vesselName && (
														<Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mt: 0.5 }}>
															🚢 {(event as any).vesselName}
														</Box>
													)}
												</Box>
												<Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
													<Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
														{new Date(event.eventDate).toLocaleString()}
													</Box>
													<Button
														variant="outline"
														size="sm"
														icon={<Trash2 className="w-3 h-3" />}
														onClick={() => handleDeleteTrackingEvent(event.id)}
														disabled={deletingEventId === event.id}
														sx={{ 
															color: 'var(--error)',
															borderColor: 'var(--error)',
															'&:hover': { bgcolor: 'rgba(var(--error-rgb), 0.1)' },
															minWidth: 'auto',
															px: 1,
														}}
													/>
												</Box>
											</Box>
											{event.location && (
												<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)', mb: 0.5 }}>
													📍 {event.location}
												</Box>
											)}
											{event.description && (
												<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)', mb: 0.5 }}>
													{event.description}
												</Box>
											)}
											{(event as any).source && (
												<Box sx={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
													Source: {(event as any).source}
												</Box>
											)}
										</Box>
									))}
								</Box>
							)}
						</DashboardPanel>
					)}

                    {/* Activity Log Tab */}
                    {activeTab === 'activity' && (
                        <DashboardPanel
                            title="Activity History"
                            description="Audit log of all actions performed on this container"
                        >
                            <ActivityLog logs={container.auditLogs} />
                        </DashboardPanel>
                    )}
				</Box>

				{/* Add Container Expense Modal */}
				<AddExpenseModal
					open={expenseModalOpen}
					onClose={() => setExpenseModalOpen(false)}
					containerId={container.id}
					onSuccess={() => {
						void refreshContainerPage();
					}}
				/>

				{/* Add Damage Modal */}
				<AddDamageModal
					open={damageModalOpen}
					onClose={() => setDamageModalOpen(false)}
					containerId={container.id}
					shipments={container.shipments}
					onSuccess={() => {
						void refreshContainerPage();
					}}
				/>

				{/* Add Shipment Expense Modal */}
				<AddShipmentExpenseModal
					open={shipmentExpenseModalOpen}
					onClose={() => {
						setShipmentExpenseModalOpen(false);
						setSelectedShipmentForExpense(undefined);
					}}
					shipmentId={selectedShipmentForExpense}
					shipments={selectedShipmentForExpense ? undefined : container.shipments.map((s) => ({
						id: s.id,
						vehicleMake: s.vehicleMake,
						vehicleModel: s.vehicleModel,
						vehicleVIN: s.vehicleVIN,
						user: s.user,
					}))}
					onSuccess={() => {
						void refreshContainerPage();
					}}
				/>

				{/* Add Invoice Modal */}
				<AddInvoiceModal
					open={invoiceModalOpen}
					onClose={() => setInvoiceModalOpen(false)}
					containerId={container.id}
					onSuccess={fetchContainer}
				/>

				{/* Add Tracking Event Modal */}
				<AddTrackingEventModal
					open={trackingModalOpen}
					onClose={() => setTrackingModalOpen(false)}
					containerId={container.id}
					onSuccess={fetchContainer}
				/>

				{/* QR Code Modal */}
				<Dialog
					open={qrModalOpen}
					onClose={() => setQrModalOpen(false)}
					maxWidth="xs"
					fullWidth
					PaperProps={{
						sx: {
							bgcolor: 'white',
							backgroundImage: 'none',
							borderRadius: 2,
							p: 2
						}
					}}
				>
					<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 2 }}>
						<Typography variant="h6" sx={{ fontWeight: 700, color: 'black' }}>
							Container QR Code
						</Typography>
						<Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid #eee' }}>
							<QRCode 
								value={`${window.location.origin}/tracking?container=${container.containerNumber}`}
								size={200}
								style={{ height: "auto", maxWidth: "100%", width: "100%" }}
								viewBox={`0 0 256 256`}
							/>
						</Box>
						<Box sx={{ textAlign: 'center' }}>
							<Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: 'black' }}>
								{container.containerNumber}
							</Typography>
							{container.trackingNumber && (
								<Typography sx={{ color: 'gray', fontSize: '0.9rem' }}>
									Tracking: {container.trackingNumber}
								</Typography>
							)}
						</Box>
						<Typography sx={{ fontSize: '0.8rem', color: 'gray', textAlign: 'center', maxWidth: '80%' }}>
							Scan to view container status and tracking details on mobile.
						</Typography>
						<Button 
							variant="outline" 
							onClick={() => setQrModalOpen(false)}
							sx={{ mt: 1, minWidth: 100 }}
						>
							Close
						</Button>
					</Box>
				</Dialog>

				{/* Duplicate Container Modal */}
				<Dialog
					open={duplicateModalOpen}
					onClose={() => !duplicating && setDuplicateModalOpen(false)}
					maxWidth="sm"
					fullWidth
					PaperProps={{
						sx: {
							bgcolor: 'var(--panel)',
							backgroundImage: 'none',
							border: '1px solid var(--border)',
							borderRadius: 2,
						}
					}}
				>
					<DialogTitle
						sx={{
							color: 'var(--text-primary)',
							fontWeight: 700,
							fontSize: '1.25rem',
							borderBottom: '1px solid var(--border)',
							display: 'flex',
							alignItems: 'center',
							gap: 1.5,
						}}
					>
						<Box
							sx={{
								width: 40,
								height: 40,
								borderRadius: '50%',
								bgcolor: 'rgba(var(--accent-gold-rgb), 0.1)',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<Copy className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
						</Box>
						Duplicate Container
					</DialogTitle>
					<DialogContent sx={{ py: 3 }}>
						<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
							<Box sx={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
								Create a copy of container <strong>{container.containerNumber}</strong> with all settings.
							</Box>
							
							<Box
								sx={{
									p: 2,
									borderRadius: 1,
									bgcolor: 'rgba(99, 102, 241, 0.1)',
									border: '1px solid rgba(99, 102, 241, 0.3)',
								}}
							>
								<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
									<strong style={{ color: 'var(--text-primary)' }}>What will be copied:</strong>
								</Box>
								<Box component="ul" sx={{ mt: 1, pl: 2.5, fontSize: '0.875rem', color: 'var(--text-secondary)', '& li': { mb: 0.5 } }}>
									<li>Vessel and voyage information</li>
									<li>Shipping line and ports</li>
									<li>Dates and capacity settings</li>
									<li>Notes and preferences</li>
								</Box>
								<Box sx={{ mt: 1.5, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
									<strong style={{ color: 'var(--text-primary)' }}>What won't be copied:</strong>
								</Box>
								<Box component="ul" sx={{ mt: 0.5, pl: 2.5, fontSize: '0.875rem', color: 'var(--text-secondary)', '& li': { mb: 0.5 } }}>
									<li>Assigned shipments</li>
									<li>Expenses and invoices</li>
									<li>Documents and tracking events</li>
									<li>Booking number</li>
								</Box>
							</Box>

							<Box>
								<Box
									component="label"
									sx={{
										display: 'block',
										fontSize: '0.875rem',
										fontWeight: 600,
										color: 'var(--text-primary)',
										mb: 1,
									}}
								>
									New Container Number <span style={{ color: 'var(--error)' }}>*</span>
								</Box>
								<input
									type="text"
									value={newContainerNumber}
									onChange={(e) => setNewContainerNumber(e.target.value)}
									placeholder="e.g., ABCU9876543"
									disabled={duplicating}
									style={{
										width: '100%',
										padding: '10px 12px',
										borderRadius: '8px',
										border: '1px solid var(--border)',
										backgroundColor: 'var(--background)',
										color: 'var(--text-primary)',
										fontSize: '0.95rem',
									}}
									autoFocus
								/>
							</Box>
						</Box>
					</DialogContent>
					<DialogActions
						sx={{
							px: 3,
							py: 2,
							borderTop: '1px solid var(--border)',
							gap: 1,
						}}
					>
						<Button
							variant="outline"
							onClick={() => setDuplicateModalOpen(false)}
							disabled={duplicating}
							sx={{
								color: 'var(--text-secondary)',
								borderColor: 'var(--border)',
								'&:hover': {
									bgcolor: 'var(--background)',
								}
							}}
						>
							Cancel
						</Button>
						<Button
							variant="primary"
							onClick={handleDuplicateContainer}
							disabled={duplicating || !newContainerNumber.trim()}
							sx={{
								bgcolor: 'var(--accent-gold)',
								color: 'white',
								'&:hover': {
									bgcolor: 'var(--accent-gold)',
									opacity: 0.9,
								},
								'&:disabled': {
									opacity: 0.5,
									cursor: 'not-allowed',
									}
							}}
						>
							{duplicating ? (
								<>
									<Box
										component="span"
										sx={{
											display: 'inline-block',
											width: 16,
											height: 16,
											mr: 1,
											border: '2px solid white',
											borderTopColor: 'transparent',
											borderRadius: '50%',
											animation: 'spin 0.6s linear infinite',
											'@keyframes spin': {
												'0%': { transform: 'rotate(0deg)' },
												'100%': { transform: 'rotate(360deg)' },
											},
										}}
									/>
									Duplicating...
								</>
							) : (
								<>
									<Copy className="w-4 h-4 mr-2" />
									Duplicate Container
								</>
							)}
						</Button>
					</DialogActions>
				</Dialog>

				{/* Generate Invoices Modal */}
				<Dialog
					open={invoiceGenerationModalOpen}
					onClose={() => !generatingInvoices && setInvoiceGenerationModalOpen(false)}
					maxWidth="md"
					fullWidth
					PaperProps={{
						sx: {
							bgcolor: 'var(--panel)',
							backgroundImage: 'none',
							border: '1px solid var(--border)',
							borderRadius: 2,
						}
					}}
				>
					<DialogTitle
						sx={{
							color: 'var(--text-primary)',
							fontWeight: 700,
							fontSize: '1.25rem',
							borderBottom: '1px solid var(--border)',
						}}
					>
						Generate User Invoices
					</DialogTitle>
					<DialogContent sx={{ py: 3 }}>
						<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
							<Box sx={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
								Generate invoices for all customers with shipments in container <strong>{container.containerNumber}</strong>.
							</Box>

							{/* Summary */}
							<Box
								sx={{
									p: 2,
									bgcolor: 'var(--background)',
									border: '1px solid var(--border)',
									borderRadius: 1,
								}}
							>
								<Box sx={{ fontWeight: 600, mb: 1.5, color: 'var(--text-primary)' }}>
									Invoice Summary
								</Box>
								<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
									<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
										<Box sx={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
											Total Shipments:
										</Box>
										<Box sx={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
											{container.shipments.length}
										</Box>
									</Box>
									<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
										<Box sx={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
											Unique Customers:
										</Box>
										<Box sx={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
											{new Set(container.shipments.map(s => s.user?.id)).size}
										</Box>
									</Box>
									<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
										<Box sx={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
											Container Expenses:
										</Box>
										<Box sx={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
											{formatCurrency(container.totals.expenses)}
										</Box>
									</Box>
									<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
										<Box sx={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
											Expense per Vehicle:
										</Box>
										<Box sx={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
											{formatCurrency(
												container.shipments.length > 0
													? container.totals.expenses / container.shipments.length
													: 0
											)}
										</Box>
									</Box>
								</Box>
							</Box>

							{/* Info */}
							<Box
								sx={{
									p: 2,
									bgcolor: 'rgba(var(--info-rgb), 0.1)',
									border: '1px solid rgba(var(--info-rgb), 0.3)',
									borderRadius: 1,
									fontSize: '0.875rem',
									color: 'var(--text-secondary)',
									lineHeight: 1.6,
								}}
							>
								<strong>How it works:</strong>
								<ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
									<li>One invoice per customer</li>
									<li>Each invoice includes all their vehicles in this container</li>
									<li>Vehicle prices and insurance are per-vehicle</li>
									<li>Container expenses are divided equally among all vehicles</li>
									<li>Invoices will be created as DRAFT status</li>
								</ul>
							</Box>
						</Box>
					</DialogContent>
					<DialogActions sx={{ p: 3, borderTop: '1px solid var(--border)' }}>
						<Button
							variant="outline"
							onClick={() => setInvoiceGenerationModalOpen(false)}
							disabled={generatingInvoices}
						>
							Cancel
						</Button>
						<Button
							variant="primary"
							onClick={handleGenerateInvoices}
							disabled={generatingInvoices}
							icon={<FileText className="w-4 h-4" />}
						>
							{generatingInvoices ? 'Generating...' : 'Generate Invoices'}
						</Button>
					</DialogActions>
				</Dialog>

				{/* Delete Confirmation Modal */}
				<Dialog
					open={deleteModalOpen}
					onClose={() => !deleting && setDeleteModalOpen(false)}
					maxWidth="sm"
					fullWidth
					PaperProps={{
						sx: {
							bgcolor: 'var(--panel)',
							backgroundImage: 'none',
							border: '1px solid var(--border)',
							borderRadius: 2,
						}
					}}
				>
					<DialogTitle
						sx={{
							color: 'var(--text-primary)',
							fontWeight: 700,
							fontSize: '1.25rem',
							borderBottom: '1px solid var(--border)',
							display: 'flex',
							alignItems: 'center',
							gap: 1.5,
						}}
					>
						<Box
							sx={{
								width: 40,
								height: 40,
								borderRadius: '50%',
								bgcolor: 'rgba(var(--error-rgb), 0.1)',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<AlertTriangle className="w-5 h-5" style={{ color: 'var(--error)' }} />
						</Box>
						Delete Container
					</DialogTitle>
					<DialogContent sx={{ py: 3 }}>
						<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
							<Box sx={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
								Are you sure you want to delete container <strong>{container.containerNumber}</strong>?
							</Box>
							
							{container.shipments.length > 0 && (
								<Box
									sx={{
										p: 2,
										borderRadius: 1,
										bgcolor: 'rgba(var(--error-rgb), 0.1)',
										border: '1px solid rgba(var(--error-rgb), 0.3)',
									}}
								>
									<Box sx={{ display: 'flex', alignItems: 'start', gap: 1.5 }}>
										<AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--error)' }} />
										<Box>
											<Box sx={{ fontWeight: 600, color: 'var(--error)', fontSize: '0.875rem', mb: 0.5 }}>
												Warning: Container has {container.shipments.length} assigned shipment{container.shipments.length !== 1 ? 's' : ''}
											</Box>
											<Box sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
												You must remove all shipments from this container before deleting it.
											</Box>
										</Box>
									</Box>
								</Box>
							)}

							{container.shipments.length === 0 && (
								<Box
									sx={{
										p: 2,
										borderRadius: 1,
										bgcolor: 'rgba(251, 191, 36, 0.1)',
										border: '1px solid rgba(251, 191, 36, 0.3)',
									}}
								>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
										<strong style={{ color: 'var(--text-primary)' }}>This action cannot be undone.</strong> This will permanently delete:
									</Box>
									<Box component="ul" sx={{ mt: 1, pl: 2.5, fontSize: '0.875rem', color: 'var(--text-secondary)', '& li': { mb: 0.5 } }}>
										<li>Container details and tracking information</li>
										<li>All tracking events ({container.trackingEvents?.length || 0} events)</li>
										<li>All expenses ({container.expenses.length} expenses)</li>
										<li>All invoices ({container.invoices.length} invoices)</li>
										<li>All documents ({container.documents.length} documents)</li>
										<li>All audit logs</li>
									</Box>
								</Box>
							)}
						</Box>
					</DialogContent>
					<DialogActions
						sx={{
							px: 3,
							py: 2,
							borderTop: '1px solid var(--border)',
							gap: 1,
						}}
					>
						<Button
							variant="outline"
							onClick={() => setDeleteModalOpen(false)}
							disabled={deleting}
							sx={{
								color: 'var(--text-secondary)',
								borderColor: 'var(--border)',
								'&:hover': {
									bgcolor: 'var(--background)',
								}
							}}
						>
							Cancel
						</Button>
						<Button
							variant="primary"
							onClick={handleDeleteContainer}
							disabled={deleting || container.shipments.length > 0}
							sx={{
								bgcolor: 'var(--error)',
								color: 'white',
								'&:hover': {
									bgcolor: 'var(--error)',
									opacity: 0.9,
								},
								'&:disabled': {
									opacity: 0.5,
									cursor: 'not-allowed',
								}
							}}
						>
							{deleting ? (
								<>
									<Box
										component="span"
										sx={{
											display: 'inline-block',
											width: 16,
											height: 16,
											mr: 1,
											border: '2px solid white',
											borderTopColor: 'transparent',
											borderRadius: '50%',
											animation: 'spin 0.6s linear infinite',
											'@keyframes spin': {
												'0%': { transform: 'rotate(0deg)' },
												'100%': { transform: 'rotate(360deg)' },
											},
										}}
									/>
									Deleting...
								</>
							) : (
								<>
									<Trash2 className="w-4 h-4 mr-2" />
									Delete Container
								</>
							)}
						</Button>
					</DialogActions>
				</Dialog>
			</DashboardSurface>
		</ProtectedRoute>
	);
}