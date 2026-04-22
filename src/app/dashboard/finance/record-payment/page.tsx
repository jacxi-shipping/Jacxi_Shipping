'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Box, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Checkbox, 
  Divider, 
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip
} from '@mui/material';
import { 
  ArrowLeft, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  FileText,
  CreditCard,
  ArrowRight,
  Info
} from 'lucide-react';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { PageHeader, Button, Breadcrumbs, toast, LoadingState, EmptyState, DashboardPageSkeleton } from '@/components/design-system';
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
  amountDue?: number;
  paymentStatus: string;
}

interface PaymentAllocation {
  shipmentId: string;
  trackingNumber: string;
  vehicleInfo: string;
  amountDue: number;
  amountToPay: number;
}

type TransactionInfoType = 'CAR_PAYMENT' | 'SHIPPING_PAYMENT' | 'STORAGE_PAYMENT';

const transactionInfoTypeLabels: Record<TransactionInfoType, string> = {
  CAR_PAYMENT: 'Car Payment',
  SHIPPING_PAYMENT: 'Shipping Payment',
  STORAGE_PAYMENT: 'Storage Payment',
};

const steps = ['Select Customer', 'Choose Shipments', 'Payment Details', 'Review & Submit'];

export default function RecordPaymentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>([]);
  
  // Form state
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [transactionInfoType, setTransactionInfoType] = useState<TransactionInfoType>('SHIPPING_PAYMENT');
  const [notes, setNotes] = useState('');
  
  // UI state
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingShipments, setLoadingShipments] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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
      setActiveStep(0);
    }
  }, [selectedUserId]);

  // Auto-fill amount when shipments are selected
  useEffect(() => {
    if (selectedShipmentIds.length > 0 && !amount) {
      const total = calculateTotalSelected();
      setAmount(total.toFixed(2));
    }
  }, [selectedShipmentIds]);

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
      const response = await fetch(`/api/shipments?userId=${userId}&limit=100&includeFinancial=true`);
      if (response.ok) {
        const data = await response.json();
        const dueShipments = data.shipments.filter(
          (s: Shipment) =>
            s.paymentStatus === 'PENDING' || s.paymentStatus === 'FAILED'
        );
        setShipments(dueShipments);
        if (dueShipments.length > 0) {
          setActiveStep(1);
        }
      }
    } catch (error) {
      console.error('Error fetching shipments:', error);
      toast.error('Failed to load shipments');
    } finally {
      setLoadingShipments(false);
    }
  };

  const handleShipmentToggle = (shipmentId: string) => {
    setSelectedShipmentIds((prev) => {
      const newSelection = prev.includes(shipmentId)
        ? prev.filter((id) => id !== shipmentId)
        : [...prev, shipmentId];
      
      // Clear amount when shipments change so it can auto-fill
      if (newSelection.length !== prev.length) {
        setAmount('');
      }
      
      return newSelection;
    });
  };

  const calculateTotalSelected = () => {
    // ⚡ Bolt: Replaced chained .filter().reduce() with a single O(N) loop
    const selectedSet = new Set(selectedShipmentIds);
    let total = 0;
    for (const s of shipments) {
      if (selectedSet.has(s.id)) {
        total += (s.amountDue || s.price || 0);
      }
    }
    return total;
  };

  const calculatePaymentAllocation = (): PaymentAllocation[] => {
    const paymentAmount = parseFloat(amount) || 0;
    let remainingPayment = paymentAmount;
    const allocations: PaymentAllocation[] = [];

    const selectedShips = shipments.filter(s => selectedShipmentIds.includes(s.id));

    for (const shipment of selectedShips) {
      if (remainingPayment <= 0) {
        allocations.push({
          shipmentId: shipment.id,
          trackingNumber: shipment.trackingNumber,
          vehicleInfo: `${shipment.vehicleMake} ${shipment.vehicleModel}`,
          amountDue: shipment.amountDue || shipment.price || 0,
          amountToPay: 0,
        });
      } else {
        const amountDue = shipment.amountDue || shipment.price || 0;
        const amountToPay = Math.min(remainingPayment, amountDue);
        remainingPayment -= amountToPay;

        allocations.push({
          shipmentId: shipment.id,
          trackingNumber: shipment.trackingNumber,
          vehicleInfo: `${shipment.vehicleMake} ${shipment.vehicleModel}`,
          amountDue,
          amountToPay,
        });
      }
    }

    return allocations;
  };

  const handleNext = () => {
    if (activeStep === 0 && !selectedUserId) {
      toast.error('Please select a customer');
      return;
    }
    if (activeStep === 1 && selectedShipmentIds.length === 0) {
      toast.error('Please select at least one shipment');
      return;
    }
    if (activeStep === 2) {
      if (!amount || parseFloat(amount) <= 0) {
        toast.error('Please enter a valid payment amount');
        return;
      }
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!selectedUserId || selectedShipmentIds.length === 0 || !amount || parseFloat(amount) <= 0) {
      toast.error('Please complete all required fields');
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
          transactionInfoType,
          notes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Payment recorded successfully!');
        setShowConfirmDialog(false);
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

  const totalSelectedAmount = calculateTotalSelected();
  const selectedUser = users.find(u => u.id === selectedUserId);
  const paymentAmount = parseFloat(amount) || 0;
  const paymentAllocations = calculatePaymentAllocation();
  const isOverpayment = paymentAmount > totalSelectedAmount;
  const isPartialPayment = paymentAmount < totalSelectedAmount && paymentAmount > 0;

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

        {/* Progress Stepper */}
        <Box sx={{ px: 4, py: 3, bgcolor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <Box sx={{ px: 2, pb: 4, pt: 3 }}>
          {/* Step 1: Customer Selection */}
          {activeStep === 0 && (
            <DashboardPanel
              title="Step 1: Select Customer"
              description="Choose the customer who made the payment"
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <FormControl fullWidth size="medium">
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <User className="w-4 h-4" />
                          <span>{user.name || user.email}</span>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {selectedUserId && (
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      onClick={handleNext}
                      variant="primary"
                      icon={<ArrowRight className="w-4 h-4" />}
                    >
                      Continue to Shipments
                    </Button>
                  </Box>
                )}
              </Box>
            </DashboardPanel>
          )}

          {/* Step 2: Shipment Selection */}
          {activeStep === 1 && (
            <DashboardPanel
              title="Step 2: Select Shipments"
              description={`Choose which shipments to apply the payment to for ${selectedUser?.name || selectedUser?.email}`}
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
                  <Alert severity="info" icon={<Info className="w-5 h-5" />}>
                    Select one or more shipments to apply this payment to. The payment will be distributed in order.
                  </Alert>

                  {shipments.map((shipment) => (
                    <Box
                      key={shipment.id}
                      sx={{
                        p: 2.5,
                        border: '2px solid',
                        borderColor: selectedShipmentIds.includes(shipment.id) 
                          ? 'var(--accent-gold)' 
                          : 'var(--border)',
                        borderRadius: 2,
                        bgcolor: selectedShipmentIds.includes(shipment.id) 
                          ? 'rgba(201, 155, 47, 0.08)' 
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Box sx={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {shipment.trackingNumber}
                            </Box>
                            <Chip 
                              label={shipment.paymentStatus} 
                              size="small" 
                              color={shipment.paymentStatus === 'FAILED' ? 'error' : 'warning'}
                              sx={{ fontSize: '0.7rem' }}
                            />
                          </Box>
                          <Box sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {shipment.vehicleMake} {shipment.vehicleModel}
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>
                            Amount Due
                          </Box>
                          <Box sx={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                            {formatCurrency(shipment.amountDue || shipment.price || 0)}
                          </Box>
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
                          bgcolor: 'rgba(201, 155, 47, 0.12)',
                          border: '2px solid var(--accent-gold)',
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Box sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)', mb: 0.5 }}>
                              Total Selected Amount
                            </Box>
                            <Box sx={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                              {selectedShipmentIds.length} shipment{selectedShipmentIds.length !== 1 ? 's' : ''} selected
                            </Box>
                          </Box>
                          <Box sx={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                            {formatCurrency(totalSelectedAmount)}
                          </Box>
                        </Box>
                      </Box>
                    </>
                  )}

                  <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button
                      onClick={handleBack}
                      variant="outline"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      variant="primary"
                      disabled={selectedShipmentIds.length === 0}
                      icon={<ArrowRight className="w-4 h-4" />}
                    >
                      Continue to Payment
                    </Button>
                  </Box>
                </Box>
              )}
            </DashboardPanel>
          )}

          {/* Step 3: Payment Details */}
          {activeStep === 2 && (
            <DashboardPanel
              title="Step 3: Enter Payment Details"
              description="Enter the payment amount received and payment method"
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Payment Summary */}
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: 'rgba(201, 155, 47, 0.08)',
                    border: '1px solid var(--accent-gold)',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Payment Summary
                    </Box>
                    <Box sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {selectedShipmentIds.length} shipment{selectedShipmentIds.length !== 1 ? 's' : ''}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                      Total Amount Due:
                    </Box>
                    <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                      {formatCurrency(totalSelectedAmount)}
                    </Box>
                  </Box>
                </Box>

                {/* Amount Input */}
                <TextField
                  fullWidth
                  label="Amount Received (USD) *"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  size="medium"
                  inputProps={{ step: '0.01', min: '0.01' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <DollarSign className="w-5 h-5 text-[var(--text-secondary)]" />
                      </InputAdornment>
                    ),
                  }}
                  helperText={
                    isOverpayment
                      ? '⚠️ Amount exceeds total due. Excess will remain as customer credit.'
                      : isPartialPayment
                      ? '💡 This is a partial payment. Remaining balance will stay pending.'
                      : paymentAmount === totalSelectedAmount && paymentAmount > 0
                      ? '✓ Full payment - all selected shipments will be marked as paid.'
                      : 'Enter the payment amount received from the customer'
                  }
                  error={paymentAmount > 0 && (isOverpayment || isPartialPayment)}
                />

                {/* Payment Method */}
                <FormControl fullWidth size="medium">
                  <InputLabel>Payment Method *</InputLabel>
                  <Select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    label="Payment Method *"
                  >
                    <MenuItem value="CASH">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DollarSign className="w-4 h-4" />
                        Cash
                      </Box>
                    </MenuItem>
                    <MenuItem value="BANK_TRANSFER">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CreditCard className="w-4 h-4" />
                        Bank Transfer
                      </Box>
                    </MenuItem>
                    <MenuItem value="CHECK">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FileText className="w-4 h-4" />
                        Check
                      </Box>
                    </MenuItem>
                    <MenuItem value="CREDIT_CARD">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CreditCard className="w-4 h-4" />
                        Credit Card
                      </Box>
                    </MenuItem>
                    <MenuItem value="WIRE">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CreditCard className="w-4 h-4" />
                        Wire Transfer
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth size="medium">
                  <InputLabel>Transaction Info Type *</InputLabel>
                  <Select
                    value={transactionInfoType}
                    onChange={(e) => setTransactionInfoType(e.target.value as TransactionInfoType)}
                    label="Transaction Info Type *"
                  >
                    {(Object.entries(transactionInfoTypeLabels) as Array<[TransactionInfoType, string]>).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Notes */}
                <TextField
                  fullWidth
                  label="Notes (Optional)"
                  multiline
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes about this payment (e.g., reference number, check number, etc.)"
                  size="medium"
                />

                {/* Navigation */}
                <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    onClick={handleBack}
                    variant="outline"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    variant="primary"
                    disabled={!amount || parseFloat(amount) <= 0}
                    icon={<ArrowRight className="w-4 h-4" />}
                  >
                    Review Payment
                  </Button>
                </Box>
              </Box>
            </DashboardPanel>
          )}

          {/* Step 4: Review & Confirm */}
          {activeStep === 3 && (
            <DashboardPanel
              title="Step 4: Review & Confirm"
              description="Review the payment details before submitting"
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Customer Info */}
                <Box>
                  <Box sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', mb: 1 }}>
                    Customer
                  </Box>
                  <Box sx={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {selectedUser?.name || selectedUser?.email}
                  </Box>
                </Box>

                <Divider />

                {/* Payment Details Summary */}
                <Box>
                  <Box sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', mb: 2 }}>
                    Payment Details
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>
                        Payment Amount
                      </Box>
                      <Box sx={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                        {formatCurrency(paymentAmount)}
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>
                        Payment Method
                      </Box>
                      <Box sx={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {paymentMethod.replace('_', ' ')}
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>
                        Transaction Type
                      </Box>
                      <Box sx={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {transactionInfoTypeLabels[transactionInfoType]}
                      </Box>
                    </Box>
                  </Box>
                </Box>

                <Divider />

                {/* Payment Allocation */}
                <Box>
                  <Box sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', mb: 2 }}>
                    Payment Allocation
                  </Box>
                  
                  <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid var(--border)' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'var(--surface)' }}>
                          <TableCell sx={{ fontWeight: 600 }}>Tracking #</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Vehicle</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>Amount Due</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>Amount to Pay</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paymentAllocations.map((allocation) => (
                          <TableRow key={allocation.shipmentId}>
                            <TableCell>{allocation.trackingNumber}</TableCell>
                            <TableCell>{allocation.vehicleInfo}</TableCell>
                            <TableCell align="right">{formatCurrency(allocation.amountDue)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, color: 'var(--accent-gold)' }}>
                              {formatCurrency(allocation.amountToPay)}
                            </TableCell>
                            <TableCell align="right">
                              <Chip 
                                label={allocation.amountToPay >= allocation.amountDue ? 'PAID' : 'PARTIAL'}
                                size="small"
                                color={allocation.amountToPay >= allocation.amountDue ? 'success' : 'warning'}
                                sx={{ fontSize: '0.7rem', fontWeight: 600 }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Summary Row */}
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(201, 155, 47, 0.08)', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ fontSize: '0.9rem', fontWeight: 600 }}>Total Payment:</Box>
                      <Box sx={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                        {formatCurrency(paymentAmount)}
                      </Box>
                    </Box>
                  </Box>
                </Box>

                {/* Warnings/Info */}
                {isOverpayment && (
                  <Alert severity="warning" icon={<AlertCircle className="w-5 h-5" />}>
                    <strong>Overpayment:</strong> The payment amount exceeds the total due by {formatCurrency(paymentAmount - totalSelectedAmount)}. 
                    This excess will be credited to the customer's account.
                  </Alert>
                )}

                {isPartialPayment && (
                  <Alert severity="info" icon={<Info className="w-5 h-5" />}>
                    <strong>Partial Payment:</strong> This payment will cover {formatCurrency(paymentAmount)} of the total {formatCurrency(totalSelectedAmount)}. 
                    The remaining {formatCurrency(totalSelectedAmount - paymentAmount)} will stay pending.
                  </Alert>
                )}

                {notes && (
                  <Box>
                    <Box sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', mb: 1 }}>
                      Notes
                    </Box>
                    <Box sx={{ p: 2, bgcolor: 'var(--surface)', borderRadius: 1, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {notes}
                    </Box>
                  </Box>
                )}

                {/* Navigation */}
                <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setShowConfirmDialog(true)}
                    variant="primary"
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    disabled={loading}
                  >
                    Record Payment
                  </Button>
                </Box>
              </Box>
            </DashboardPanel>
          )}
        </Box>

        {/* Confirmation Dialog */}
        <Dialog 
          open={showConfirmDialog} 
          onClose={() => !loading && setShowConfirmDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 600 }}>
            Confirm Payment Recording
          </DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              You are about to record a payment of <strong>{formatCurrency(paymentAmount)}</strong> from{' '}
              <strong>{selectedUser?.name || selectedUser?.email}</strong>.
            </Alert>
            <Box sx={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              This action will:
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>Create a ledger entry for this payment</li>
                <li>Update the customer's balance</li>
                <li>Apply the payment to {selectedShipmentIds.length} selected shipment{selectedShipmentIds.length !== 1 ? 's' : ''}</li>
                <li>Update shipment payment statuses accordingly</li>
              </ul>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setShowConfirmDialog(false)}
              variant="outline"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="primary"
              icon={<CheckCircle2 className="w-4 h-4" />}
              disabled={loading}
            >
              {loading ? 'Recording...' : 'Confirm & Record'}
            </Button>
          </DialogActions>
        </Dialog>
      </DashboardSurface>
    </AdminRoute>
  );
}
