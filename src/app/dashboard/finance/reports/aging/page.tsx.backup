'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Section from '@/components/layout/Section';
import AdminRoute from '@/components/auth/AdminRoute';

interface ShipmentDetail {
  id: string;
  trackingNumber: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  amountDue: number;
  createdAt: string;
  ageInDays: number;
  price: number | null;
}

interface AgingReport {
  reportType: string;
  generatedAt: string;
  summary: {
    totalShipments: number;
    totalAmountDue: number;
    buckets: {
      [key: string]: {
        count: number;
        total: number;
        percentage: number;
        label: string;
      };
    };
  };
  details: {
    current: ShipmentDetail[];
    aging30: ShipmentDetail[];
    aging60: ShipmentDetail[];
    aging90: ShipmentDetail[];
  };
}

export default function AgingReportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [report, setReport] = useState<AgingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBucket, setSelectedBucket] = useState<'current' | 'aging30' | 'aging60' | 'aging90'>('current');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user?.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    fetchReport();
  }, [session, status, router]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports/due-aging');
      
      if (!response.ok) {
        throw new Error('Failed to fetch aging report');
      }

      const data = await response.json();
      setReport(data);
    } catch (error) {
      console.error('Error fetching aging report:', error);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getBucketColor = (bucket: string) => {
    switch (bucket) {
      case 'current':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'aging30':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'aging60':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'aging90':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      default:
        return 'text-[var(--text-primary)]';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <AdminRoute>
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
          <div className="text-center space-y-4 text-[var(--text-secondary)]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--border)] border-t-[var(--accent-gold)] mx-auto" />
            <p>Loading aging report...</p>
          </div>
        </div>
      </AdminRoute>
    );
  }

  if (!report) {
    return (
      <AdminRoute>
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 mx-auto text-[var(--text-secondary)] opacity-50" />
            <p className="text-[var(--text-secondary)]">Failed to load aging report</p>
            <Button onClick={fetchReport}>Retry</Button>
          </div>
        </div>
      </AdminRoute>
    );
  }

  const selectedDetails = report.details[selectedBucket] || [];

  return (
    <AdminRoute>
      <div className="min-h-screen bg-[var(--background)]">
        <Section className="pt-6 pb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <Link href="/dashboard/finance/reports">
                <Button variant="outline" size="sm" className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-semibold text-[var(--text-primary)]">Due Aging Report</h1>
                <p className="text-sm text-[var(--text-secondary)]">
                  Track overdue payments by age
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* Summary Cards */}
        <Section className="pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Current (0-30 days) */}
            <button
              onClick={() => setSelectedBucket('current')}
              className={`text-left p-4 rounded-lg border-2 transition-all ${
                selectedBucket === 'current' ? 'border-green-500 bg-green-500/10' : 'border-white/10 hover:border-green-500/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-green-400" />
                <span className="text-xs font-semibold text-green-400">
                  {report.summary.buckets.current.percentage.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">
                {report.summary.buckets.current.label}
              </p>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(report.summary.buckets.current.total)}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {report.summary.buckets.current.count} shipments
              </p>
            </button>

            {/* 31-60 days */}
            <button
              onClick={() => setSelectedBucket('aging30')}
              className={`text-left p-4 rounded-lg border-2 transition-all ${
                selectedBucket === 'aging30' ? 'border-yellow-500 bg-yellow-500/10' : 'border-white/10 hover:border-yellow-500/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-yellow-400" />
                <span className="text-xs font-semibold text-yellow-400">
                  {report.summary.buckets.aging30.percentage.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">
                {report.summary.buckets.aging30.label}
              </p>
              <p className="text-2xl font-bold text-yellow-400">
                {formatCurrency(report.summary.buckets.aging30.total)}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {report.summary.buckets.aging30.count} shipments
              </p>
            </button>

            {/* 61-90 days */}
            <button
              onClick={() => setSelectedBucket('aging60')}
              className={`text-left p-4 rounded-lg border-2 transition-all ${
                selectedBucket === 'aging60' ? 'border-orange-500 bg-orange-500/10' : 'border-white/10 hover:border-orange-500/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-orange-400" />
                <span className="text-xs font-semibold text-orange-400">
                  {report.summary.buckets.aging60.percentage.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">
                {report.summary.buckets.aging60.label}
              </p>
              <p className="text-2xl font-bold text-orange-400">
                {formatCurrency(report.summary.buckets.aging60.total)}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {report.summary.buckets.aging60.count} shipments
              </p>
            </button>

            {/* 90+ days */}
            <button
              onClick={() => setSelectedBucket('aging90')}
              className={`text-left p-4 rounded-lg border-2 transition-all ${
                selectedBucket === 'aging90' ? 'border-red-500 bg-red-500/10' : 'border-white/10 hover:border-red-500/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-xs font-semibold text-red-400">
                  {report.summary.buckets.aging90.percentage.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">
                {report.summary.buckets.aging90.label}
              </p>
              <p className="text-2xl font-bold text-red-400">
                {formatCurrency(report.summary.buckets.aging90.total)}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {report.summary.buckets.aging90.count} shipments
              </p>
            </button>
          </div>
        </Section>

        {/* Total Summary */}
        <Section className="pb-6">
          <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)] uppercase tracking-wide">Total Outstanding</p>
                  <p className="text-3xl font-bold text-[var(--text-primary)] mt-2">
                    {formatCurrency(report.summary.totalAmountDue)}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Across {report.summary.totalShipments} shipments
                  </p>
                </div>
                <TrendingUp className="w-12 h-12 text-cyan-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* Details Table */}
        <Section className="pb-16">
          <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
            <CardHeader className="p-4 border-b border-white/5">
              <CardTitle className="text-lg font-bold text-[var(--text-primary)]">
                {report.summary.buckets[selectedBucket].label} - Detailed View
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {selectedDetails.length === 0 ? (
                <div className="p-8 text-center text-[var(--text-secondary)]">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No shipments in this category</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Tracking</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Vehicle</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">User</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase">Amount Due</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase">Age (Days)</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {selectedDetails.map((shipment) => (
                        <tr key={shipment.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                            <Link
                              href={`/dashboard/shipments/${shipment.id}`}
                              className="text-cyan-400 hover:text-cyan-300 hover:underline"
                            >
                              {shipment.trackingNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                            {shipment.vehicleMake} {shipment.vehicleModel}
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                            {shipment.user.name || shipment.user.email}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-[var(--text-primary)]">
                            {formatCurrency(shipment.amountDue)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${getBucketColor(selectedBucket)}`}>
                              {shipment.ageInDays} days
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                            {formatDate(shipment.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </Section>
      </div>
    </AdminRoute>
  );
}
