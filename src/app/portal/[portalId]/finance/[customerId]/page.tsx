'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import { Box, Typography } from '@mui/material';
import { DashboardGrid, DashboardHeader, DashboardPanel, DashboardSurface } from '@/components/dashboard/DashboardSurface';
import { Button, EmptyState, PaymentStatusBadge, toast } from '@/components/design-system';
import { DataTable, type Column } from '@/components/ui/DataTable';

type PortalInfo = {
  id: string;
  name: string;
  code: string | null;
  companyLabel?: string | null;
};

type CustomerInfo = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
  createdAt: string;
};

type InvoiceHistoryRow = {
  id: string;
  invoiceNumber: string;
  status: 'DRAFT' | 'PENDING' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  total: number;
  issueDate: string;
  dueDate: string | null;
  paidDate: string | null;
  daysOverdue: number | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  shipmentId: string;
  shipmentReference: string;
  lineItemCount: number;
};

type UnbilledChargeRow = {
  id: string;
  shipmentId: string;
  shipmentReference: string;
  chargeCode: string;
  category: string;
  description: string;
  billingMilestone: string;
  status: string;
  totalAmount: number;
  billableAt: string | null;
  createdAt: string;
};

type ShipmentRow = {
  id: string;
  reference: string;
  paymentStatus: string;
  assignedAt: string;
  notes: string | null;
};

type CustomerFinanceDetailResponse = {
  portal: PortalInfo;
  customer: CustomerInfo;
  summary: {
    linkedShipmentCount: number;
    invoiceCount: number;
    openInvoiceCount: number;
    overdueInvoiceCount: number;
    outstandingAmount: number;
    overdueAmount: number;
    paidAmount: number;
    unbilledAmount: number;
    unbilledChargeCount: number;
  };
  aging: {
    current: { count: number; amount: number };
    days1to30: { count: number; amount: number };
    days31to60: { count: number; amount: number };
    days61to90: { count: number; amount: number };
    days90plus: { count: number; amount: number };
  };
  invoices: InvoiceHistoryRow[];
  unbilledCharges: UnbilledChargeRow[];
  shipments: ShipmentRow[];
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
}

function formatDate(value: string | null) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleDateString();
}

export default function PortalCustomerFinanceDetailPage() {
  const params = useParams();
  const portalId = String(params.portalId || '');
  const customerId = String(params.customerId || '');
  const [data, setData] = useState<CustomerFinanceDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/partner-portals/${portalId}/finance/${customerId}`, { cache: 'no-store' });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load customer finance');
        }

        if (!cancelled) {
          setData(payload);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Failed to load customer finance');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (portalId && customerId) {
      void fetchDetail();
    }

    return () => {
      cancelled = true;
    };
  }, [customerId, portalId]);

  const invoiceColumns = useMemo<Column<InvoiceHistoryRow>[]>(() => [
    {
      key: 'invoice',
      header: 'Invoice',
      render: (_, row) => (
        <Box sx={{ display: 'grid', gap: 0.35 }}>
          <Typography sx={{ fontSize: '0.92rem', fontWeight: 700 }}>{row.invoiceNumber}</Typography>
          <Typography sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Issued {formatDate(row.issueDate)}</Typography>
        </Box>
      ),
    },
    {
      key: 'shipment',
      header: 'Shipment',
      render: (_, row) => row.shipmentReference,
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, row) => <PaymentStatusBadge status={row.status === 'SENT' ? 'PENDING' : row.status === 'DRAFT' || row.status === 'CANCELLED' ? 'PENDING' : row.status} />,
    },
    {
      key: 'due',
      header: 'Due',
      render: (_, row) => row.dueDate ? `${formatDate(row.dueDate)}${row.daysOverdue && row.daysOverdue > 0 ? ` (${row.daysOverdue}d overdue)` : ''}` : '—',
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (_, row) => formatCurrency(row.total),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Link href={`/portal/${portalId}/shipments/${row.shipmentId}`} style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm">
              <OpenInNewOutlinedIcon sx={{ fontSize: 16 }} />
              Shipment
            </Button>
          </Link>
          <a href={`/api/partner-portals/${portalId}/finance/invoices/${row.id}/pdf`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm">View PDF</Button>
          </a>
          <a href={`/api/partner-portals/${portalId}/finance/invoices/${row.id}/pdf?download=1`} style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm">Download</Button>
          </a>
        </Box>
      ),
    },
  ], [portalId]);

  const chargeColumns = useMemo<Column<UnbilledChargeRow>[]>(() => [
    {
      key: 'shipment',
      header: 'Shipment',
      render: (_, row) => row.shipmentReference,
    },
    {
      key: 'description',
      header: 'Charge',
      render: (_, row) => (
        <Box sx={{ display: 'grid', gap: 0.35 }}>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 700 }}>{row.description}</Typography>
          <Typography sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{row.chargeCode} • {row.category.replace(/_/g, ' ')}</Typography>
        </Box>
      ),
    },
    {
      key: 'milestone',
      header: 'Milestone',
      render: (_, row) => row.billingMilestone.replace(/_/g, ' '),
    },
    {
      key: 'billableAt',
      header: 'Billable',
      render: (_, row) => formatDate(row.billableAt || row.createdAt),
    },
    {
      key: 'amount',
      header: 'Unbilled Amount',
      render: (_, row) => formatCurrency(row.totalAmount),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <Link href={`/portal/${portalId}/shipments/${row.shipmentId}`} style={{ textDecoration: 'none' }}>
          <Button variant="outline" size="sm">
            <OpenInNewOutlinedIcon sx={{ fontSize: 16 }} />
            Shipment
          </Button>
        </Link>
      ),
    },
  ], [portalId]);

  const shipmentColumns = useMemo<Column<ShipmentRow>[]>(() => [
    {
      key: 'reference',
      header: 'Shipment',
      render: (_, row) => row.reference,
    },
    {
      key: 'status',
      header: 'Payment Status',
      render: (_, row) => <PaymentStatusBadge status={row.paymentStatus === 'COMPLETED' ? 'PAID' : row.paymentStatus === 'PARTIALLY_PAID' ? 'PARTIAL' : row.paymentStatus === 'OVERDUE' ? 'OVERDUE' : 'PENDING'} />,
    },
    {
      key: 'assignedAt',
      header: 'Linked To Customer',
      render: (_, row) => formatDate(row.assignedAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <Link href={`/portal/${portalId}/shipments/${row.id}`} style={{ textDecoration: 'none' }}>
          <Button variant="outline" size="sm">Open</Button>
        </Link>
      ),
    },
  ], [portalId]);

  return (
    <DashboardSurface>
      <DashboardHeader
        title={data ? `${data.customer.name} Finance` : 'Customer Finance'}
        description="Review aging, invoice history, and unbilled shipment charges for this portal customer."
        meta={data ? [
          { label: 'Open', value: formatCurrency(data.summary.outstandingAmount), helper: `${data.summary.openInvoiceCount} open invoices` },
          { label: 'Overdue', value: formatCurrency(data.summary.overdueAmount), helper: `${data.summary.overdueInvoiceCount} overdue invoices` },
          { label: 'Unbilled', value: formatCurrency(data.summary.unbilledAmount), helper: `${data.summary.unbilledChargeCount} pending charges` },
          { label: 'Shipments', value: data.summary.linkedShipmentCount, helper: 'Linked to this customer' },
        ] : undefined}
        actions={
          <>
            <Link href={`/portal/${portalId}/finance`} style={{ textDecoration: 'none' }}>
              <Button variant="outline" size="sm">Back To Finance</Button>
            </Link>
            <Link href={`/portal/${portalId}/customers`} style={{ textDecoration: 'none' }}>
              <Button variant="outline" size="sm">Customers</Button>
            </Link>
          </>
        }
      />

      {loading ? (
        <DashboardPanel title="Loading customer finance" description="Collecting invoices and shipment charges for this customer.">
          <Box sx={{ color: 'var(--text-secondary)' }}>Loading customer finance...</Box>
        </DashboardPanel>
      ) : !data ? (
        <DashboardPanel title="Customer finance unavailable">
          <EmptyState icon={<AccountBalanceWalletOutlinedIcon />} title="Customer finance unavailable" description="This customer finance view could not be loaded." />
        </DashboardPanel>
      ) : (
        <>
          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[0.95fr_1.35fr]">
            <DashboardPanel title="Customer Profile" description="Portal identity and billing context for this customer.">
              <Box sx={{ display: 'grid', gap: 1.5 }}>
                <Box sx={{ display: 'grid', gap: 0.35 }}>
                  <Typography sx={{ fontSize: '1.1rem', fontWeight: 800 }}>{data.customer.name}</Typography>
                  <Typography sx={{ color: 'var(--text-secondary)' }}>{data.customer.email || 'No email saved'}</Typography>
                  <Typography sx={{ color: 'var(--text-secondary)' }}>{data.customer.phone || 'No phone saved'}</Typography>
                  <Typography sx={{ color: 'var(--text-secondary)' }}>{[data.customer.city, data.customer.country].filter(Boolean).join(', ') || 'No location saved'}</Typography>
                </Box>
                {data.customer.notes ? (
                  <Box sx={{ border: '1px solid var(--border)', borderRadius: 2.5, p: 1.5, bgcolor: 'rgba(15,23,42,0.03)' }}>
                    <Typography sx={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.75 }}>Portal Notes</Typography>
                    <Typography sx={{ color: 'var(--text-secondary)' }}>{data.customer.notes}</Typography>
                  </Box>
                ) : null}
                <Box sx={{ border: '1px solid var(--border)', borderRadius: 2.5, p: 1.5, bgcolor: 'rgba(var(--brand-primary-rgb),0.06)' }}>
                  <Typography sx={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.75 }}>Aging Buckets</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
                    {[
                      { label: 'Current', value: data.aging.current.amount, count: data.aging.current.count },
                      { label: '1-30 Days', value: data.aging.days1to30.amount, count: data.aging.days1to30.count },
                      { label: '31-60 Days', value: data.aging.days31to60.amount, count: data.aging.days31to60.count },
                      { label: '61-90 Days', value: data.aging.days61to90.amount, count: data.aging.days61to90.count },
                      { label: '90+ Days', value: data.aging.days90plus.amount, count: data.aging.days90plus.count },
                    ].map((bucket) => (
                      <Box key={bucket.label} sx={{ border: '1px solid var(--border)', borderRadius: 2, p: 1.25, bgcolor: '#fff' }}>
                        <Typography sx={{ fontSize: '0.74rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{bucket.label}</Typography>
                        <Typography sx={{ fontSize: '1rem', fontWeight: 800 }}>{formatCurrency(bucket.value)}</Typography>
                        <Typography sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{bucket.count} invoices</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            </DashboardPanel>

            <DashboardPanel title="Linked Shipments" description="Shipments currently mapped into this customer's portal workload.">
              {data.shipments.length === 0 ? (
                <EmptyState icon={<Inventory2OutlinedIcon />} title="No linked shipments" description="This customer does not have any linked shipments yet." />
              ) : (
                <DataTable data={data.shipments} columns={shipmentColumns} keyField="id" />
              )}
            </DashboardPanel>
          </DashboardGrid>

          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1.2fr_0.8fr]">
            <DashboardPanel title="Invoice History" description="Full invoice trail for this customer's linked shipments.">
              {data.invoices.length === 0 ? (
                <EmptyState icon={<ReceiptLongOutlinedIcon />} title="No invoice history" description="No invoices have been created yet for this customer's linked shipments." />
              ) : (
                <DataTable data={data.invoices} columns={invoiceColumns} keyField="id" />
              )}
            </DashboardPanel>

            <DashboardPanel title="Unbilled Charges" description="Shipment charges that exist but have not yet been invoiced.">
              {data.unbilledCharges.length === 0 ? (
                <EmptyState icon={<RequestQuoteOutlinedIcon />} title="No unbilled charges" description="All currently visible shipment charges for this customer are already invoiced or there are no charges yet." />
              ) : (
                <DataTable data={data.unbilledCharges} columns={chargeColumns} keyField="id" />
              )}
            </DashboardPanel>
          </DashboardGrid>

          <DashboardGrid className="grid-cols-1 gap-3 md:grid-cols-3">
            <Box sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2, bgcolor: 'rgba(var(--brand-primary-rgb),0.08)', display: 'grid', gap: 0.75 }}>
              <Typography sx={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Invoice History</Typography>
              <Typography sx={{ fontSize: '1.55rem', fontWeight: 800 }}>{data.summary.invoiceCount}</Typography>
              <HistoryOutlinedIcon sx={{ color: 'var(--text-secondary)' }} />
            </Box>
            <Box sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2, bgcolor: 'rgba(245,158,11,0.08)', display: 'grid', gap: 0.75 }}>
              <Typography sx={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Overdue Exposure</Typography>
              <Typography sx={{ fontSize: '1.55rem', fontWeight: 800 }}>{formatCurrency(data.summary.overdueAmount)}</Typography>
              <WarningAmberOutlinedIcon sx={{ color: 'var(--text-secondary)' }} />
            </Box>
            <Box sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2, bgcolor: 'rgba(15,23,42,0.05)', display: 'grid', gap: 0.75 }}>
              <Typography sx={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Unbilled Charges</Typography>
              <Typography sx={{ fontSize: '1.55rem', fontWeight: 800 }}>{formatCurrency(data.summary.unbilledAmount)}</Typography>
              <RequestQuoteOutlinedIcon sx={{ color: 'var(--text-secondary)' }} />
            </Box>
          </DashboardGrid>
        </>
      )}
    </DashboardSurface>
  );
}