'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
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
import {  Box, Typography, TextField, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Breadcrumbs, Button, toast, EmptyState, SkeletonCard, SkeletonTable, Tooltip, StatusBadge, TableSkeleton, StatsCard } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface LedgerEntry {
  id: string;
  transactionDate: string;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  transactionInfoType?: TransactionInfoType;
  amount: number;
  balance: number;
  notes?: string;
  shipment?: {
    id: string;
    vehicleVIN?: string | null;
    vehicleMake?: string;
    vehicleModel?: string;
  };
}

interface LedgerSummary {
  totalDebit: number;
  totalCredit: number;
  currentBalance: number;
  transactionInfoBreakdown?: Partial<Record<TransactionInfoType, {
    totalDebit: number;
    totalCredit: number;
    balance: number;
  }>>;
}

type TransactionInfoType = 'CAR_PAYMENT' | 'SHIPPING_PAYMENT' | 'STORAGE_PAYMENT';

const transactionInfoTypeLabels: Record<TransactionInfoType, string> = {
  CAR_PAYMENT: 'Car Payment',
  SHIPPING_PAYMENT: 'Shipping Payment',
  STORAGE_PAYMENT: 'Storage Payment',
};

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
    transactionInfoType: '',
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
        ...(filters.transactionInfoType && { transactionInfoType: filters.transactionInfoType }),
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
        ...(filters.search && { search: filters.search }),
        ...(filters.type && { type: filters.type }),
        ...(filters.transactionInfoType && { transactionInfoType: filters.transactionInfoType }),
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

  const normalizeShipmentReference = (entry: LedgerEntry) => {
    if (!entry.shipment?.id || !entry.shipment?.vehicleVIN) {
      return entry.description;
    }

    const shipmentId = entry.shipment.id;
    const vinLabel = `VIN ${entry.shipment.vehicleVIN}`;

    return entry.description
      .replace(new RegExp(`\\(Shipment\\s+${shipmentId}\\)`, 'gi'), `(${vinLabel})`)
      .replace(new RegExp(`Shipment\\s+${shipmentId}`, 'gi'), vinLabel)
      .replace(new RegExp(`shipment\\s+${shipmentId}`, 'g'), vinLabel);
  };

  const columns = useMemo<Column<LedgerEntry>[]>(() => [
    {
      key: 'transactionDate',
      header: 'Date',
      sortable: true,
      width: '15%',
      render: (_, row) => (
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {formatDate(row.transactionDate)}
        </span>
      )
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      width: '40%',
      render: (_, row) => (
        <Box>
          <Typography sx={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
            {normalizeShipmentReference(row)}
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: 'var(--accent-gold)', mt: 0.5, fontWeight: 600 }}>
            {row.transactionInfoType ? transactionInfoTypeLabels[row.transactionInfoType] : 'Not specified'}
          </Typography>
          {row.notes && (
            <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mt: 0.5 }}>
              {row.notes}
            </Typography>
          )}
          {row.shipment && (
            <Typography sx={{ fontSize: '0.75rem', color: 'var(--accent-gold)', mt: 0.5 }}>
              {row.shipment.vehicleVIN
                ? `VIN: ${row.shipment.vehicleVIN}`
                : `${row.shipment.vehicleMake || ''} ${row.shipment.vehicleModel || ''}`.trim() || row.shipment.id}
            </Typography>
          )}
        </Box>
      )
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      align: 'center' as const,
      width: '15%',
      render: (_, row) => (
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
            backgroundColor: row.type === 'DEBIT' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
            color: row.type === 'DEBIT' ? '#ef4444' : '#22c55e',
          }}
        >
          {row.type === 'DEBIT' ? <TrendingUpIcon sx={{ fontSize: 14 }} /> : <TrendingDownIcon sx={{ fontSize: 14 }} />}
          {row.type}
        </Box>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      align: 'right' as const,
      width: '15%',
      render: (_, row) => (
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: row.type === 'DEBIT' ? '#ef4444' : '#22c55e' }}>
          {row.type === 'DEBIT' ? '+' : '-'}{formatCurrency(row.amount)}
        </span>
      )
    },
    {
      key: 'balance',
      header: 'Balance',
      sortable: true,
      align: 'right' as const,
      width: '15%',
      render: (_, row) => (
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: getBalanceColor(row.balance) }}>
          {formatCurrency(row.balance)}
        </span>
      )
    }
  ], []);

  const totalCarPayment = summary.transactionInfoBreakdown?.CAR_PAYMENT?.totalCredit || 0;
  const totalShippingPayment = summary.transactionInfoBreakdown?.SHIPPING_PAYMENT?.totalCredit || 0;

  if (status === 'loading' || loading) {
    return (
      <ProtectedRoute>
        <DashboardSurface>
				{/* Breadcrumbs */}
				<Box sx={{ px: 2, pt: 2 }}>
					<Breadcrumbs />
				</Box>
          <Box sx={{ px: 2 }}>
            <TableSkeleton rows={5} />
          </Box>
        </DashboardSurface>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardSurface>
				{/* Breadcrumbs */}
				<Box sx={{ px: 2, pt: 2 }}>
					<Breadcrumbs />
				</Box>
        {/* Stats Cards */}
        <DashboardGrid className="grid-cols-1 md:grid-cols-2 xl:grid-cols-5">
          <StatsCard
            icon={<TrendingUpIcon />}
            title="Total Debit"
            value={formatCurrency(summary.totalDebit)}
            subtitle="Amount owed"
            variant="error"
          />
          <StatsCard
            icon={<TrendingDownIcon />}
            title="Total Credit"
            value={formatCurrency(summary.totalCredit)}
            subtitle="Amount paid"
            variant="success"
          />
          <StatsCard
            icon={<AttachMoney />}
            title="Current Balance"
            value={formatCurrency(summary.currentBalance)}
            subtitle={summary.currentBalance > 0 ? 'Amount owed' : summary.currentBalance < 0 ? 'Credit balance' : 'Settled'}
            variant={summary.currentBalance > 0 ? 'error' : summary.currentBalance < 0 ? 'success' : 'info'}
          />
          <StatsCard
            icon={<AttachMoney />}
            title="Total Car Payment"
            value={formatCurrency(totalCarPayment)}
            subtitle="Credits tagged as car payment"
            variant="success"
          />
          <StatsCard
            icon={<AttachMoney />}
            title="Total Shipping Payment"
            value={formatCurrency(totalShippingPayment)}
            subtitle="Credits tagged as shipping payment"
            variant="success"
          />
        </DashboardGrid>

        {/* Filters Panel */}
        <DashboardPanel
          title="Filters"
          description="Filter and search transactions"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              icon={<FilterList />}
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
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
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
                <FormControl size="small" fullWidth>
                  <InputLabel>Transaction Info</InputLabel>
                  <Select
                    value={filters.transactionInfoType}
                    onChange={(e) => setFilters({ ...filters, transactionInfoType: e.target.value })}
                    label="Transaction Info"
                  >
                    <MenuItem value="">All Transaction Types</MenuItem>
                    {(Object.entries(transactionInfoTypeLabels) as Array<[TransactionInfoType, string]>).map(([value, label]) => (
                      <MenuItem key={value} value={value}>{label}</MenuItem>
                    ))}
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
                variant="outline"
                size="sm"
                onClick={handlePrint}
                icon={<Print />}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('pdf')}
                icon={<Download />}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('excel')}
                icon={<Download />}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                Excel
              </Button>
            </Box>
          }
        >
          <DataTable 
            data={entries}
            columns={columns}
            keyField="id"
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 3 }}>
              <Typography sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Page {page} of {totalPages}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  icon={<ChevronLeft />}
                  sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  icon={<ChevronRight />}
                  sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                >
                  Next
                </Button>
              </Box>
            </Box>
          )}
        </DashboardPanel>
      </DashboardSurface>
    </ProtectedRoute>
  );
}