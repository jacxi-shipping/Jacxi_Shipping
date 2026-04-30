'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Download,
  Print,
  FilterList,
  Search,
  ChevronLeft,
  ChevronRight,
  AccountBalance,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney,
} from '@mui/icons-material';
import { Button, Box, CircularProgress, Typography, TextField, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
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

interface LedgerSummary {
  totalDebit: number;
  totalCredit: number;
  currentBalance: number;
}

export default function LedgerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
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

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.replace('/auth/signin');
      return;
    }
    fetchLedgerEntries();
  }, [session, status, page, filters, router]);

  const fetchLedgerEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
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
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
    try {
      const params = new URLSearchParams({
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      let endpoint = '/api/ledger/export';
      if (format === 'pdf') {
        endpoint = '/api/ledger/export-pdf';
      } else if (format === 'excel') {
        endpoint = '/api/ledger/export-excel';
      }

      const response = await fetch(`${endpoint}?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to export ledger');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      if (format === 'pdf') {
        a.download = `ledger-${Date.now()}.html`;
      } else if (format === 'excel') {
        a.download = `ledger-${Date.now()}.csv`;
      } else {
        a.download = `ledger-${Date.now()}.csv`;
      }
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      if (format === 'pdf') {
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Error exporting ledger:', error);
    }
  };

  const handlePrint = () => {
    window.print();
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
    if (balance > 0) return 'var(--error)';
    if (balance < 0) return '#22c55e';
    return 'var(--text-secondary)';
  };

  if (status === 'loading' || loading) {
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
        {/* Stats Cards */}
        <DashboardGrid className="grid-cols-1 md:grid-cols-3">
          <StatsCard
            icon={TrendingUpIcon}
            title="Total Debit"
            value={formatCurrency(summary.totalDebit)}
            subtitle="Amount owed"
          />
          <StatsCard
            icon={TrendingDownIcon}
            title="Total Credit"
            value={formatCurrency(summary.totalCredit)}
            subtitle="Amount paid"
          />
          <StatsCard
            icon={AttachMoney}
            title="Current Balance"
            value={formatCurrency(summary.currentBalance)}
            subtitle={summary.currentBalance > 0 ? 'Amount owed' : summary.currentBalance < 0 ? 'Credit balance' : 'Settled'}
          />
        </DashboardGrid>

        {/* Filters Panel */}
        <DashboardPanel
          title="Filters"
          description="Filter and search transactions"
          actions={
            <Button
              variant="outlined"
              size="small"
              onClick={() => setShowFilters(!showFilters)}
              startIcon={<FilterList />}
              sx={{ textTransform: 'none', fontSize: '0.78rem' }}
            >
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
          }
        >
          {showFilters && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    label="Type"
                  >
                    <MenuItem value="">All Types</MenuItem>
                    <MenuItem value="DEBIT">Debit</MenuItem>
                    <MenuItem value="CREDIT">Credit</MenuItem>
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
            </Box>
          )}
        </DashboardPanel>

        {/* Transactions Table */}
        <DashboardPanel
          title="Transaction History"
          description={`Showing ${entries.length} transaction${entries.length !== 1 ? 's' : ''}`}
          fullHeight
          actions={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handlePrint}
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
          }
        >
          {loading ? (
            <Box sx={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress size={30} sx={{ color: 'var(--accent-gold)' }} />
            </Box>
          ) : entries.length === 0 ? (
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
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
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
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 1,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: entry.type === 'DEBIT' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                              color: entry.type === 'DEBIT' ? '#ef4444' : '#22c55e',
                            }}
                          >
                            {entry.type === 'DEBIT' ? <TrendingUpIcon sx={{ fontSize: 14 }} /> : <TrendingDownIcon sx={{ fontSize: 14 }} />}
                            {entry.type}
                          </Box>
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.9rem', fontWeight: 600, color: entry.type === 'DEBIT' ? '#ef4444' : '#22c55e' }}>
                          {entry.type === 'DEBIT' ? '+' : '-'}{formatCurrency(entry.amount)}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.9rem', fontWeight: 600, color: getBalanceColor(entry.balance) }}>
                          {formatCurrency(entry.balance)}
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
    </ProtectedRoute>
  );
}
