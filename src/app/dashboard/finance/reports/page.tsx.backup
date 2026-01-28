'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Download, 
  Calendar,
  Filter,
  FileText,
  Users,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Section from '@/components/layout/Section';
import AdminRoute from '@/components/auth/AdminRoute';

type UserBalance = {
  userId: string;
  userName: string;
  currentBalance: number;
};

type UserReport = {
  userId: string;
  userName: string;
  email: string;
  totalDebit: number;
  totalCredit: number;
  currentBalance: number;
  shipmentStats: {
    total: number;
    paid: number;
    due: number;
  };
};

type ShipmentReport = {
  shipmentId: string;
  trackingNumber: string | null;
  vehicle: string;
  price: number | null;
  paymentStatus: string;
  totalCharged: number;
  totalPaid: number;
  amountDue: number;
  totalExpenses: number;
  revenue: number;
  profit: number;
  profitMargin: number;
  user: {
    id: string;
    name: string;
  };
};

type ReportData = {
  reportType: string;
  period?: {
    startDate: string;
    endDate: string;
  };
  ledgerSummary?: {
    totalDebit: number;
    totalCredit: number;
    netBalance: number;
    debitCount: number;
    creditCount: number;
  };
  shipmentSummary?: Array<{
    status: string;
    totalAmount: number;
    count: number;
  }>;
  userBalances?: UserBalance[];
  users?: UserReport[];
  summary?: {
    totalRevenue: number;
    totalExpenses: number;
    totalProfit: number;
    avgProfitMargin: number;
    shipmentCount: number;
  };
  shipments?: ShipmentReport[];
};

export default function FinancialReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reportType, setReportType] = useState<'summary' | 'user-wise' | 'shipment-wise'>('summary');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    userId: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user?.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, router, reportType]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        type: reportType,
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.userId && { userId: filters.userId }),
      });

      const response = await fetch(`/api/reports/financial?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch report');
      }

      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams({
        type: reportType,
        format,
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.userId && { userId: filters.userId }),
      });

      const response = await fetch(`/api/reports/financial?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report-${reportType}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (dateString === 'All time' || dateString === 'Now') return dateString;
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (status === 'loading' || loading) {
    return (
      <AdminRoute>
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
          <div className="text-center space-y-4 text-[var(--text-secondary)]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--border)] border-t-[var(--accent-gold)] mx-auto" />
            <p>Loading report...</p>
          </div>
        </div>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <div className="min-h-screen bg-[var(--background)]">
        <Section className="pt-6 pb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <Link href="/dashboard/finance">
                <Button variant="outline" size="sm" className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-semibold text-[var(--text-primary)]">Financial Reports</h1>
                <p className="text-sm text-[var(--text-secondary)]">
                  Generate and export detailed financial reports
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportReport('json')}
                className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Export JSON
              </Button>
            </div>
          </div>
        </Section>

        {/* Report Type Selection */}
        <Section className="pb-6">
          <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
            <CardHeader className="p-4 border-b border-white/5">
              <CardTitle className="text-lg font-bold text-[var(--text-primary)]">Report Type</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => setReportType('summary')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    reportType === 'summary'
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-white/10 hover:border-cyan-500/50'
                  }`}
                >
                  <FileText className="w-6 h-6 text-cyan-400 mb-2" />
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Summary Report</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Overall financial overview</p>
                </button>

                <button
                  onClick={() => setReportType('user-wise')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    reportType === 'user-wise'
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-white/10 hover:border-cyan-500/50'
                  }`}
                >
                  <Users className="w-6 h-6 text-cyan-400 mb-2" />
                  <p className="text-sm font-semibold text-[var(--text-primary)]">User-wise Report</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Detailed by user accounts</p>
                </button>

                <button
                  onClick={() => setReportType('shipment-wise')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    reportType === 'shipment-wise'
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-white/10 hover:border-cyan-500/50'
                  }`}
                >
                  <Package className="w-6 h-6 text-cyan-400 mb-2" />
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Shipment-wise Report</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Payment status by shipment</p>
                </button>
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* Filters */}
        {showFilters && (
          <Section className="pb-6">
            <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
              <CardHeader className="p-4 border-b border-white/5">
                <CardTitle className="text-lg font-bold text-[var(--text-primary)]">Filters</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] focus:ring-2 focus:ring-cyan-500/40"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] focus:ring-2 focus:ring-cyan-500/40"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      onClick={fetchReport}
                      className="w-full bg-[var(--accent-gold)] hover:bg-[var(--accent-gold)]"
                      style={{ color: 'white' }}
                    >
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>
        )}

        {/* Report Content */}
        {reportData && (
          <>
            {/* Period Info */}
            <Section className="pb-6">
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Calendar className="w-4 h-4" />
                <span>
                  Report Period: {reportData.period ? `${formatDate(reportData.period.startDate)} - ${formatDate(reportData.period.endDate)}` : 'N/A'}
                </span>
              </div>
            </Section>

            {/* Summary Report */}
            {reportType === 'summary' && (
              <>
                <Section className="pb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
                      <CardContent className="p-6">
                        <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">Total Debit</p>
                        <p className="text-2xl font-bold text-red-400 mt-2">
                          {formatCurrency(reportData.ledgerSummary?.totalDebit || 0)}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          {reportData.ledgerSummary?.debitCount} transactions
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
                      <CardContent className="p-6">
                        <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">Total Credit</p>
                        <p className="text-2xl font-bold text-green-400 mt-2">
                          {formatCurrency(reportData.ledgerSummary?.totalCredit || 0)}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          {reportData.ledgerSummary?.creditCount} transactions
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
                      <CardContent className="p-6">
                        <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">Net Balance</p>
                        <p className={`text-2xl font-bold mt-2 ${
                          (reportData.ledgerSummary?.netBalance || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatCurrency(Math.abs(reportData.ledgerSummary?.netBalance || 0))}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          {(reportData.ledgerSummary?.netBalance || 0) >= 0 ? 'Receivable' : 'Payable'}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </Section>

                <Section className="pb-6">
                  <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
                    <CardHeader className="p-4 border-b border-white/5">
                      <CardTitle className="text-lg font-bold text-[var(--text-primary)]">User Balances</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white/5">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">User</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {reportData.userBalances?.map((user) => (
                              <tr key={user.userId} className="hover:bg-white/5">
                                <td className="px-4 py-3 text-sm text-[var(--text-primary)]">{user.userName}</td>
                                <td className="px-4 py-3 text-sm text-right">
                                  <span className={`font-semibold ${user.currentBalance >= 0 ? 'text-[var(--text-primary)]' : 'text-red-400'}`}>
                                    {formatCurrency(Math.abs(user.currentBalance))}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </Section>
              </>
            )}

            {/* User-wise Report */}
            {reportType === 'user-wise' && (
              <Section className="pb-16">
                <div className="space-y-6">
                  {reportData.users?.map((user) => (
                    <Card key={user.userId} className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
                      <CardHeader className="p-4 border-b border-white/5">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg font-bold text-[var(--text-primary)]">{user.userName}</CardTitle>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">{user.email}</p>
                          </div>
                          <div className={`text-xl font-bold ${user.currentBalance >= 0 ? 'text-[var(--text-primary)]' : 'text-red-400'}`}>
                            {formatCurrency(Math.abs(user.currentBalance))}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-[var(--text-secondary)]">Total Debit</p>
                            <p className="text-lg font-semibold text-red-400">{formatCurrency(user.totalDebit)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--text-secondary)]">Total Credit</p>
                            <p className="text-lg font-semibold text-green-400">{formatCurrency(user.totalCredit)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--text-secondary)]">Paid Shipments</p>
                            <p className="text-lg font-semibold text-[var(--text-primary)]">{user.shipmentStats.paid}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--text-secondary)]">Due Shipments</p>
                            <p className="text-lg font-semibold text-yellow-400">{user.shipmentStats.due}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </Section>
            )}

            {/* Shipment-wise Report */}
            {reportType === 'shipment-wise' && (
              <Section className="pb-16">
                <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
                  <CardHeader className="p-4 border-b border-white/5">
                    <CardTitle className="text-lg font-bold text-[var(--text-primary)]">Shipment Payment Details</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-white/5">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Tracking</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Vehicle</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase">Charged</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase">Paid</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase">Due</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {reportData.shipments?.map((shipment) => (
                            <tr key={shipment.shipmentId} className="hover:bg-white/5">
                              <td className="px-4 py-3 text-sm text-[var(--text-primary)]">{shipment.trackingNumber}</td>
                              <td className="px-4 py-3 text-sm text-[var(--text-primary)]">{shipment.vehicle}</td>
                              <td className="px-4 py-3 text-sm text-right text-red-400">{formatCurrency(shipment.totalCharged)}</td>
                              <td className="px-4 py-3 text-sm text-right text-green-400">{formatCurrency(shipment.totalPaid)}</td>
                              <td className="px-4 py-3 text-sm text-right text-yellow-400">{formatCurrency(shipment.amountDue)}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  shipment.paymentStatus === 'COMPLETED'
                                    ? 'bg-green-500/10 text-green-400'
                                    : 'bg-yellow-500/10 text-yellow-400'
                                }`}>
                                  {shipment.paymentStatus === 'COMPLETED' ? 'Paid' : 'Due'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </Section>
            )}
          </>
        )}
      </div>
    </AdminRoute>
  );
}
