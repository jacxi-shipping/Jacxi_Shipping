'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Box, TextField, Grid, Select, MenuItem, FormControl, InputLabel, Checkbox, Divider, InputAdornment } from '@mui/material';
import { ArrowLeft, DollarSign, AlertCircle, CheckCircle2, User, CreditCard, FileText } from 'lucide-react';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { PageHeader, Button, Breadcrumbs, toast, LoadingState, EmptyState, StatusBadge, StatsCard , DashboardPageSkeleton, DetailPageSkeleton, FormPageSkeleton} from '@/components/design-system';
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
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
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
      toast.error('Failed to load users');
    }
  };

  const fetchUserShipments = async (userId: string) => {
    try {
      setLoadingShipments(true);
      const response = await fetch(`/api/shipments?userId=${userId}&limit=100`);
      if (response.ok) {
        const data = await response.json();
        const dueShipments = data.shipments.filter(
          (s: Shipment) => s.paymentStatus === 'PENDING' || s.paymentStatus === 'FAILED'
        );
        setShipments(dueShipments);
      }
    } catch (error) {
      console.error('Error fetching shipments:', error);
      toast.error('Failed to load shipments');
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

    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }
    if (selectedShipmentIds.length === 0) {
      toast.error('Please select at least one shipment');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
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
          paymentMethod,
          notes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Payment recorded successfully!');
        setTimeout(() => {
          router.push('/dashboard/finance');
        }, 1500);
      } else {
        toast.error(data.error || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('An error occurred while recording the payment');
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

  const selectedUser = users.find(u => u.id === selectedUserId);

  if (status === 'loading') {
    return (
      <AdminRoute>
        <DashboardPageSkeleton />
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <DashboardSurface>
        <Box sx={{ px: 2, pt: 2 }}>
          <Breadcrumbs />
        </Box>

        <PageHeader
          title="Record Payment"
          description="Record a payment received from a customer"
          actions={
            <Link href="/dashboard/finance" style={{ textDecoration: 'none' }}>
              <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
                Back to Finance
              </Button>
            </Link>
          }
        />

        {/* Stats Summary */}
        {selectedUserId && (
          <Box sx={{ px: 2, mb: 3 }}>
            <DashboardGrid className="grid-cols-1 md:grid-cols-3">
              <StatsCard
                icon={<User style={{ fontSize: 18 }} />}
                title="Selected Customer"
                value={selectedUser?.name || selectedUser?.email || 'N/A'}
                variant="info"
                size="md"
              />
              <StatsCard
                icon={<FileText style={{ fontSize: 18 }} />}
                title="Pending Shipments"
                value={shipments.length.toString()}
                variant="warning"
                size="md"
              />
              <StatsCard
                icon={<DollarSign style={{ fontSize: 18 }} />}
                title="Total Due"
                value={formatCurrency(totalSelectedAmount)}
                variant="success"
                size="md"
              />
            </DashboardGrid>
          </Box>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ px: 2, pb: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* User Selection */}
            <Box>
              <DashboardPanel
                title="Customer Selection"
                description="Select the customer who made the payment"
              >
                <FormControl fullWidth size="small">
                  <InputLabel>Select Customer *</InputLabel>
                  <Select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    label="Select Customer *"
                    required
                  >
                    <MenuItem value="">
                      <em>Choose a customer...</em>
                    </MenuItem>
                    {users.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </MenuItem>
                    ))}
                  </Select>
                  </FormControl>
                </DashboardPanel>
              </Box>

            {/* Shipments Selection */}
            {selectedUserId && (
              <Box>
                <DashboardPanel
                  title="Select Shipments"
                  description="Choose which shipments this payment applies to"
                >
                  {loadingShipments ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <LoadingState message="Loading shipments..." />
                    </Box>
                  ) : shipments.length === 0 ? (
                    <EmptyState
                      icon={<AlertCircle className="w-12 h-12" />}
                      title="No Pending Shipments"
                      description="This customer has no pending payments"
                    />
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {shipments.map((shipment) => (
                        <Box
                          key={shipment.id}
                          sx={{
                            p: 2,
                            border: '1px solid',
                            borderColor: selectedShipmentIds.includes(shipment.id) 
                              ? 'var(--accent-gold)' 
                              : 'var(--border)',
                            borderRadius: 2,
                            bgcolor: selectedShipmentIds.includes(shipment.id) 
                              ? 'rgba(201, 155, 47, 0.1)' 
                              : 'transparent',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                              borderColor: 'var(--accent-gold)',
                              bgcolor: 'rgba(201, 155, 47, 0.05)',
                            },
                          }}
                          onClick={() => handleShipmentToggle(shipment.id)}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Checkbox
                              checked={selectedShipmentIds.includes(shipment.id)}
                              onChange={() => handleShipmentToggle(shipment.id)}
                              sx={{ 
                                color: 'var(--accent-gold)',
                                '&.Mui-checked': { color: 'var(--accent-gold)' },
                              }}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', mb: 0.5 }}>
                                {shipment.trackingNumber}
                              </Box>
                              <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {shipment.vehicleMake} {shipment.vehicleModel}
                              </Box>
                            </Box>
                            <Box sx={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {formatCurrency(shipment.price || 0)}
                            </Box>
                          </Box>
                        </Box>
                      ))}

                      {selectedShipmentIds.length > 0 && (
                        <>
                          <Divider sx={{ my: 2, borderColor: 'var(--border)' }} />
                          <Box
                            sx={{
                              p: 3,
                              borderRadius: 2,
                              bgcolor: 'rgba(201, 155, 47, 0.15)',
                              border: '1px solid var(--accent-gold)',
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box sx={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                Total Selected Amount:
                              </Box>
                              <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                                {formatCurrency(totalSelectedAmount)}
                              </Box>
                            </Box>
                          </Box>
                        </>
                      )}
                    </Box>
                  )}
                </DashboardPanel>
              </Box>
            )}

            {/* Payment Details */}
            {selectedUserId && selectedShipmentIds.length > 0 && (
              <Box>
                <DashboardPanel
                  title="Payment Details"
                  description="Enter the payment amount and method"
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                      <TextField
                        fullWidth
                        label="Amount Received (USD)"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        required
                        size="small"
                        inputProps={{ step: '0.01', min: '0.01' }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <DollarSign className="w-4 h-4 text-[var(--text-secondary)]" />
                            </InputAdornment>
                          ),
                        }}
                        helperText={
                          parseFloat(amount) > totalSelectedAmount
                            ? '⚠ Amount exceeds total. Excess will remain as credit.'
                            : ''
                        }
                      />

                      <FormControl fullWidth size="small">
                        <InputLabel>Payment Method</InputLabel>
                        <Select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          label="Payment Method"
                        >
                          <MenuItem value="CASH">Cash</MenuItem>
                          <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                          <MenuItem value="CHECK">Check</MenuItem>
                          <MenuItem value="CREDIT_CARD">Credit Card</MenuItem>
                          <MenuItem value="WIRE">Wire Transfer</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    <TextField
                        fullWidth
                        label="Notes (Optional)"
                        multiline
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Additional notes about this payment..."
                        size="small"
                      />

                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                        <Link href="/dashboard/finance" style={{ textDecoration: 'none' }}>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={loading}
                          >
                            Cancel
                          </Button>
                        </Link>
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          icon={<CheckCircle2 className="w-4 h-4" />}
                          disabled={loading}
                        >
                          {loading ? 'Recording...' : 'Record Payment'}
                        </Button>
                      </Box>
                  </Box>
                </DashboardPanel>
              </Box>
            )}
          </Box>
        </Box>
      </DashboardSurface>
    </AdminRoute>
  );
}
