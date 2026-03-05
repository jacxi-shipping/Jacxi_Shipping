'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
  Tooltip,
} from '@mui/material';
import { ArrowLeft, Building2, DollarSign, Pencil, Plus, ReceiptText, Trash2 } from 'lucide-react';
import AdminRoute from '@/components/auth/AdminRoute';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Breadcrumbs, Button, StatsCard, toast, TableSkeleton } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';

interface Company {
  id: string;
  name: string;
  code: string | null;
  companyType: 'SHIPPING' | 'TRANSIT';
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  notes: string | null;
  isActive: boolean;
  _count?: {
    ledgerEntries: number;
    containers: number;
    shipments: number;
    transits: number;
  };
  containers?: Array<{
    id: string;
    containerNumber: string;
    status: string;
    currentCount: number;
    maxCapacity: number;
    createdAt: string;
  }>;
  shipments?: Array<{
    id: string;
    vehicleVIN: string | null;
    vehicleMake: string | null;
    vehicleModel: string | null;
    status: string;
    createdAt: string;
    transitId: string | null;
  }>;
  transits?: Array<{
    id: string;
    referenceNumber: string;
    status: string;
    origin: string;
    destination: string;
    createdAt: string;
    _count: {
      shipments: number;
    };
  }>;
}

interface CompanySummary {
  totalDebit: number;
  totalCredit: number;
  currentBalance: number;
}

interface LedgerEntry {
  id: string;
  transactionDate: string;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  balance: number;
  category?: string | null;
  reference?: string | null;
  notes?: string | null;
}

interface CompanyReport {
  summary: {
    transactionCount: number;
    totalDebit: number;
    totalCredit: number;
    netMovement: number;
    currentBalance: number;
  };
  monthlyBreakdown?: Array<{
    month: string;
    debit: number;
    credit: number;
    net: number;
  }>;
}

export default function CompanyLedgerDetailPage() {
  const params = useParams();
  const companyId = String(params.id || '');

  const [company, setCompany] = useState<Company | null>(null);
  const [summary, setSummary] = useState<CompanySummary>({ totalDebit: 0, totalCredit: 0, currentBalance: 0 });
  const [report, setReport] = useState<CompanyReport | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [openEntry, setOpenEntry] = useState(false);
  const [filters, setFilters] = useState({ search: '', type: '' });
  const [formData, setFormData] = useState({
    description: '',
    type: 'DEBIT',
    amount: '',
    transactionDate: new Date().toISOString().slice(0, 10),
    category: '',
    reference: '',
    notes: '',
  });

  // Edit entry state
  const [openEditEntry, setOpenEditEntry] = useState(false);
  const [editEntry, setEditEntry] = useState<LedgerEntry | null>(null);
  const [editForm, setEditForm] = useState({
    description: '',
    type: 'DEBIT',
    amount: '',
    transactionDate: new Date().toISOString().slice(0, 10),
    category: '',
    reference: '',
    notes: '',
  });
  const [updating, setUpdating] = useState(false);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const fetchCompany = async () => {
    const response = await fetch(`/api/finance/companies/${companyId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch company');
    }

    setCompany(data.company);
    setSummary(data.summary);
  };

  const fetchLedger = async () => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.type) params.append('type', filters.type);

    const response = await fetch(`/api/finance/companies/${companyId}/ledger?${params}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch ledger entries');
    }

    setEntries(data.entries || []);
    setSummary(data.summary || { totalDebit: 0, totalCredit: 0, currentBalance: 0 });
  };

  const fetchReport = async () => {
    const response = await fetch(`/api/finance/companies/${companyId}/reports`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch report');
    }

    setReport(data);
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchCompany(), fetchLedger(), fetchReport()]);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load company ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      void fetchAll();
    }
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    void fetchLedger();
  }, [filters.search, filters.type]);

  const handleCreateEntry = async () => {
    if (!formData.description.trim()) {
      toast.error('Description is required');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    try {
      setPosting(true);
      const response = await fetch(`/api/finance/companies/${companyId}/ledger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formData.description,
          type: formData.type,
          amount,
          transactionDate: formData.transactionDate,
          category: formData.category || undefined,
          reference: formData.reference || undefined,
          notes: formData.notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create transaction');
      }

      toast.success('Transaction created');
      setOpenEntry(false);
      setFormData({
        description: '',
        type: 'DEBIT',
        amount: '',
        transactionDate: new Date().toISOString().slice(0, 10),
        category: '',
        reference: '',
        notes: '',
      });

      await Promise.all([fetchLedger(), fetchReport()]);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to create transaction');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Delete this transaction?')) return;

    try {
      const response = await fetch(`/api/finance/companies/ledger/${entryId}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete transaction');
      }

      toast.success('Transaction deleted');
      await Promise.all([fetchLedger(), fetchReport()]);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete transaction');
    }
  };

  const openEditEntryDialog = (entry: LedgerEntry, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditEntry(entry);
    setEditForm({
      description: entry.description,
      type: entry.type,
      amount: String(entry.amount),
      transactionDate: new Date(entry.transactionDate).toISOString().slice(0, 10),
      category: entry.category || '',
      reference: entry.reference || '',
      notes: entry.notes || '',
    });
    setOpenEditEntry(true);
  };

  const handleEditEntry = async () => {
    if (!editEntry) return;

    if (!editForm.description.trim()) {
      toast.error('Description is required');
      return;
    }

    const amount = parseFloat(editForm.amount);
    if (!amount || amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    try {
      setUpdating(true);
      const response = await fetch(`/api/finance/companies/ledger/${editEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editForm.description,
          type: editForm.type,
          amount,
          transactionDate: editForm.transactionDate,
          category: editForm.category || null,
          reference: editForm.reference || null,
          notes: editForm.notes || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update transaction');
      }

      toast.success('Transaction updated');
      setOpenEditEntry(false);
      setEditEntry(null);
      await Promise.all([fetchLedger(), fetchReport()]);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to update transaction');
    } finally {
      setUpdating(false);
    }
  };

  const columns = useMemo<Column<LedgerEntry>[]>(
    () => [
      {
        key: 'transactionDate',
        header: 'Date',
        sortable: true,
        render: (_, row) => new Date(row.transactionDate).toLocaleDateString(),
      },
      {
        key: 'description',
        header: 'Description',
        sortable: true,
        render: (_, row) => (
          <Box>
            <Box sx={{ fontWeight: 500 }}>{row.description}</Box>
            <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {row.category || 'General'}{row.reference ? ` • Ref: ${row.reference}` : ''}
            </Box>
          </Box>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        align: 'center',
        render: (_, row) => row.type,
      },
      {
        key: 'amount',
        header: 'Amount',
        align: 'right',
        render: (_, row) => (
          <span style={{ color: row.type === 'DEBIT' ? 'var(--error)' : '#22c55e', fontWeight: 600 }}>
            {row.type === 'DEBIT' ? '+' : '-'}{formatCurrency(row.amount)}
          </span>
        ),
      },
      {
        key: 'balance',
        header: 'Balance',
        align: 'right',
        render: (_, row) => <span style={{ fontWeight: 600 }}>{formatCurrency(row.balance)}</span>,
      },
      {
        key: 'id',
        header: 'Actions',
        align: 'center',
        render: (_, row) => (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
            <Tooltip title="Edit transaction">
              <IconButton
                size="small"
                onClick={(event) => openEditEntryDialog(row, event)}
              >
                <Pencil className="w-4 h-4" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete transaction">
              <IconButton
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  void handleDeleteEntry(row.id);
                }}
                color="error"
              >
                <Trash2 className="w-4 h-4" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    []
  );

  if (loading) {
    return (
      <AdminRoute>
        <DashboardSurface>
          <TableSkeleton rows={8} />
        </DashboardSurface>
      </AdminRoute>
    );
  }

  if (!company) {
    return (
      <AdminRoute>
        <DashboardSurface>
          <DashboardPanel title="Company not found">
            <Box sx={{ color: 'var(--text-secondary)' }}>The requested company could not be loaded.</Box>
          </DashboardPanel>
        </DashboardSurface>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <DashboardSurface>
        <Box sx={{ px: 2, pt: 2 }}>
          <Breadcrumbs />
        </Box>

        <DashboardPanel
          title={company.name}
          description={`${company.companyType === 'SHIPPING' ? 'Shipping' : 'Transit'} Company Ledger${company.code ? ` • ${company.code}` : ''}`}
          actions={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Link href="/dashboard/finance/companies" style={{ textDecoration: 'none' }}>
                <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
              </Link>
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setOpenEntry(true)}>
                Add Transaction
              </Button>
            </Box>
          }
        >
          <DashboardGrid className="grid-cols-1 md:grid-cols-4 mb-4">
            <StatsCard icon={<DollarSign className="w-5 h-5" />} title="Total Debit" value={formatCurrency(summary.totalDebit)} variant="error" />
            <StatsCard icon={<DollarSign className="w-5 h-5" />} title="Total Credit" value={formatCurrency(summary.totalCredit)} variant="success" />
            <StatsCard icon={<Building2 className="w-5 h-5" />} title="Current Balance" value={formatCurrency(summary.currentBalance)} variant="info" />
            <StatsCard icon={<ReceiptText className="w-5 h-5" />} title="Transactions" value={report?.summary.transactionCount || entries.length} variant="default" />
          </DashboardGrid>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 180px' }, gap: 1.5, mb: 2 }}>
            <TextField
              size="small"
              placeholder="Search description / category / notes"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            />
            <TextField
              select
              size="small"
              value={filters.type}
              onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="DEBIT">DEBIT</MenuItem>
              <MenuItem value="CREDIT">CREDIT</MenuItem>
            </TextField>
          </Box>

          <DataTable data={entries} columns={columns} keyField="id" />
        </DashboardPanel>

        {company.companyType === 'SHIPPING' && (
          <DashboardPanel
            title="Shipping Operations"
            description="Containers and shipments linked to this shipping company"
          >
            <DashboardGrid className="grid-cols-1 md:grid-cols-2 mb-4">
              <StatsCard icon={<Building2 className="w-5 h-5" />} title="Containers" value={company._count?.containers || 0} variant="default" />
              <StatsCard icon={<ReceiptText className="w-5 h-5" />} title="Shipments" value={company._count?.shipments || 0} variant="info" />
            </DashboardGrid>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ fontWeight: 600, mb: 1 }}>Recent Containers</Box>
              <DataTable
                data={company.containers || []}
                keyField="id"
                columns={[
                  { key: 'containerNumber', header: 'Container', sortable: true },
                  { key: 'status', header: 'Status', sortable: true },
                  {
                    key: 'currentCount',
                    header: 'Capacity',
                    render: (_, row) => `${row.currentCount}/${row.maxCapacity}`,
                  },
                  {
                    key: 'createdAt',
                    header: 'Created',
                    render: (_, row) => new Date(row.createdAt).toLocaleDateString(),
                  },
                ]}
              />
            </Box>

            <Box>
              <Box sx={{ fontWeight: 600, mb: 1 }}>Recent Shipments</Box>
              <DataTable
                data={company.shipments || []}
                keyField="id"
                columns={[
                  {
                    key: 'vehicleVIN',
                    header: 'Vehicle',
                    render: (_, row) => row.vehicleVIN || [row.vehicleMake, row.vehicleModel].filter(Boolean).join(' ') || '-',
                  },
                  { key: 'status', header: 'Status', sortable: true },
                  {
                    key: 'createdAt',
                    header: 'Created',
                    render: (_, row) => new Date(row.createdAt).toLocaleDateString(),
                  },
                ]}
              />
            </Box>
          </DashboardPanel>
        )}

        {company.companyType === 'TRANSIT' && (
          <DashboardPanel
            title="Transit Operations"
            description="Transits and assigned shipments linked to this transit company"
          >
            <DashboardGrid className="grid-cols-1 md:grid-cols-2 mb-4">
              <StatsCard icon={<Building2 className="w-5 h-5" />} title="Transits" value={company._count?.transits || 0} variant="default" />
              <StatsCard icon={<ReceiptText className="w-5 h-5" />} title="Shipments" value={(company.shipments || []).filter((shipment) => Boolean(shipment.transitId)).length} variant="info" />
            </DashboardGrid>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ fontWeight: 600, mb: 1 }}>Recent Transits</Box>
              <DataTable
                data={company.transits || []}
                keyField="id"
                columns={[
                  { key: 'referenceNumber', header: 'Reference', sortable: true },
                  {
                    key: 'origin',
                    header: 'Route',
                    render: (_, row) => `${row.origin} -> ${row.destination}`,
                  },
                  { key: 'status', header: 'Status', sortable: true },
                  {
                    key: '_count',
                    header: 'Shipments',
                    render: (_, row) => row._count.shipments,
                  },
                ]}
              />
            </Box>

            <Box>
              <Box sx={{ fontWeight: 600, mb: 1 }}>Transit Shipments</Box>
              <DataTable
                data={(company.shipments || []).filter((shipment) => Boolean(shipment.transitId))}
                keyField="id"
                columns={[
                  {
                    key: 'vehicleVIN',
                    header: 'Vehicle',
                    render: (_, row) => row.vehicleVIN || [row.vehicleMake, row.vehicleModel].filter(Boolean).join(' ') || '-',
                  },
                  { key: 'status', header: 'Status', sortable: true },
                  {
                    key: 'createdAt',
                    header: 'Created',
                    render: (_, row) => new Date(row.createdAt).toLocaleDateString(),
                  },
                ]}
              />
            </Box>
          </DashboardPanel>
        )}

        {report && report.summary.transactionCount > 0 && (
          <DashboardPanel title="Monthly Report" description="Transaction breakdown by month">
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Month</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Debit</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Credit</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {report.monthlyBreakdown?.map((row) => (
                    <tr key={row.month} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 500 }}>{row.month}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--error)' }}>{formatCurrency(row.debit)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--success)' }}>{formatCurrency(row.credit)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: row.net >= 0 ? 'var(--text-primary)' : 'var(--error)' }}>
                        {formatCurrency(row.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </DashboardPanel>
        )}

        <Dialog open={openEntry} onClose={() => !posting && setOpenEntry(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add Company Transaction</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1.5 }}>
            <TextField label="Description" value={formData.description} onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))} required />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField select label="Type" value={formData.type} onChange={(event) => setFormData((prev) => ({ ...prev, type: event.target.value }))}>
                <MenuItem value="DEBIT">DEBIT</MenuItem>
                <MenuItem value="CREDIT">CREDIT</MenuItem>
              </TextField>
              <TextField label="Amount" type="number" inputProps={{ min: 0.01, step: 0.01 }} value={formData.amount} onChange={(event) => setFormData((prev) => ({ ...prev, amount: event.target.value }))} />
            </Box>
            <TextField label="Transaction Date" type="date" InputLabelProps={{ shrink: true }} value={formData.transactionDate} onChange={(event) => setFormData((prev) => ({ ...prev, transactionDate: event.target.value }))} />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField label="Category" value={formData.category} onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))} />
              <TextField label="Reference" value={formData.reference} onChange={(event) => setFormData((prev) => ({ ...prev, reference: event.target.value }))} />
            </Box>
            <TextField label="Notes" rows={3} multiline value={formData.notes} onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))} />
          </DialogContent>
          <DialogActions>
            <Button variant="outline" onClick={() => setOpenEntry(false)} disabled={posting}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateEntry} disabled={posting}>{posting ? 'Saving...' : 'Save Transaction'}</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openEditEntry} onClose={() => !updating && setOpenEditEntry(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1.5 }}>
            <TextField label="Description" value={editForm.description} onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))} required />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField select label="Type" value={editForm.type} onChange={(event) => setEditForm((prev) => ({ ...prev, type: event.target.value }))}>
                <MenuItem value="DEBIT">DEBIT</MenuItem>
                <MenuItem value="CREDIT">CREDIT</MenuItem>
              </TextField>
              <TextField label="Amount" type="number" inputProps={{ min: 0.01, step: 0.01 }} value={editForm.amount} onChange={(event) => setEditForm((prev) => ({ ...prev, amount: event.target.value }))} />
            </Box>
            <TextField label="Transaction Date" type="date" InputLabelProps={{ shrink: true }} value={editForm.transactionDate} onChange={(event) => setEditForm((prev) => ({ ...prev, transactionDate: event.target.value }))} />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField label="Category" value={editForm.category} onChange={(event) => setEditForm((prev) => ({ ...prev, category: event.target.value }))} />
              <TextField label="Reference" value={editForm.reference} onChange={(event) => setEditForm((prev) => ({ ...prev, reference: event.target.value }))} />
            </Box>
            <TextField label="Notes" rows={3} multiline value={editForm.notes} onChange={(event) => setEditForm((prev) => ({ ...prev, notes: event.target.value }))} />
          </DialogContent>
          <DialogActions>
            <Button variant="outline" onClick={() => setOpenEditEntry(false)} disabled={updating}>Cancel</Button>
            <Button variant="primary" onClick={handleEditEntry} disabled={updating}>{updating ? 'Saving...' : 'Save Changes'}</Button>
          </DialogActions>
        </Dialog>
      </DashboardSurface>
    </AdminRoute>
  );
}
