'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowBack,
  Add,
  Edit,
  Delete,
  Download,
  Print,
  FilterList,
  Search,
  ChevronLeft,
  ChevronRight,
  AttachMoney,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Close,
  Check,
  AccountBalance,
} from '@mui/icons-material';
import {
  Button,
  Box,
  CircularProgress,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  Snackbar,
  Chip,
} from '@mui/material';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import StatsCard from '@/components/dashboard/StatsCard';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface LedgerEntry {
  id: string;
  transactionDate: string;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  balance: number;
  notes?: string;
  shipment?: {
    id: string;
    vehicleMake?: string;
    vehicleModel?: string;
  };
}

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface LedgerSummary {
  totalDebit: number;
  totalCredit: number;
  currentBalance: number;
}

export default function UserLedgerManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary>({
    totalDebit: 0,
    totalCredit: 0,
    currentBalance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    startDate: '',
    endDate: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [formData, setFormData] = useState({
    description: '',
    type: 'DEBIT' as 'DEBIT' | 'CREDIT',
    amount: '',
    notes: '',
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.replace('/auth/signin');
      return;
    }
    if (session.user?.role !== 'admin') {
      router.replace('/dashboard/finance/ledger');
      return;
    }
    fetchUser();
    fetchLedgerEntries();
  }, [session, status, router, userId, page, filters]);

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchLedgerEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        userId,
        page: page.toString(),
        limit: '20',
        ...(filters.search && { search: filters.search }),
        ...(filters.type && { type: filters.type }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      const response = await fetch(`/api/ledger?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch ledger entries');
      }

      const data = await response.json();
      setEntries(data.entries);
      setSummary(data.summary);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching ledger:', error);
      setSnackbar({ open: true, message: 'Failed to load ledger', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          description: formData.description,
          type: formData.type,
          amount: parseFloat(formData.amount),
          notes: formData.notes,
        }),
      });

      if (response.ok) {
        setSnackbar({ open: true, message: 'Transaction added successfully', severity: 'success' });
        setShowAddModal(false);
        setFormData({ description: '', type: 'DEBIT', amount: '', notes: '' });
        fetchLedgerEntries();
      } else {
        const error = await response.json();
        setSnackbar({ open: true, message: error.error || 'Failed to add transaction', severity: 'error' });
      }
    } catch (error) {
      console.error('Error adding entry:', error);
      setSnackbar({ open: true, message: 'An error occurred', severity: 'error' });
    }
  };

  const handleEditEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry) return;

    try {
      const response = await fetch(`/api/ledger/${selectedEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formData.description,
          notes: formData.notes,
        }),
      });

      if (response.ok) {
        setSnackbar({ open: true, message: 'Transaction updated successfully', severity: 'success' });
        setShowEditModal(false);
        setSelectedEntry(null);
        setFormData({ description: '', type: 'DEBIT', amount: '', notes: '' });
        fetchLedgerEntries();
      } else {
        const error = await response.json();
        setSnackbar({ open: true, message: error.error || 'Failed to update transaction', severity: 'error' });
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      setSnackbar({ open: true, message: 'An error occurred', severity: 'error' });
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/ledger/${entryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSnackbar({ open: true, message: 'Transaction deleted successfully', severity: 'success' });
        fetchLedgerEntries();
      } else {
        const error = await response.json();
        setSnackbar({ open: true, message: error.error || 'Failed to delete transaction', severity: 'error' });
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      setSnackbar({ open: true, message: 'An error occurred', severity: 'error' });
    }
  };

  const openEditModal = (entry: LedgerEntry) => {
    setSelectedEntry(entry);
    setFormData({
      description: entry.description,
      type: entry.type,
      amount: entry.amount.toString(),
      notes: entry.notes || '',
    });
    setShowEditModal(true);
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      const params = new URLSearchParams({
        userId,
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      const endpoint = format === 'pdf' ? '/api/ledger/export-pdf' : '/api/ledger/export';
      const response = await fetch(`${endpoint}?${params}`);

      if (!response.ok) throw new Error('Failed to export ledger');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ledger-${user?.name || 'user'}-${Date.now()}.${format === 'pdf' ? 'html' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSnackbar({ open: true, message: 'Ledger exported successfully', severity: 'success' });
    } catch (error) {
      console.error('Error exporting ledger:', error);
      setSnackbar({ open: true, message: 'Failed to export ledger', severity: 'error' });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return '#ef4444';
    if (balance < 0) return '#22c55e';
    return 'var(--text-secondary)';
  };

  if (status === 'loading' || loading || !user) {
    return (
      <ProtectedRoute>
        <DashboardSurface>
          <Box sx={{ minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress size={40} sx={{ color: 'var(--accent-gold)' }} />
          </Box>
        </DashboardSurface>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardSurface>
        {/* Back Button & Title */}
        <Box sx={{ mb: 2 }}>
          <Link href="/dashboard/finance/admin/ledgers" style={{ textDecoration: 'none' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ArrowBack />}
              sx={{ textTransform: 'none', fontSize: '0.78rem', mb: 2 }}
            >
              Back to All Ledgers
            </Button>
          </Link>
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {user.name || user.email}'s Ledger
          </Typography>
          <Typography sx={{ fontSize: '0.9rem', color: 'var(--text-secondary)', mt: 0.5 }}>
            Manage financial transactions for {user.email}
          </Typography>
        </Box>

        {/* Summary Cards */}
        <DashboardGrid className="grid-cols-1 md:grid-cols-3">
          <StatsCard
            icon={summary.currentBalance > 0 ? TrendingUpIcon : summary.currentBalance < 0 ? TrendingDownIcon : AttachMoney}
            title="Current Balance"
            value={formatCurrency(summary.currentBalance)}
            subtitle={summary.currentBalance > 0 ? 'Amount Owed' : summary.currentBalance < 0 ? 'Credit Balance' : 'Settled'}
          />
          <StatsCard
            icon={TrendingUpIcon}
            title="Total Debits"
            value={formatCurrency(summary.totalDebit)}
            subtitle="Amount charged"
          />
          <StatsCard
            icon={TrendingDownIcon}
            title="Total Credits"
            value={formatCurrency(summary.totalCredit)}
            subtitle="Amount paid"
          />
        </DashboardGrid>

        {/* Filters Panel */}
        <DashboardPanel
          title="Filters & Actions"
          description="Search and filter transactions"
          actions={
            <Button
              variant="contained"
              size="small"
              onClick={() => setShowAddModal(true)}
              startIcon={<Add />}
              sx={{ textTransform: 'none', fontSize: '0.78rem', fontWeight: 600 }}
            >
              Add Transaction
            </Button>
          }
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                placeholder="Search transactions..."
                size="small"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'var(--text-secondary)', fontSize: 20 }} />,
                }}
                fullWidth
              />
              <Button
                variant="outlined"
                size="small"
                onClick={() => setShowFilters(!showFilters)}
                startIcon={<FilterList />}
                sx={{ textTransform: 'none', fontSize: '0.75rem', minWidth: 120 }}
              >
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
            </Box>

            {showFilters && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    label="Type"
                  >
                    <MenuItem value="">All Types</MenuItem>
                    <MenuItem value="DEBIT">Debit Only</MenuItem>
                    <MenuItem value="CREDIT">Credit Only</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Start Date"
                  type="date"
                  size="small"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="End Date"
                  type="date"
                  size="small"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => window.print()}
                startIcon={<Print />}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                Print
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleExport('pdf')}
                startIcon={<Download />}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                PDF
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleExport('excel')}
                startIcon={<Download />}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                Excel
              </Button>
            </Box>
          </Box>
        </DashboardPanel>

        {/* Transactions Table */}
        <DashboardPanel
          title="Transaction History"
          description={`${entries.length} transaction${entries.length !== 1 ? 's' : ''} found`}
          fullHeight
        >
          {entries.length === 0 ? (
            <Box sx={{ minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <AccountBalance sx={{ fontSize: 48, color: 'var(--text-secondary)', opacity: 0.5 }} />
              <Typography sx={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                No transactions found
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Date</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Description</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Type</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Amount</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Balance</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {formatDate(entry.transactionDate)}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <Typography sx={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                            {entry.description}
                          </Typography>
                          {entry.notes && (
                            <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mt: 0.5 }}>
                              {entry.notes}
                            </Typography>
                          )}
                          {entry.shipment && (
                            <Typography sx={{ fontSize: '0.75rem', color: 'var(--accent-gold)', mt: 0.5 }}>
                              {entry.shipment.vehicleMake} {entry.shipment.vehicleModel}
                            </Typography>
                          )}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          <Chip
                            label={entry.type}
                            size="small"
                            icon={entry.type === 'DEBIT' ? <TrendingUpIcon /> : <TrendingDownIcon />}
                            sx={{
                              backgroundColor: entry.type === 'DEBIT' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                              color: entry.type === 'DEBIT' ? '#ef4444' : '#22c55e',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}
                          />
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.9rem', fontWeight: 600, color: entry.type === 'DEBIT' ? '#ef4444' : '#22c55e' }}>
                          {entry.type === 'DEBIT' ? '+' : '-'}{formatCurrency(entry.amount)}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.9rem', fontWeight: 600, color: getBalanceColor(entry.balance) }}>
                          {formatCurrency(entry.balance)}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <IconButton
                              size="small"
                              onClick={() => openEditModal(entry)}
                              sx={{ color: 'var(--accent-gold)' }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteEntry(entry.id)}
                              sx={{ color: '#ef4444' }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>

              {/* Pagination */}
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 3 }}>
                  <Typography sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Page {page} of {totalPages}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      startIcon={<ChevronLeft />}
                      sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      endIcon={<ChevronRight />}
                      sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                    >
                      Next
                    </Button>
                  </Box>
                </Box>
              )}
            </>
          )}
        </DashboardPanel>
      </DashboardSurface>

      {/* Add Transaction Modal */}
      <Dialog open={showAddModal} onClose={() => setShowAddModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Add Transaction</Typography>
            <IconButton onClick={() => setShowAddModal(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <form onSubmit={handleAddEntry}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Type *</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'DEBIT' | 'CREDIT' })}
                  label="Type *"
                  required
                >
                  <MenuItem value="DEBIT">Debit (User Owes)</MenuItem>
                  <MenuItem value="CREDIT">Credit (Payment Received)</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Description *"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter transaction description"
                required
                fullWidth
              />

              <TextField
                label="Amount * (USD)"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                inputProps={{ step: '0.01', min: '0.01' }}
                required
                fullWidth
              />

              <TextField
                label="Notes (Optional)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any additional notes"
                multiline
                rows={3}
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAddModal(false)} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" startIcon={<Check />} sx={{ textTransform: 'none' }}>
              Add Transaction
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit Transaction Modal */}
      <Dialog open={showEditModal} onClose={() => setShowEditModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Edit Transaction</Typography>
            <IconButton onClick={() => setShowEditModal(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <form onSubmit={handleEditEntry}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="warning" sx={{ fontSize: '0.85rem' }}>
                Note: Type and amount cannot be edited to maintain ledger integrity. Only description and notes can be updated.
              </Alert>

              <TextField
                label="Type (Read-only)"
                value={formData.type}
                disabled
                fullWidth
              />

              <TextField
                label="Amount (Read-only)"
                value={formatCurrency(parseFloat(formData.amount))}
                disabled
                fullWidth
              />

              <TextField
                label="Description *"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                fullWidth
              />

              <TextField
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                multiline
                rows={3}
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowEditModal(false)} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" startIcon={<Check />} sx={{ textTransform: 'none' }}>
              Update Transaction
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ProtectedRoute>
  );
}
