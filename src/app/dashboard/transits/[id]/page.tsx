'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Autocomplete,
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Tab,
  Tabs,
  TextField,
  Tooltip,
} from '@mui/material';
import {
  ArrowLeft,
  DollarSign,
  History,
  Package,
  Pencil,
  Plus,
  Trash2,
  Truck,
  User,
  Eye,
  EyeOff,
} from 'lucide-react';
import AdminRoute from '@/components/auth/AdminRoute';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Breadcrumbs, Button, StatsCard, TableSkeleton, toast } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import AddShipmentExpenseModal from '@/components/shipments/AddShipmentExpenseModal';

interface Company {
  id: string;
  name: string;
  code: string | null;
  phone: string | null;
  email: string | null;
}

interface Shipment {
  id: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehicleVIN: string | null;
  status: string;
  user: { id: string; name: string | null; email: string; phone: string | null };
}

interface AssignableShipment {
  id: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehicleVIN: string | null;
  user: { id: string; name: string | null; email: string };
}

interface TransitEvent {
  id: string;
  status: string;
  location: string | null;
  description: string | null;
  eventDate: string;
  createdAt: string;
}

interface TransitExpense {
  id: string;
  type: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  vendor: string | null;
  invoiceNumber: string | null;
  category: string | null;
  notes: string | null;
  shipment: { id: string; vehicleMake: string | null; vehicleModel: string | null; vehicleVIN: string | null } | null;
  source: 'TRANSIT_EXPENSE' | 'SHIPMENT_EXPENSE';
}

interface Transit {
  id: string;
  referenceNumber: string;
  origin: string;
  destination: string;
  status: string;
  dispatchDate: string | null;
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  cost: number | null;
  notes: string | null;
  createdAt: string;
  company: Company;
  shipments: Shipment[];
  events: TransitEvent[];
  expenses: TransitExpense[];
  _count: { shipments: number; events: number; expenses: number };
}

const STATUS_OPTIONS = ['PENDING', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'CANCELLED'];
const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  PENDING: { bg: 'rgba(156, 163, 175, 0.15)', text: 'rgb(156, 163, 175)', border: 'rgba(156, 163, 175, 0.3)' },
  DISPATCHED: { bg: 'rgba(251, 191, 36, 0.15)', text: 'rgb(251, 191, 36)', border: 'rgba(251, 191, 36, 0.3)' },
  IN_TRANSIT: { bg: 'rgba(99, 102, 241, 0.15)', text: 'rgb(99, 102, 241)', border: 'rgba(99, 102, 241, 0.3)' },
  ARRIVED: { bg: 'rgba(34, 197, 94, 0.15)', text: 'rgb(34, 197, 94)', border: 'rgba(34, 197, 94, 0.3)' },
  DELIVERED: { bg: 'rgba(20, 184, 166, 0.15)', text: 'rgb(20, 184, 166)', border: 'rgba(20, 184, 166, 0.3)' },
  CANCELLED: { bg: 'rgba(239, 68, 68, 0.15)', text: 'rgb(239, 68, 68)', border: 'rgba(239, 68, 68, 0.3)' },
};
const statusLabels: Record<string, string> = { PENDING: 'Pending', DISPATCHED: 'Dispatched', IN_TRANSIT: 'In Transit', ARRIVED: 'Arrived', DELIVERED: 'Delivered', CANCELLED: 'Cancelled' };

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => (
  <div hidden={value !== index}>{value === index && <Box sx={{ pt: 2 }}>{children}</Box>}</div>
);

export default function TransitDetailPage() {
  const params = useParams();
  const transitId = String(params.id || '');
  const [transit, setTransit] = useState<Transit | null>(null);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Edit transit state
  const [openEdit, setOpenEdit] = useState(false);
  const [editForm, setEditForm] = useState({ status: '', dispatchDate: '', estimatedDelivery: '', actualDelivery: '', cost: '', notes: '' });
  const [saving, setSaving] = useState(false);

  // Add event state
  const [openEvent, setOpenEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ status: '', location: '', description: '', eventDate: new Date().toISOString().slice(0, 10) });
  const [postingEvent, setPostingEvent] = useState(false);

  // Add expense state
  const [shipmentExpenseModalOpen, setShipmentExpenseModalOpen] = useState(false);
  const [selectedShipmentForExpense, setSelectedShipmentForExpense] = useState<string | undefined>(undefined);

  // Add shipment to transit
  const [openAddShipment, setOpenAddShipment] = useState(false);
  const [shipmentIdToAdd, setShipmentIdToAdd] = useState('');
  const [shipmentReleaseToken, setShipmentReleaseToken] = useState('');
  const [showShipmentReleaseToken, setShowShipmentReleaseToken] = useState(false);
  const [addingShipment, setAddingShipment] = useState(false);
  const [availableShipments, setAvailableShipments] = useState<AssignableShipment[]>([]);
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [loadingAvailableShipments, setLoadingAvailableShipments] = useState(false);

  const fetchAvailableShipments = async (searchTerm = '') => {
    try {
      setLoadingAvailableShipments(true);
      const query = new URLSearchParams({
        status: 'RELEASED',
        limit: '50',
        page: '1',
      });

      if (searchTerm.trim()) {
        query.set('search', searchTerm.trim());
      }

      const response = await fetch(`/api/shipments?${query.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load shipments');
      }

      setAvailableShipments((data.shipments || []) as AssignableShipment[]);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load released shipments');
      setAvailableShipments([]);
    } finally {
      setLoadingAvailableShipments(false);
    }
  };

  const fetchTransit = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/transits/${transitId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch');
      setTransit(data.transit);
      setTotalExpenses(data.totalExpenses || 0);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load transit');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (transitId) void fetchTransit();
  }, [transitId]);

  useEffect(() => {
    if (!openAddShipment) return;

    const timer = setTimeout(() => {
      void fetchAvailableShipments(shipmentSearch);
    }, 250);

    return () => clearTimeout(timer);
  }, [openAddShipment, shipmentSearch]);

  const openEditDialog = () => {
    if (!transit) return;
    setEditForm({
      status: transit.status,
      dispatchDate: transit.dispatchDate ? transit.dispatchDate.slice(0, 10) : '',
      estimatedDelivery: transit.estimatedDelivery ? transit.estimatedDelivery.slice(0, 10) : '',
      actualDelivery: transit.actualDelivery ? transit.actualDelivery.slice(0, 10) : '',
      cost: transit.cost != null ? String(transit.cost) : '',
      notes: transit.notes || '',
    });
    setOpenEdit(true);
  };

  const handleEdit = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/transits/${transitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editForm.status,
          dispatchDate: editForm.dispatchDate || null,
          estimatedDelivery: editForm.estimatedDelivery || null,
          actualDelivery: editForm.actualDelivery || null,
          cost: editForm.cost ? parseFloat(editForm.cost) : null,
          notes: editForm.notes || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update');
      toast.success('Transit updated');
      setOpenEdit(false);
      await fetchTransit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleAddEvent = async () => {
    if (!eventForm.status.trim()) { toast.error('Status is required'); return; }
    try {
      setPostingEvent(true);
      const response = await fetch(`/api/transits/${transitId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: eventForm.status,
          location: eventForm.location || undefined,
          description: eventForm.description || undefined,
          eventDate: eventForm.eventDate || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add event');
      toast.success('Event added');
      setOpenEvent(false);
      setEventForm({ status: '', location: '', description: '', eventDate: new Date().toISOString().slice(0, 10) });
      await fetchTransit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add event');
    } finally {
      setPostingEvent(false);
    }
  };

  const handleAddShipment = async () => {
    if (!shipmentIdToAdd.trim()) { toast.error('Shipment selection is required'); return; }
    if (!shipmentReleaseToken.trim()) { toast.error('Release token is required'); return; }
    try {
      setAddingShipment(true);
      const response = await fetch(`/api/transits/${transitId}/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId: shipmentIdToAdd, releaseToken: shipmentReleaseToken.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add shipment');
      toast.success('Shipment added to transit');
      setOpenAddShipment(false);
      setShipmentIdToAdd('');
      setShipmentSearch('');
      setAvailableShipments([]);
      setShipmentReleaseToken('');
      await fetchTransit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add shipment');
    } finally {
      setAddingShipment(false);
    }
  };

  const handleCloseAddShipment = () => {
    if (addingShipment) return;
    setOpenAddShipment(false);
    setShipmentIdToAdd('');
    setShipmentSearch('');
    setAvailableShipments([]);
    setShipmentReleaseToken('');
    setShowShipmentReleaseToken(false);
  };

  const handleRemoveShipment = async (shipmentId: string) => {
    if (!confirm('Remove this shipment from the transit?')) return;
    try {
      const response = await fetch(`/api/transits/${transitId}/shipments?shipmentId=${shipmentId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to remove');
      toast.success('Shipment removed from transit');
      await fetchTransit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove shipment');
    }
  };

  const handleDeleteExpense = async (expense: TransitExpense) => {
    if (!confirm('Delete this expense? This will also reverse the ledger entries.')) return;
    try {
      let response;
      if (expense.source === 'SHIPMENT_EXPENSE') {
        // Delete shipment expense via ledger API
        response = await fetch(`/api/ledger/${expense.id}`, { method: 'DELETE' });
      } else {
        // Delete transit expense via transit API
        response = await fetch(`/api/transits/${transitId}/expenses?expenseId=${expense.id}`, { method: 'DELETE' });
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete expense');
      toast.success('Expense deleted');
      await fetchTransit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete expense');
    }
  };

  const shipmentColumns: Column<Shipment>[] = [
    {
      key: 'vehicleMake',
      header: 'Vehicle',
      render: (_, row) => (
        <Box>
          <Box sx={{ fontWeight: 600 }}>{`${row.vehicleYear || ''} ${row.vehicleMake || ''} ${row.vehicleModel || ''}`.trim() || 'Unknown'}</Box>
          <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.vehicleVIN || '-'}</Box>
        </Box>
      ),
    },
    {
      key: 'user',
      header: 'Customer',
      render: (_, row) => (
        <Box>
          <Box sx={{ fontWeight: 500 }}>{row.user.name || row.user.email}</Box>
          <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.user.phone || row.user.email}</Box>
        </Box>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, row) => {
        const color = row.status === 'IN_TRANSIT_TO_DESTINATION'
          ? { bg: 'rgba(99, 102, 241, 0.15)', text: 'rgb(99, 102, 241)', border: 'rgba(99, 102, 241, 0.3)' }
          : { bg: 'rgba(20, 184, 166, 0.15)', text: 'rgb(20, 184, 166)', border: 'rgba(20, 184, 166, 0.3)' };
        return (
          <span style={{ display: 'inline-flex', padding: '2px 10px', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 600, background: color.bg, color: color.text, border: `1px solid ${color.border}` }}>
            {row.status === 'IN_TRANSIT_TO_DESTINATION' ? 'In Transit' : row.status.replace(/_/g, ' ')}
          </span>
        );
      },
    },
    {
      key: 'id',
      header: 'Actions',
      render: (_, row) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
          <Tooltip title="Add expense">
            <IconButton
              size="small"
              onClick={() => {
                setSelectedShipmentForExpense(row.id);
                setShipmentExpenseModalOpen(true);
              }}
              sx={{ color: 'var(--accent-gold)' }}
            >
              <DollarSign className="w-4 h-4" />
            </IconButton>
          </Tooltip>
          <Tooltip title="View shipment">
            <IconButton size="small" component="a" href={`/dashboard/shipments/${row.id}`} target="_blank">
              <Package className="w-4 h-4" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Remove from transit">
            <IconButton size="small" color="error" onClick={() => void handleRemoveShipment(row.id)}>
              <Trash2 className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const eventColumns: Column<TransitEvent>[] = [
    { key: 'eventDate', header: 'Date', render: (_, row) => new Date(row.eventDate).toLocaleString() },
    { key: 'status', header: 'Status', render: (_, row) => <Box sx={{ fontWeight: 600 }}>{row.status}</Box> },
    { key: 'location', header: 'Location', render: (_, row) => row.location || '-' },
    { key: 'description', header: 'Description', render: (_, row) => row.description || '-' },
  ];

  const expenseColumns: Column<TransitExpense>[] = [
    { key: 'date', header: 'Date', render: (_, row) => new Date(row.date).toLocaleDateString() },
    {
      key: 'type',
      header: 'Type',
      render: (_, row) => (
        <Box>
          <Box sx={{ fontWeight: 500 }}>{row.type.replace(/_/g, ' ')}</Box>
          {row.vendor && <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.vendor}</Box>}
        </Box>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (_, row) => <span style={{ fontWeight: 600, color: 'var(--error)' }}>{formatCurrency(row.amount)}</span>,
    },
    {
      key: 'shipment',
      header: 'Shipment',
      render: (_, row) => row.shipment ? (
        <Box>
          <Box sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
            {[row.shipment.vehicleMake, row.shipment.vehicleModel].filter(Boolean).join(' ') || 'Vehicle'}
          </Box>
          {row.shipment.vehicleVIN && (
            <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.shipment.vehicleVIN}</Box>
          )}
        </Box>
      ) : (
        <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>General transit expense</Box>
      ),
    },
    {
      key: 'id',
      header: 'Actions',
      render: (_, row) => (
        <Tooltip title="Delete expense">
          <IconButton size="small" color="error" onClick={() => void handleDeleteExpense(row)}>
            <Trash2 className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  if (loading) {
    return (
      <AdminRoute>
        <DashboardSurface><TableSkeleton rows={8} /></DashboardSurface>
      </AdminRoute>
    );
  }

  if (!transit) {
    return (
      <AdminRoute>
        <DashboardSurface>
          <DashboardPanel title="Transit not found">
            <Box sx={{ color: 'var(--text-secondary)' }}>The requested transit could not be found.</Box>
            <Link href="/dashboard/transits"><Button variant="outline">Back to Transits</Button></Link>
          </DashboardPanel>
        </DashboardSurface>
      </AdminRoute>
    );
  }

  const statusColor = statusColors[transit.status] || statusColors.PENDING;

  return (
    <AdminRoute>
      <DashboardSurface>
        <Box sx={{ px: 2, pt: 2 }}>
          <Breadcrumbs />
        </Box>

        <DashboardPanel
          title={transit.referenceNumber}
          description={`${transit.origin} → ${transit.destination} • ${transit.company.name}`}
          actions={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Link href="/dashboard/transits" style={{ textDecoration: 'none' }}>
                <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
              </Link>
              <Button variant="outline" icon={<Pencil className="w-4 h-4" />} onClick={openEditDialog}>Edit</Button>
            </Box>
          }
        >
          <DashboardGrid className="grid-cols-2 md:grid-cols-4 mb-4">
            <StatsCard icon={<Truck className="w-5 h-5" />} title="Status" value={statusLabels[transit.status] || transit.status} variant="default" />
            <StatsCard icon={<Package className="w-5 h-5" />} title="Shipments" value={transit._count.shipments} variant="info" />
            <StatsCard icon={<DollarSign className="w-5 h-5" />} title="Total Expenses" value={formatCurrency(totalExpenses)} variant="error" />
            <StatsCard icon={<DollarSign className="w-5 h-5" />} title="Agreed Cost" value={transit.cost != null ? formatCurrency(transit.cost) : 'N/A'} variant="success" />
          </DashboardGrid>

          {/* Status Badge + Info */}
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 2, p: 2, borderRadius: 2, background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Box>
              <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>STATUS</Box>
              <span style={{ display: 'inline-flex', padding: '3px 12px', borderRadius: 9999, fontSize: '0.8rem', fontWeight: 600, background: statusColor.bg, color: statusColor.text, border: `1px solid ${statusColor.border}` }}>
                {statusLabels[transit.status] || transit.status}
              </span>
            </Box>
            <Box>
              <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>COMPANY</Box>
              <Box sx={{ fontWeight: 600 }}>{transit.company.name}</Box>
            </Box>
            {transit.dispatchDate && (
              <Box>
                <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>DISPATCHED</Box>
                <Box sx={{ fontWeight: 600 }}>{new Date(transit.dispatchDate).toLocaleDateString()}</Box>
              </Box>
            )}
            {transit.estimatedDelivery && (
              <Box>
                <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>EST. DELIVERY</Box>
                <Box sx={{ fontWeight: 600 }}>{new Date(transit.estimatedDelivery).toLocaleDateString()}</Box>
              </Box>
            )}
            {transit.actualDelivery && (
              <Box>
                <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>DELIVERED</Box>
                <Box sx={{ fontWeight: 600, color: 'var(--success)' }}>{new Date(transit.actualDelivery).toLocaleDateString()}</Box>
              </Box>
            )}
          </Box>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'var(--border)', mb: 2 }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': { textTransform: 'none', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', minHeight: 44, '&:hover': { color: 'var(--accent-gold)' } },
                '& .Mui-selected': { color: 'var(--accent-gold) !important' },
                '& .MuiTabs-indicator': { backgroundColor: 'var(--accent-gold)' },
              }}
            >
              <Tab icon={<Package className="h-4 w-4" />} iconPosition="start" label={`Shipments (${transit._count.shipments})`} />
              <Tab icon={<History className="h-4 w-4" />} iconPosition="start" label={`Events (${transit._count.events})`} />
              <Tab icon={<DollarSign className="h-4 w-4" />} iconPosition="start" label={`Expenses (${transit._count.expenses})`} />
              <Tab icon={<User className="h-4 w-4" />} iconPosition="start" label="Company Info" />
            </Tabs>
          </Box>

          <TabPanel value={activeTab} index={0}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
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
                <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setOpenAddShipment(true)}>
                  Add Shipment
                </Button>
              </Box>
            </Box>
            <DataTable data={transit.shipments} columns={shipmentColumns} keyField="id" />
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
              <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setOpenEvent(true)}>
                Add Event
              </Button>
            </Box>
            <DataTable data={transit.events} columns={eventColumns} keyField="id" />
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <Box sx={{ p: 2, background: 'var(--surface-secondary)', borderRadius: 2, border: '1px solid var(--border)' }}>
              <Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                💡 To add expenses for shipments in this transit, go to the <strong>Shipments</strong> tab and click the <DollarSign className="inline w-3.5 h-3.5" /> icon for each shipment.
              </Box>
            </Box>
            <Box sx={{ mt: 2 }}>
              <DataTable data={transit.expenses} columns={expenseColumns} keyField="id" />
            </Box>
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, p: 2, background: 'var(--surface)', borderRadius: 2, border: '1px solid var(--border)' }}>
              <Box><Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>COMPANY NAME</Box><Box sx={{ fontWeight: 600, mt: 0.5 }}>{transit.company.name}</Box></Box>
              {transit.company.code && <Box><Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CODE</Box><Box sx={{ fontWeight: 600, mt: 0.5 }}>{transit.company.code}</Box></Box>}
              {transit.company.phone && <Box><Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>PHONE</Box><Box sx={{ fontWeight: 600, mt: 0.5 }}>{transit.company.phone}</Box></Box>}
              {transit.company.email && <Box><Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>EMAIL</Box><Box sx={{ fontWeight: 600, mt: 0.5 }}>{transit.company.email}</Box></Box>}
            </Box>
            {transit.notes && (
              <Box sx={{ mt: 2, p: 2, background: 'var(--surface)', borderRadius: 2, border: '1px solid var(--border)' }}>
                <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>NOTES</Box>
                <Box sx={{ whiteSpace: 'pre-wrap' }}>{transit.notes}</Box>
              </Box>
            )}
          </TabPanel>
        </DashboardPanel>

        {/* Edit Transit Dialog */}
        <Dialog open={openEdit} onClose={() => !saving && setOpenEdit(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Transit</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1.5 }}>
            <TextField
              select
              label="Status"
              value={editForm.status}
              onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
            >
              {STATUS_OPTIONS.map(s => (
                <MenuItem key={s} value={s}>{statusLabels[s] || s}</MenuItem>
              ))}
            </TextField>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField label="Dispatch Date" type="date" InputLabelProps={{ shrink: true }} value={editForm.dispatchDate} onChange={(e) => setEditForm(prev => ({ ...prev, dispatchDate: e.target.value }))} />
              <TextField label="Est. Delivery" type="date" InputLabelProps={{ shrink: true }} value={editForm.estimatedDelivery} onChange={(e) => setEditForm(prev => ({ ...prev, estimatedDelivery: e.target.value }))} />
            </Box>
            <TextField label="Actual Delivery" type="date" InputLabelProps={{ shrink: true }} value={editForm.actualDelivery} onChange={(e) => setEditForm(prev => ({ ...prev, actualDelivery: e.target.value }))} />
            <TextField label="Agreed Cost (USD)" type="number" inputProps={{ min: 0, step: 0.01 }} value={editForm.cost} onChange={(e) => setEditForm(prev => ({ ...prev, cost: e.target.value }))} />
            <TextField label="Notes" multiline rows={3} value={editForm.notes} onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))} />
          </DialogContent>
          <DialogActions>
            <Button variant="outline" onClick={() => setOpenEdit(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleEdit} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </DialogActions>
        </Dialog>

        {/* Add Event Dialog */}
        <Dialog open={openEvent} onClose={() => !postingEvent && setOpenEvent(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add Transit Event</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1.5 }}>
            <TextField label="Status / Event" value={eventForm.status} onChange={(e) => setEventForm(prev => ({ ...prev, status: e.target.value }))} required placeholder="e.g. Loaded, Border Crossed, Arrived Kabul" />
            <TextField label="Location" value={eventForm.location} onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))} placeholder="e.g. Islam Qala Border" />
            <TextField label="Description" multiline rows={2} value={eventForm.description} onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))} />
            <TextField label="Event Date" type="datetime-local" InputLabelProps={{ shrink: true }} value={eventForm.eventDate} onChange={(e) => setEventForm(prev => ({ ...prev, eventDate: e.target.value }))} />
          </DialogContent>
          <DialogActions>
            <Button variant="outline" onClick={() => setOpenEvent(false)} disabled={postingEvent}>Cancel</Button>
            <Button variant="primary" onClick={handleAddEvent} disabled={postingEvent}>{postingEvent ? 'Adding...' : 'Add Event'}</Button>
          </DialogActions>
        </Dialog>

        {/* Add Shipment Expense Modal */}
        <AddShipmentExpenseModal
          open={shipmentExpenseModalOpen}
          onClose={() => {
            setShipmentExpenseModalOpen(false);
            setSelectedShipmentForExpense(undefined);
          }}
          shipmentId={selectedShipmentForExpense}
          shipments={selectedShipmentForExpense ? undefined : transit.shipments.map((s) => ({
            id: s.id,
            vehicleMake: s.vehicleMake,
            vehicleModel: s.vehicleModel,
            vehicleVIN: s.vehicleVIN,
            user: s.user,
          }))}
          contextType="TRANSIT"
          contextId={transitId}
          onSuccess={() => void fetchTransit()}
        />

        {/* Add Shipment Dialog */}
        <Dialog open={openAddShipment} onClose={handleCloseAddShipment} maxWidth="xs" fullWidth>
          <DialogTitle>Add Shipment to Transit</DialogTitle>
          <DialogContent sx={{ pt: 1.5 }}>
            <Autocomplete
              options={availableShipments}
              loading={loadingAvailableShipments}
              value={availableShipments.find((shipment) => shipment.id === shipmentIdToAdd) || null}
              onChange={(_, value) => setShipmentIdToAdd(value?.id || '')}
              onInputChange={(_, value) => setShipmentSearch(value)}
              getOptionLabel={(option) => {
                const vehicle = `${option.vehicleYear || ''} ${option.vehicleMake || ''} ${option.vehicleModel || ''}`.trim() || 'Vehicle';
                const vin = option.vehicleVIN ? ` - VIN ${option.vehicleVIN}` : '';
                return `${vehicle}${vin}`;
              }}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText="No released shipments found"
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box>
                    <Box sx={{ fontWeight: 600 }}>
                      {`${option.vehicleYear || ''} ${option.vehicleMake || ''} ${option.vehicleModel || ''}`.trim() || 'Vehicle'}
                    </Box>
                    <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {option.vehicleVIN ? `VIN ${option.vehicleVIN}` : option.id}
                    </Box>
                    <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {option.user.name || option.user.email}
                    </Box>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  label="Shipment"
                  helperText="Search and select a released shipment"
                  sx={{ mb: 2 }}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingAvailableShipments ? <CircularProgress color="inherit" size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <TextField
              fullWidth
              label="Release Token"
              type={showShipmentReleaseToken ? 'text' : 'password'}
              value={shipmentReleaseToken}
              onChange={(e) => setShipmentReleaseToken(e.target.value)}
              helperText="Paste the shipment release token for verification"
              InputProps={{
                endAdornment: (
                  <button
                    type="button"
                    onClick={() => setShowShipmentReleaseToken((prev) => !prev)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
                  >
                    {showShipmentReleaseToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                ),
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button variant="outline" onClick={handleCloseAddShipment} disabled={addingShipment}>Cancel</Button>
            <Button variant="primary" onClick={handleAddShipment} disabled={addingShipment}>{addingShipment ? 'Adding...' : 'Add'}</Button>
          </DialogActions>
        </Dialog>


      </DashboardSurface>
    </AdminRoute>
  );
}
