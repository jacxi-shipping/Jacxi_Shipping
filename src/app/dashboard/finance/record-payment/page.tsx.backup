'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Section from '@/components/layout/Section';
import AdminRoute from '@/components/auth/AdminRoute';

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface Shipment {
  id: string;
  trackingNumber: string;
  vehicleMake?: string;
  vehicleModel?: string;
  price?: number;
  paymentStatus: string;
}

export default function RecordPaymentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>([]);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingShipments, setLoadingShipments] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user?.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    fetchUsers();
  }, [session, status, router]);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserShipments(selectedUserId);
    } else {
      setShipments([]);
      setSelectedShipmentIds([]);
    }
  }, [selectedUserId]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchUserShipments = async (userId: string) => {
    try {
      setLoadingShipments(true);
      const response = await fetch(`/api/shipments?userId=${userId}&limit=100`);
      if (response.ok) {
        const data = await response.json();
        // Filter to show only shipments with pending or partially paid status
        const dueShipments = data.shipments.filter(
          (s: Shipment) => s.paymentStatus === 'PENDING' || s.paymentStatus === 'FAILED'
        );
        setShipments(dueShipments);
      }
    } catch (error) {
      console.error('Error fetching shipments:', error);
    } finally {
      setLoadingShipments(false);
    }
  };

  const handleShipmentToggle = (shipmentId: string) => {
    setSelectedShipmentIds((prev) =>
      prev.includes(shipmentId)
        ? prev.filter((id) => id !== shipmentId)
        : [...prev, shipmentId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!selectedUserId) {
      setError('Please select a user');
      return;
    }
    if (selectedShipmentIds.length === 0) {
      setError('Please select at least one shipment');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/ledger/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUserId,
          shipmentIds: selectedShipmentIds,
          amount: parseFloat(amount),
          notes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Payment recorded successfully!');
        // Reset form
        setSelectedShipmentIds([]);
        setAmount('');
        setNotes('');
        // Refresh shipments
        fetchUserShipments(selectedUserId);
        
        // Show success message and redirect after 2 seconds
        setTimeout(() => {
          router.push('/dashboard/finance');
        }, 2000);
      } else {
        setError(data.error || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      setError('An error occurred while recording the payment');
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

  const totalSelectedAmount = shipments
    .filter((s) => selectedShipmentIds.includes(s.id))
    .reduce((sum, s) => sum + (s.price || 0), 0);

  if (status === 'loading') {
    return (
      <AdminRoute>
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
          <div className="text-center space-y-4 text-[var(--text-secondary)]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--border)] border-t-[var(--accent-gold)] mx-auto" />
            <p>Loading...</p>
          </div>
        </div>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <div className="min-h-screen bg-[var(--background)]">
        <Section className="pt-6 pb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <Link href="/dashboard/finance">
                <Button variant="outline" size="sm" className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-semibold text-[var(--text-primary)]">Record Payment</h1>
                <p className="text-sm text-[var(--text-secondary)]">
                  Record a payment received from a user
                </p>
              </div>
            </div>
          </div>
        </Section>

        <Section className="pb-16">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* User Selection */}
            <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
              <CardHeader className="p-4 sm:p-6 border-b border-white/5">
                <CardTitle className="text-lg font-bold text-[var(--text-primary)]">Select User</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div>
                  <label htmlFor="user" className="block text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                    User <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="user"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] focus:ring-2 focus:ring-cyan-500/40"
                    required
                  >
                    <option value="">Select a user...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Shipments Selection */}
            {selectedUserId && (
              <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
                <CardHeader className="p-4 sm:p-6 border-b border-white/5">
                  <CardTitle className="text-lg font-bold text-[var(--text-primary)]">Select Shipments</CardTitle>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Select the shipment(s) this payment applies to
                  </p>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  {loadingShipments ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-[var(--border)] border-t-[var(--accent-gold)] mx-auto mb-4" />
                      <p className="text-[var(--text-secondary)]">Loading shipments...</p>
                    </div>
                  ) : shipments.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-[var(--text-secondary)] opacity-50" />
                      <p className="text-[var(--text-secondary)]">No pending shipments found for this user</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {shipments.map((shipment) => (
                        <label
                          key={shipment.id}
                          className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all hover:border-cyan-500/50 ${
                            selectedShipmentIds.includes(shipment.id)
                              ? 'border-cyan-500 bg-cyan-500/10'
                              : 'border-white/10'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedShipmentIds.includes(shipment.id)}
                            onChange={() => handleShipmentToggle(shipment.id)}
                            className="w-5 h-5 text-cyan-500 border-cyan-500/30 focus:ring-cyan-500/50 rounded"
                          />
                          <div className="ml-3 flex-1">
                            <div className="text-sm font-semibold text-[var(--text-primary)]">
                              {shipment.trackingNumber}
                            </div>
                            <div className="text-xs text-[var(--text-secondary)]">
                              {shipment.vehicleMake} {shipment.vehicleModel}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-[var(--text-primary)]">
                            {formatCurrency(shipment.price || 0)}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {selectedShipmentIds.length > 0 && (
                    <div className="mt-4 p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          Total Selected Amount:
                        </span>
                        <span className="text-lg font-bold text-cyan-400">
                          {formatCurrency(totalSelectedAmount)}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Payment Details */}
            {selectedUserId && selectedShipmentIds.length > 0 && (
              <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
                <CardHeader className="p-4 sm:p-6 border-b border-white/5">
                  <CardTitle className="text-lg font-bold text-[var(--text-primary)]">Payment Details</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <div>
                    <label htmlFor="amount" className="block text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Amount Received (USD) <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-5 w-5 text-[var(--text-secondary)]" />
                      </div>
                      <input
                        type="number"
                        id="amount"
                        step="0.01"
                        min="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40"
                        required
                      />
                    </div>
                    {parseFloat(amount) > totalSelectedAmount && (
                      <p className="mt-2 text-xs text-yellow-400">
                        ⚠ Amount exceeds total selected shipments. Excess will remain as unapplied credit.
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="notes" className="block text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      id="notes"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes about this payment..."
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-cyan-500/40 resize-none"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error/Success Messages */}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {success}
                </div>
              </div>
            )}

            {/* Submit Button */}
            {selectedUserId && selectedShipmentIds.length > 0 && (
              <div className="flex justify-end gap-3">
                <Link href="/dashboard/finance">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
                  >
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-[var(--accent-gold)] hover:bg-[var(--accent-gold)]"
                  style={{ color: 'white' }}
                >
                  {loading ? 'Recording...' : 'Record Payment'}
                </Button>
              </div>
            )}
          </form>
        </Section>
      </div>
    </AdminRoute>
  );
}
