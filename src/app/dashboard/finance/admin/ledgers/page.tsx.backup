'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  People,
  Visibility,
  AttachMoney,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Search,
  FilterList,
  Payment,
  AddCircle,
} from '@mui/icons-material';
import { Button, Box, CircularProgress, Typography, TextField, Select, MenuItem, FormControl, InputLabel, Chip } from '@mui/material';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import StatsCard from '@/components/dashboard/StatsCard';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface UserLedgerSummary {
  userId: string;
  userName: string;
  email: string;
  currentBalance: number;
  totalDebit: number;
  totalCredit: number;
  transactionCount: number;
  lastTransaction?: string;
}

export default function AdminLedgersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserLedgerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBalance, setFilterBalance] = useState<'all' | 'positive' | 'zero' | 'negative'>('all');

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
    fetchAllUserLedgers();
  }, [session, status, router]);

  const fetchAllUserLedgers = async () => {
    try {
      setLoading(true);
      const usersResponse = await fetch('/api/users');
      if (!usersResponse.ok) throw new Error('Failed to fetch users');
      
      const usersData = await usersResponse.json();
      
      const userSummaries = await Promise.all(
        usersData.users.map(async (user: { id: string; name: string | null; email: string }) => {
          try {
            const ledgerResponse = await fetch(`/api/ledger?userId=${user.id}&limit=1`);
            if (!ledgerResponse.ok) {
              return {
                userId: user.id,
                userName: user.name || user.email,
                email: user.email,
                currentBalance: 0,
                totalDebit: 0,
                totalCredit: 0,
                transactionCount: 0,
              };
            }

            const ledgerData = await ledgerResponse.json();
            return {
              userId: user.id,
              userName: user.name || user.email,
              email: user.email,
              currentBalance: ledgerData.summary?.currentBalance || 0,
              totalDebit: ledgerData.summary?.totalDebit || 0,
              totalCredit: ledgerData.summary?.totalCredit || 0,
              transactionCount: ledgerData.pagination?.totalCount || 0,
              lastTransaction: ledgerData.entries?.[0]?.transactionDate,
            };
          } catch (error) {
            console.error(`Error fetching ledger for user ${user.id}:`, error);
            return {
              userId: user.id,
              userName: user.name || user.email,
              email: user.email,
              currentBalance: 0,
              totalDebit: 0,
              totalCredit: 0,
              transactionCount: 0,
            };
          }
        })
      );

      setUsers(userSummaries);
    } catch (error) {
      console.error('Error fetching user ledgers:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No transactions';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getBalanceChip = (balance: number) => {
    if (balance > 0) {
      return (
        <Chip
          label={formatCurrency(balance)}
          size="small"
          icon={<TrendingUpIcon />}
          sx={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            fontWeight: 600,
            fontSize: '0.8rem',
          }}
        />
      );
    }
    if (balance < 0) {
      return (
        <Chip
          label={formatCurrency(Math.abs(balance))}
          size="small"
          icon={<TrendingDownIcon />}
          sx={{
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            color: '#22c55e',
            fontWeight: 600,
            fontSize: '0.8rem',
          }}
        />
      );
    }
    return (
      <Chip
        label={formatCurrency(0)}
        size="small"
        sx={{
          backgroundColor: 'rgba(var(--text-secondary-rgb), 0.1)',
          color: 'var(--text-secondary)',
          fontWeight: 600,
          fontSize: '0.8rem',
        }}
      />
    );
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesBalance = 
      filterBalance === 'all' ||
      (filterBalance === 'positive' && user.currentBalance > 0) ||
      (filterBalance === 'zero' && user.currentBalance === 0) ||
      (filterBalance === 'negative' && user.currentBalance < 0);

    return matchesSearch && matchesBalance;
  });

  const totalBalance = users.reduce((sum, user) => sum + user.currentBalance, 0);
  const totalDebit = users.reduce((sum, user) => sum + user.totalDebit, 0);
  const totalCredit = users.reduce((sum, user) => sum + user.totalCredit, 0);
  const usersWithBalance = users.filter(u => u.currentBalance > 0).length;

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
        {/* Summary Cards */}
        <DashboardGrid className="grid-cols-1 md:grid-cols-4">
          <StatsCard
            icon={TrendingUpIcon}
            title="Total Outstanding"
            value={formatCurrency(totalBalance)}
            subtitle={`${usersWithBalance} users with balance`}
          />
          <StatsCard
            icon={AttachMoney}
            title="Total Debits"
            value={formatCurrency(totalDebit)}
            subtitle="All charges"
          />
          <StatsCard
            icon={TrendingDownIcon}
            title="Total Credits"
            value={formatCurrency(totalCredit)}
            subtitle="All payments"
          />
          <StatsCard
            icon={People}
            title="Users With Balance"
            value={`${usersWithBalance} / ${users.length}`}
            subtitle="Active accounts"
          />
        </DashboardGrid>

        {/* Search and Filter */}
        <DashboardPanel
          title="Search & Filter"
          description="Find users quickly"
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr auto' }, gap: 2 }}>
            <TextField
              placeholder="Search by name or email..."
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'var(--text-secondary)', fontSize: 20 }} />,
              }}
              fullWidth
            />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Balance Filter</InputLabel>
              <Select
                value={filterBalance}
                onChange={(e) => setFilterBalance(e.target.value as typeof filterBalance)}
                label="Balance Filter"
                startAdornment={<FilterList sx={{ ml: 1, mr: 0.5, color: 'var(--text-secondary)', fontSize: 20 }} />}
              >
                <MenuItem value="all">All Balances</MenuItem>
                <MenuItem value="positive">Owes Money</MenuItem>
                <MenuItem value="zero">Zero Balance</MenuItem>
                <MenuItem value="negative">Credit Balance</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DashboardPanel>

        {/* Users Table */}
        <DashboardPanel
          title="All User Ledgers"
          description={`${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''} found`}
          fullHeight
          actions={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Link href="/dashboard/finance/record-payment" style={{ textDecoration: 'none' }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Payment />}
                  sx={{ textTransform: 'none', fontSize: '0.78rem', fontWeight: 600 }}
                >
                  Record Payment
                </Button>
              </Link>
              <Link href="/dashboard/finance/add-expense" style={{ textDecoration: 'none' }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddCircle />}
                  sx={{ textTransform: 'none', fontSize: '0.78rem' }}
                >
                  Add Expense
                </Button>
              </Link>
            </Box>
          }
        >
          {filteredUsers.length === 0 ? (
            <Box sx={{ minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <People sx={{ fontSize: 48, color: 'var(--text-secondary)', opacity: 0.5 }} />
              <Typography sx={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                No users found
              </Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>User</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Balance</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Debit</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Credit</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Transactions</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Last Activity</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.userId} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 8px' }}>
                        <Typography sx={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {user.userName}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {user.email}
                        </Typography>
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        {getBalanceChip(user.currentBalance)}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {formatCurrency(user.totalDebit)}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.85rem', color: '#22c55e' }}>
                        {formatCurrency(user.totalCredit)}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {user.transactionCount}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {formatDate(user.lastTransaction)}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <Link href={`/dashboard/finance/admin/ledgers/${user.userId}`} style={{ textDecoration: 'none' }}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<Visibility />}
                            sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                          >
                            View Ledger
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          )}
        </DashboardPanel>
      </DashboardSurface>
    </ProtectedRoute>
  );
}
