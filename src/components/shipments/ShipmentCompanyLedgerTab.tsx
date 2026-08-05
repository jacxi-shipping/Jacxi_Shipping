'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, DollarSign, Plus, ReceiptText } from 'lucide-react';
import { Box, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material';
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, toast } from '@/components/design-system';
import type { Shipment } from '@/components/shipments/shipment-detail-types';

type ShipmentCompanyLedgerTabProps = {
  shipmentId: string;
  companies: Array<{ id: string; name: string; source: 'Shipping' | 'Dispatch' | 'Transit' }>;
  entries: NonNullable<Shipment['companyLedgerEntries']>;
  canManageLedger: boolean;
  onTransactionCreated: () => void;
};

type EntryForm = {
  description: string;
  amount: string;
  transactionDate: string;
  category: string;
  reference: string;
  notes: string;
};

const emptyForm = (): EntryForm => ({
  description: '',
  amount: '',
  transactionDate: new Date().toISOString().slice(0, 10),
  category: '',
  reference: '',
  notes: '',
});

function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function ShipmentCompanyLedgerTab({
  shipmentId,
  companies,
  entries,
  canManageLedger,
  onTransactionCreated,
}: ShipmentCompanyLedgerTabProps) {
  const [form, setForm] = useState<EntryForm>(emptyForm);
  const [isPayment, setIsPayment] = useState(false);
  const [open, setOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const company = companies.find((candidate) => candidate.id === selectedCompanyId) || companies[0] || null;
  const companyEntries = company ? entries.filter((entry) => entry.companyId === company.id) : [];

  const openEntryForm = (payment: boolean) => {
    setIsPayment(payment);
    setForm({
      ...emptyForm(),
      category: payment ? 'Payment' : '',
      description: payment ? `Payment to ${company?.name || 'Company'}` : '',
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!company) return;
    if (!form.description.trim()) {
      toast.error('Description is required');
      return;
    }

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter an amount greater than zero');
      return;
    }

    setPosting(true);
    try {
      const response = await fetch(`/api/finance/companies/${company.id}/ledger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: form.description.trim(),
          type: isPayment ? 'DEBIT' : 'CREDIT',
          amount,
          transactionDate: form.transactionDate,
          category: form.category.trim() || undefined,
          reference: form.reference.trim() || undefined,
          notes: form.notes.trim() || undefined,
          metadata: { shipmentId },
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save company transaction');
      }

      toast.success(isPayment ? 'Company payment recorded' : 'Company transaction added');
      setOpen(false);
      onTransactionCreated();
    } catch (error) {
      toast.error('Unable to save company transaction', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setPosting(false);
    }
  };

  if (!company) {
    return (
      <DashboardPanel title="Company Ledger" description="Company transactions linked to this shipment">
        <p className="py-4 text-sm text-[var(--text-secondary)]">Assign a shipping, dispatch, or transit company to use this ledger.</p>
      </DashboardPanel>
    );
  }

  return (
    <>
      <DashboardPanel
        title="Company Ledger"
        description={`Transactions with ${company.name} for this shipment`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/finance/companies/${company.id}`}>
              <Button variant="outline" size="sm" icon={<Building2 className="h-4 w-4" />}>Open Ledger</Button>
            </Link>
            {canManageLedger && (
              <>
                <Button variant="outline" size="sm" icon={<DollarSign className="h-4 w-4" />} onClick={() => openEntryForm(true)}>Record Payment</Button>
                <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => openEntryForm(false)}>Add Transaction</Button>
              </>
            )}
          </div>
        }
      >
        {companies.length > 1 && (
          <Box sx={{ maxWidth: 360, mb: 2 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Company ledger"
              value={company.id}
              onChange={(event) => setSelectedCompanyId(event.target.value)}
            >
              {companies.map((candidate) => (
                <MenuItem key={candidate.id} value={candidate.id}>{candidate.source}: {candidate.name}</MenuItem>
              ))}
            </TextField>
          </Box>
        )}
        {companyEntries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-[var(--text-secondary)]">
            <ReceiptText className="h-7 w-7 text-[var(--accent-gold)]" />
            <p className="text-sm">No company ledger transactions are linked to this shipment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] text-xs uppercase text-[var(--text-secondary)]">
                <tr><th className="px-3 py-3">Date</th><th className="px-3 py-3">Description</th><th className="px-3 py-3">Type</th><th className="px-3 py-3 text-right">Amount</th><th className="px-3 py-3 text-right">Balance</th></tr>
              </thead>
              <tbody>
                {companyEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-3 py-3 text-[var(--text-secondary)]">{new Date(entry.transactionDate).toLocaleDateString()}</td>
                    <td className="px-3 py-3 text-[var(--text-primary)]"><p className="font-medium">{entry.description}</p>{entry.notes && <p className="mt-1 text-xs text-[var(--text-secondary)]">{entry.notes}</p>}</td>
                    <td className="px-3 py-3"><span className={entry.type === 'DEBIT' ? 'text-emerald-600' : 'text-red-600'}>{entry.type === 'DEBIT' ? 'Payment' : 'Charge'}</span></td>
                    <td className="px-3 py-3 text-right font-medium text-[var(--text-primary)]">{formatMoney(entry.amount)}</td>
                    <td className="px-3 py-3 text-right text-[var(--text-secondary)]">{formatMoney(entry.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardPanel>

      <Dialog open={open} onClose={() => !posting && setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isPayment ? `Record Payment to ${company.name}` : `Add Transaction for ${company.name}`}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1.5 }}>
          <TextField label="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} required />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField label="Amount" type="number" inputProps={{ min: 0.01, step: 0.01 }} value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} required />
            <TextField label="Transaction Date" type="date" InputLabelProps={{ shrink: true }} value={form.transactionDate} onChange={(event) => setForm((current) => ({ ...current, transactionDate: event.target.value }))} />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField label="Category" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} />
            <TextField label="Reference" value={form.reference} onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))} />
          </Box>
          <TextField label="Notes" rows={3} multiline value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
        </DialogContent>
        <DialogActions><Button variant="outline" onClick={() => setOpen(false)} disabled={posting}>Cancel</Button><Button onClick={() => void handleSubmit()} disabled={posting}>{posting ? 'Saving...' : isPayment ? 'Record Payment' : 'Save Transaction'}</Button></DialogActions>
      </Dialog>
    </>
  );
}