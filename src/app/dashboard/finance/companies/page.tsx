'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { Building2, Plus, Search } from 'lucide-react';
import AdminRoute from '@/components/auth/AdminRoute';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Breadcrumbs, Button, StatsCard, toast } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';

interface Company {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  currentBalance: number;
  totalDebit: number;
  totalCredit: number;
  _count: {
    ledgerEntries: number;
  };
}

export default function CompanyFinancePage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    address: '',
    country: '',
    notes: '',
  });

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const response = await fetch(`/api/finance/companies?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch companies');
      }

      setCompanies(data.companies || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCompanies();
  }, [search]);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Company name is required');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/finance/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create company');
      }

      toast.success('Company created');
      setOpenCreate(false);
      setFormData({
        name: '',
        code: '',
        email: '',
        phone: '',
        address: '',
        country: '',
        notes: '',
      });
      await fetchCompanies();
    } catch (error) {
      console.error('Error creating company:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create company');
    } finally {
      setCreating(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const stats = useMemo(() => {
    const totalDebit = companies.reduce((sum, company) => sum + company.totalDebit, 0);
    const totalCredit = companies.reduce((sum, company) => sum + company.totalCredit, 0);
    const netBalance = companies.reduce((sum, company) => sum + company.currentBalance, 0);

    return {
      companies: companies.length,
      totalDebit,
      totalCredit,
      netBalance,
    };
  }, [companies]);

  const columns = useMemo<Column<Company>[]>(
    () => [
      {
        key: 'name',
        header: 'Company',
        sortable: true,
        render: (_, row) => (
          <Box>
            <Box sx={{ fontWeight: 600 }}>{row.name}</Box>
            <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {row.code || row.email || 'No reference'}
            </Box>
          </Box>
        ),
      },
      {
        key: 'phone',
        header: 'Contact',
        render: (_, row) => row.phone || row.email || '-',
      },
      {
        key: 'totalDebit',
        header: 'Total Debit',
        align: 'right',
        render: (_, row) => formatCurrency(row.totalDebit),
      },
      {
        key: 'totalCredit',
        header: 'Total Credit',
        align: 'right',
        render: (_, row) => formatCurrency(row.totalCredit),
      },
      {
        key: 'currentBalance',
        header: 'Balance',
        align: 'right',
        render: (_, row) => (
          <span style={{ color: row.currentBalance >= 0 ? 'var(--text-primary)' : 'var(--error)', fontWeight: 600 }}>
            {formatCurrency(row.currentBalance)}
          </span>
        ),
      },
      {
        key: '_count',
        header: 'Transactions',
        align: 'center',
        render: (_, row) => row._count.ledgerEntries,
      },
    ],
    []
  );

  return (
    <AdminRoute>
      <DashboardSurface>
        <Box sx={{ px: 2, pt: 2 }}>
          <Breadcrumbs />
        </Box>

        <DashboardPanel
          title="Company Finance Ledgers"
          description="Create and manage ledgers for partner companies"
          actions={
            <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setOpenCreate(true)}>
              Add Company
            </Button>
          }
        >
          <DashboardGrid className="grid-cols-1 md:grid-cols-4 mb-4">
            <StatsCard icon={<Building2 className="w-5 h-5" />} title="Companies" value={stats.companies} variant="default" />
            <StatsCard icon={<Building2 className="w-5 h-5" />} title="Total Debit" value={formatCurrency(stats.totalDebit)} variant="error" />
            <StatsCard icon={<Building2 className="w-5 h-5" />} title="Total Credit" value={formatCurrency(stats.totalCredit)} variant="success" />
            <StatsCard icon={<Building2 className="w-5 h-5" />} title="Net Balance" value={formatCurrency(stats.netBalance)} variant="info" />
          </DashboardGrid>

          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search company by name, code, email"
              InputProps={{
                startAdornment: <Search className="w-4 h-4 mr-2 text-[var(--text-secondary)]" />,
              }}
            />
          </Box>

          {loading ? (
            <Box sx={{ py: 3, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading companies...</Box>
          ) : (
            <DataTable
              data={companies}
              columns={columns}
              keyField="id"
              onRowClick={(row) => router.push(`/dashboard/finance/companies/${row.id}`)}
            />
          )}
        </DashboardPanel>

        <Dialog open={openCreate} onClose={() => !creating && setOpenCreate(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create Company Ledger</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1.5 }}>
            <TextField label="Company Name" value={formData.name} onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))} required />
            <TextField label="Code" value={formData.code} onChange={(event) => setFormData((prev) => ({ ...prev, code: event.target.value }))} />
            <TextField label="Email" value={formData.email} onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))} />
            <TextField label="Phone" value={formData.phone} onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))} />
            <TextField label="Address" value={formData.address} onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))} />
            <TextField label="Country" value={formData.country} onChange={(event) => setFormData((prev) => ({ ...prev, country: event.target.value }))} />
            <TextField label="Notes" multiline rows={3} value={formData.notes} onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))} />
          </DialogContent>
          <DialogActions>
            <Button variant="outline" onClick={() => setOpenCreate(false)} disabled={creating}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create'}</Button>
          </DialogActions>
        </Dialog>
      </DashboardSurface>
    </AdminRoute>
  );
}
