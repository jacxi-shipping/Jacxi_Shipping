'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Box, Typography } from '@mui/material';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users,
  FileText,
  PlusCircle,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { PageHeader, StatsCard, ActionButton, LoadingState } from '@/components/design-system';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface FinancialSummary {
  ledgerSummary: {
    totalDebit: number;
    totalCredit: number;
    netBalance: number;
    debitCount: number;
    creditCount: number;
  };
  shipmentSummary: {
    status: string;
    totalAmount: number;
    count: number;
  }[];
  userBalances: {
    userId: string;
    userName: string;
    currentBalance: number;
  }[];
}

export default function FinancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.replace('/auth/signin');
      return;
    }
    fetchFinancialSummary();
  }, [session, status, router]);

  const fetchFinancialSummary = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports/financial?type=summary');
      
      if (!response.ok) {
        throw new Error('Failed to fetch financial summary');
      }

      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Error fetching financial summary:', error);
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

  const getPaidShipments = () => {
    return summary?.shipmentSummary.find(s => s.status === 'COMPLETED') || { count: 0, totalAmount: 0 };
  };

  const getDueShipments = () => {
    return summary?.shipmentSummary.find(s => s.status === 'PENDING') || { count: 0, totalAmount: 0 };
  };

  const getUsersWithBalance = () => {
    return summary?.userBalances.filter(u => u.currentBalance !== 0).length || 0;
  };

  if (status === 'loading' || loading) {
    return (
      <ProtectedRoute>
        <LoadingState fullScreen message="Loading financial data..." />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardSurface>
        <PageHeader
          title="Accounting & Finance"
          description="Manage ledgers, payments, and financial reports"
          actions={
            isAdmin && (
              <Link href="/dashboard/finance/record-payment" style={{ textDecoration: 'none' }}>
                <ActionButton variant="primary" icon={<PlusCircle className="w-4 h-4" />}>
                  Record Payment
                </ActionButton>
              </Link>
            )
          }
        />

        {/* Summary Stats */}
        <DashboardGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            icon={<TrendingUp style={{ fontSize: 18 }} />}
            title="Total Debit"
            value={formatCurrency(summary?.ledgerSummary.totalDebit || 0)}
            subtitle={`${summary?.ledgerSummary.debitCount || 0} transactions`}
            iconColor="rgb(248, 113, 113)"
            iconBg="rgba(248, 113, 113, 0.15)"
          />
          <StatsCard
            icon={<TrendingDown style={{ fontSize: 18 }} />}
            title="Total Credit"
            value={formatCurrency(summary?.ledgerSummary.totalCredit || 0)}
            subtitle={`${summary?.ledgerSummary.creditCount || 0} transactions`}
            iconColor="rgb(74, 222, 128)"
            iconBg="rgba(74, 222, 128, 0.15)"
            delay={0.1}
          />
          <StatsCard
            icon={<DollarSign style={{ fontSize: 18 }} />}
            title="Net Balance"
            value={formatCurrency(Math.abs(summary?.ledgerSummary.netBalance || 0))}
            subtitle={(summary?.ledgerSummary.netBalance || 0) >= 0 ? 'Receivable' : 'Payable'}
            iconColor={(summary?.ledgerSummary.netBalance || 0) >= 0 ? 'rgb(74, 222, 128)' : 'rgb(248, 113, 113)'}
            iconBg={(summary?.ledgerSummary.netBalance || 0) >= 0 ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)'}
            delay={0.2}
          />
          <StatsCard
            icon={<Users style={{ fontSize: 18 }} />}
            title="Active Users"
            value={getUsersWithBalance()}
            subtitle="With outstanding balance"
            iconColor="rgb(34, 211, 238)"
            iconBg="rgba(34, 211, 238, 0.15)"
            delay={0.3}
          />
        </DashboardGrid>

        {/* Shipment Payment Status */}
        <DashboardPanel title="Shipment Payment Status" description="Overview of paid and pending shipments">
          <DashboardGrid className="grid-cols-1 md:grid-cols-2">
            <Box
              sx={{
                p: 2.5,
                borderRadius: 2,
                border: '1px solid rgba(74, 222, 128, 0.3)',
                bgcolor: 'rgba(74, 222, 128, 0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: 'rgba(74, 222, 128, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle style={{ fontSize: 24, color: 'rgb(74, 222, 128)' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Paid Shipments
                </Typography>
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'rgb(74, 222, 128)', mt: 0.5 }}>
                  {getPaidShipments().count}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mt: 0.5 }}>
                  Total: {formatCurrency(getPaidShipments().totalAmount)}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                p: 2.5,
                borderRadius: 2,
                border: '1px solid rgba(251, 191, 36, 0.3)',
                bgcolor: 'rgba(251, 191, 36, 0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: 'rgba(251, 191, 36, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertCircle style={{ fontSize: 24, color: 'rgb(251, 191, 36)' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Due Shipments
                </Typography>
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'rgb(251, 191, 36)', mt: 0.5 }}>
                  {getDueShipments().count}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mt: 0.5 }}>
                  Total: {formatCurrency(getDueShipments().totalAmount)}
                </Typography>
              </Box>
            </Box>
          </DashboardGrid>
        </DashboardPanel>

        {/* Quick Actions */}
        <DashboardPanel title="Quick Actions" description="Navigate to finance sections">
          <DashboardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/dashboard/finance/ledger" style={{ textDecoration: 'none' }}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid var(--border)',
                  bgcolor: 'var(--panel)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    borderColor: 'rgb(34, 211, 238)',
                    boxShadow: '0 12px 24px rgba(var(--text-primary-rgb), 0.12)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(34, 211, 238, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FileText style={{ fontSize: 18, color: 'rgb(34, 211, 238)' }} />
                  </Box>
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    My Ledger
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  View your transactions
                </Typography>
              </Box>
            </Link>

            {isAdmin && (
              <Link href="/dashboard/finance/admin/ledgers" style={{ textDecoration: 'none' }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid var(--border)',
                    bgcolor: 'var(--panel)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      borderColor: 'rgb(251, 191, 36)',
                      boxShadow: '0 12px 24px rgba(var(--text-primary-rgb), 0.12)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1.5,
                        bgcolor: 'rgba(251, 191, 36, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Users style={{ fontSize: 18, color: 'rgb(251, 191, 36)' }} />
                    </Box>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      All User Ledgers
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    View all user ledgers
                  </Typography>
                </Box>
              </Link>
            )}

            {isAdmin && (
              <Link href="/dashboard/finance/record-payment" style={{ textDecoration: 'none' }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid var(--border)',
                    bgcolor: 'var(--panel)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      borderColor: 'rgb(74, 222, 128)',
                      boxShadow: '0 12px 24px rgba(var(--text-primary-rgb), 0.12)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1.5,
                        bgcolor: 'rgba(74, 222, 128, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <PlusCircle style={{ fontSize: 18, color: 'rgb(74, 222, 128)' }} />
                    </Box>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Record Payment
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Log received payment
                  </Typography>
                </Box>
              </Link>
            )}

            {isAdmin && (
              <Link href="/dashboard/finance/reports" style={{ textDecoration: 'none' }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid var(--border)',
                    bgcolor: 'var(--panel)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      borderColor: 'rgb(168, 85, 247)',
                      boxShadow: '0 12px 24px rgba(var(--text-primary-rgb), 0.12)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1.5,
                        bgcolor: 'rgba(168, 85, 247, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FileText style={{ fontSize: 18, color: 'rgb(168, 85, 247)' }} />
                    </Box>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Financial Reports
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    View detailed reports
                  </Typography>
                </Box>
              </Link>
            )}
          </DashboardGrid>
        </DashboardPanel>

        {/* User Balances Table */}
        {isAdmin && summary && summary.userBalances.length > 0 && (
          <DashboardPanel title="User Balances" description="Users with outstanding balances">
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--background)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      User
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Balance
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.userBalances.slice(0, 10).map((user) => (
                    <tr key={user.userId} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {user.userName}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', textAlign: 'right', fontWeight: 600, color: user.currentBalance >= 0 ? 'var(--text-primary)' : 'rgb(248, 113, 113)' }}>
                        {formatCurrency(Math.abs(user.currentBalance))}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {user.currentBalance === 0 ? (
                          <Box component="span" sx={{ px: 1.5, py: 0.5, borderRadius: 1, fontSize: '0.7rem', fontWeight: 600, bgcolor: 'rgba(74, 222, 128, 0.15)', color: 'rgb(74, 222, 128)', border: '1px solid rgba(74, 222, 128, 0.3)' }}>
                            Settled
                          </Box>
                        ) : user.currentBalance > 0 ? (
                          <Box component="span" sx={{ px: 1.5, py: 0.5, borderRadius: 1, fontSize: '0.7rem', fontWeight: 600, bgcolor: 'rgba(251, 191, 36, 0.15)', color: 'rgb(251, 191, 36)', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                            Due
                          </Box>
                        ) : (
                          <Box component="span" sx={{ px: 1.5, py: 0.5, borderRadius: 1, fontSize: '0.7rem', fontWeight: 600, bgcolor: 'rgba(34, 211, 238, 0.15)', color: 'rgb(34, 211, 238)', border: '1px solid rgba(34, 211, 238, 0.3)' }}>
                            Credit
                          </Box>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </DashboardPanel>
        )}
      </DashboardSurface>
    </ProtectedRoute>
  );
}
