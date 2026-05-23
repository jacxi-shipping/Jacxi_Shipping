'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material';
import { ArrowRightLeft, Building2, ExternalLink, Landmark, ReceiptText, Upload } from 'lucide-react';
import PermissionRoute from '@/components/auth/PermissionRoute';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Breadcrumbs, Button, StatsCard, TableSkeleton, toast } from '@/components/design-system';
import { DataTable, type Column } from '@/components/ui/DataTable';

interface CompanyListItem {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
  currentBalance: number;
  totalDebit: number;
  totalCredit: number;
  _count: {
    ledgerEntries: number;
  };
}

interface CompanySummary {
  totalDebit: number;
  totalCredit: number;
  totalExpenseCharges: number;
  currentBalance: number;
}

interface CompanyDetail {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
}

interface LedgerEntry {
  id: string;
  transactionDate: string;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  balance: number;
  category?: string | null;
  reference?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface ImportPreviewRow {
  transactionDate: string;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  reference: string | null;
  notes: string | null;
  isDuplicate: boolean;
  duplicateReason: 'ALREADY_IMPORTED' | 'DUPLICATE_IN_FILE' | null;
}

interface ImportPreview {
  totalCount: number;
  duplicateCount: number;
  importableCount: number;
  importableNetChange: number;
  currentBalance: number;
  projectedEndingBalance: number;
  statementEndingBalance: number | null;
  reconciliationDifference: number | null;
  reconciliationStatus: 'NOT_PROVIDED' | 'MATCH' | 'VARIANCE';
  rows: ImportPreviewRow[];
}

const emptySummary: CompanySummary = {
  totalDebit: 0,
  totalCredit: 0,
  totalExpenseCharges: 0,
  currentBalance: 0,
};

export default function BankingFinancePage() {
  const searchParams = useSearchParams();
  const companyIdFromQuery = searchParams.get('companyId') || '';

  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetail | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<CompanySummary>(emptySummary);
  const [bankEntries, setBankEntries] = useState<LedgerEntry[]>([]);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [previewingImport, setPreviewingImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importForm, setImportForm] = useState({
    category: 'Bank Statement',
    statementEndingBalance: '',
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const resetImportForm = () => {
    setImportFile(null);
    setImportPreview(null);
    setImportForm({
      category: 'Bank Statement',
      statementEndingBalance: '',
    });
  };

  const fetchCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const response = await fetch('/api/finance/companies');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load banking accounts');
      }

      const nextCompanies = data.companies || [];
      setCompanies(nextCompanies);

      setSelectedCompanyId((currentValue) => {
        if (currentValue && nextCompanies.some((company: CompanyListItem) => company.id === currentValue)) {
          return currentValue;
        }

        if (companyIdFromQuery && nextCompanies.some((company: CompanyListItem) => company.id === companyIdFromQuery)) {
          return companyIdFromQuery;
        }

        return nextCompanies[0]?.id || '';
      });
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to load banking accounts');
    } finally {
      setLoadingCompanies(false);
    }
  };

  const fetchSelectedAccount = async (companyId: string) => {
    if (!companyId) {
      setSelectedCompany(null);
      setSelectedSummary(emptySummary);
      setBankEntries([]);
      return;
    }

    try {
      setLoadingAccount(true);
      const [companyResponse, ledgerResponse] = await Promise.all([
        fetch(`/api/finance/companies/${companyId}`),
        fetch(`/api/finance/companies/${companyId}/ledger?source=BANK_IMPORT`),
      ]);

      const companyData = await companyResponse.json();
      const ledgerData = await ledgerResponse.json();

      if (!companyResponse.ok) {
        throw new Error(companyData.error || 'Failed to load banking account');
      }

      if (!ledgerResponse.ok) {
        throw new Error(ledgerData.error || 'Failed to load bank imports');
      }

      setSelectedCompany(companyData.company);
      setSelectedSummary(companyData.summary || emptySummary);
      setBankEntries(ledgerData.entries || []);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to load bank activity');
    } finally {
      setLoadingAccount(false);
    }
  };

  useEffect(() => {
    void fetchCompanies();
  }, [companyIdFromQuery]);

  useEffect(() => {
    if (!selectedCompanyId) return;
    void fetchSelectedAccount(selectedCompanyId);
  }, [selectedCompanyId]);

  const handleImportFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setImportFile(event.target.files?.[0] || null);
    setImportPreview(null);
  };

  const handlePreviewBankCsv = async () => {
    if (!selectedCompanyId) {
      toast.error('Choose a banking account first');
      return;
    }

    if (!importFile) {
      toast.error('Select a CSV file to preview');
      return;
    }

    try {
      setPreviewingImport(true);
      const body = new FormData();
      body.append('action', 'preview');
      body.append('file', importFile);
      body.append('category', importForm.category.trim() || 'Bank Statement');
      body.append('sourceLabel', 'Bank of America CSV');
      body.append('statementEndingBalance', importForm.statementEndingBalance.trim());

      const response = await fetch(`/api/finance/companies/${selectedCompanyId}/ledger/import-bank-csv`, {
        method: 'POST',
        body,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to preview Bank of America CSV');
      }

      setImportPreview(data.preview as ImportPreview);
      toast.success('Bank CSV preview ready');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to preview Bank of America CSV');
    } finally {
      setPreviewingImport(false);
    }
  };

  const handleImportBankCsv = async () => {
    if (!selectedCompanyId) {
      toast.error('Choose a banking account first');
      return;
    }

    if (!importFile) {
      toast.error('Select a CSV file to import');
      return;
    }

    if (!importPreview) {
      toast.error('Preview the CSV before importing');
      return;
    }

    try {
      setImporting(true);
      const body = new FormData();
      body.append('action', 'import');
      body.append('file', importFile);
      body.append('category', importForm.category.trim() || 'Bank Statement');
      body.append('sourceLabel', 'Bank of America CSV');
      body.append('statementEndingBalance', importForm.statementEndingBalance.trim());

      const response = await fetch(`/api/finance/companies/${selectedCompanyId}/ledger/import-bank-csv`, {
        method: 'POST',
        body,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import Bank of America CSV');
      }

      if (data.importedCount > 0) {
        toast.success(
          `${data.importedCount} bank transaction${data.importedCount === 1 ? '' : 's'} imported`,
          data.skippedCount > 0
            ? { description: `${data.skippedCount} duplicate row${data.skippedCount === 1 ? '' : 's'} skipped` }
            : undefined
        );
      } else {
        toast.info(
          'No new bank transactions were imported',
          data.skippedCount > 0
            ? { description: 'All rows were already imported previously' }
            : undefined
        );
      }

      setOpenImportDialog(false);
      resetImportForm();
      await Promise.all([fetchCompanies(), fetchSelectedAccount(selectedCompanyId)]);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to import Bank of America CSV');
    } finally {
      setImporting(false);
    }
  };

  const bankStats = useMemo(() => {
    let importedDebit = 0;
    let importedCredit = 0;

    for (const entry of bankEntries) {
      if (entry.type === 'DEBIT') {
        importedDebit += entry.amount;
      } else {
        importedCredit += entry.amount;
      }
    }

    return {
      importedRows: bankEntries.length,
      importedDebit,
      importedCredit,
    };
  }, [bankEntries]);

  const columns = useMemo<Column<LedgerEntry>[]>(
    () => [
      {
        key: 'transactionDate',
        header: 'Date',
        sortable: true,
        render: (_, row) => new Date(row.transactionDate).toLocaleDateString(),
      },
      {
        key: 'description',
        header: 'Description',
        sortable: true,
        render: (_, row) => (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Box sx={{ fontWeight: 600 }}>{row.description}</Box>
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                  color: '#2563eb',
                  border: '1px solid rgba(59, 130, 246, 0.22)',
                  textTransform: 'uppercase',
                }}
              >
                Bank Import
              </Box>
            </Box>
            <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {row.category || 'Bank Statement'}{row.reference ? ` • Ref: ${row.reference}` : ''}
            </Box>
            {row.notes && (
              <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mt: 0.5 }}>{row.notes}</Box>
            )}
          </Box>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        align: 'center',
        render: (_, row) => row.type,
      },
      {
        key: 'amount',
        header: 'Amount',
        align: 'right',
        render: (_, row) => (
          <span style={{ color: row.type === 'DEBIT' ? 'var(--error)' : '#16a34a', fontWeight: 700 }}>
            {row.type === 'DEBIT' ? '+' : '-'}{formatCurrency(row.amount)}
          </span>
        ),
      },
      {
        key: 'balance',
        header: 'Balance',
        align: 'right',
        render: (_, row) => <span style={{ fontWeight: 700 }}>{formatCurrency(row.balance)}</span>,
      },
    ],
    [formatCurrency]
  );

  if (loadingCompanies) {
    return (
      <PermissionRoute permission="finance:manage">
        <DashboardSurface>
          <TableSkeleton rows={8} />
        </DashboardSurface>
      </PermissionRoute>
    );
  }

  return (
    <PermissionRoute permission="finance:manage">
      <DashboardSurface>
        <Box sx={{ px: 2, pt: 2 }}>
          <Breadcrumbs />
        </Box>

        <DashboardPanel
          title="Banking"
          description="Import bank CSV statements into a dedicated finance workspace"
          actions={
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {selectedCompanyId && (
                <Link href={`/dashboard/finance/companies/${selectedCompanyId}`} style={{ textDecoration: 'none' }}>
                  <Button variant="outline" icon={<ExternalLink className="w-4 h-4" />}>
                    Open Ledger
                  </Button>
                </Link>
              )}
              <Button
                variant="primary"
                icon={<Upload className="w-4 h-4" />}
                onClick={() => setOpenImportDialog(true)}
                disabled={!selectedCompanyId}
              >
                Import Bank CSV
              </Button>
            </Box>
          }
        >
          <Box sx={{ mb: 2, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Choose the company ledger that represents your bank account, then preview and import the Bank of America CSV here instead of from a ledger detail page.
          </Box>

          {companies.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Box sx={{ mb: 2 }}>No company ledgers are available yet for banking imports.</Box>
              <Link href="/dashboard/finance/companies" style={{ textDecoration: 'none' }}>
                <Button variant="primary" icon={<Building2 className="w-4 h-4" />}>
                  Create Company Ledger
                </Button>
              </Link>
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 340px) 1fr' }, gap: 2, mb: 3 }}>
                <TextField
                  select
                  label="Banking Account Destination"
                  value={selectedCompanyId}
                  onChange={(event) => setSelectedCompanyId(event.target.value)}
                  fullWidth
                >
                  {companies.map((company) => (
                    <MenuItem key={company.id} value={company.id}>
                      {company.name}{company.code ? ` • ${company.code}` : ''}
                    </MenuItem>
                  ))}
                </TextField>

                <Box
                  sx={{
                    border: '1px solid var(--border)',
                    borderRadius: 2,
                    p: 2,
                    background: 'var(--panel)',
                    minHeight: 84,
                  }}
                >
                  {selectedCompany ? (
                    <>
                      <Box sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedCompany.name}</Box>
                      <Box sx={{ mt: 0.75, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {selectedCompany.code || selectedCompany.email || selectedCompany.phone || 'No reference on file'}
                      </Box>
                      <Box sx={{ mt: 0.75, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {selectedCompany.country || 'Country not set'}
                      </Box>
                    </>
                  ) : (
                    <Box sx={{ color: 'var(--text-secondary)' }}>Select a banking account destination to start importing.</Box>
                  )}
                </Box>
              </Box>

              <DashboardGrid className="grid-cols-1 md:grid-cols-2 xl:grid-cols-4 mb-4">
                <StatsCard icon={<Landmark className="w-5 h-5" />} title="Current Balance" value={formatCurrency(selectedSummary.currentBalance)} variant="info" />
                <StatsCard icon={<ReceiptText className="w-5 h-5" />} title="Imported Rows" value={bankStats.importedRows} variant="default" />
                <StatsCard icon={<ArrowRightLeft className="w-5 h-5" />} title="Money In" value={formatCurrency(bankStats.importedDebit)} variant="error" />
                <StatsCard icon={<ArrowRightLeft className="w-5 h-5" />} title="Money Out" value={formatCurrency(bankStats.importedCredit)} variant="success" />
              </DashboardGrid>

              <Box
                sx={{
                  mb: 2,
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid var(--border)',
                  background: 'rgba(59, 130, 246, 0.06)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.82rem',
                }}
              >
                Imported bank rows remain visible in the account ledger with a <strong>Bank Import</strong> badge, but CSV upload now starts only from this Banking page.
              </Box>

              <DashboardPanel
                title="Imported Bank Activity"
                description={selectedCompany ? `Bank-imported rows for ${selectedCompany.name}` : 'Choose an account to review imports'}
                fullHeight
              >
                {loadingAccount ? (
                  <Box sx={{ py: 3, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading bank activity...</Box>
                ) : bankEntries.length === 0 ? (
                  <Box sx={{ py: 3, textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No bank-imported transactions yet for this account.
                  </Box>
                ) : (
                  <DataTable data={bankEntries} columns={columns} keyField="id" />
                )}
              </DashboardPanel>
            </>
          )}
        </DashboardPanel>

        <Dialog open={openImportDialog} onClose={() => { if (!importing && !previewingImport) { setOpenImportDialog(false); resetImportForm(); } }} maxWidth="md" fullWidth>
          <DialogTitle>Import Bank of America CSV</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1.5 }}>
            <Box sx={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Import the statement into <strong>{selectedCompany?.name || 'the selected banking account'}</strong>. Money in is imported as <strong>DEBIT</strong>. Money out is imported as <strong>CREDIT</strong>.
            </Box>
            <TextField
              label="Ledger Category"
              value={importForm.category}
              onChange={(event) => {
                setImportForm((prev) => ({ ...prev, category: event.target.value }));
                setImportPreview(null);
              }}
              placeholder="Bank Statement"
              fullWidth
            />
            <TextField
              label="Statement Ending Balance"
              value={importForm.statementEndingBalance}
              onChange={(event) => {
                setImportForm((prev) => ({ ...prev, statementEndingBalance: event.target.value }));
                setImportPreview(null);
              }}
              placeholder="0.00"
              helperText="Optional, but recommended so the preview can reconcile against the statement total"
              fullWidth
            />
            <Box>
              <Box sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)', mb: 1 }}>CSV file</Box>
              <input type="file" accept=".csv,text/csv" onChange={handleImportFileChange} />
              {importFile && (
                <Box sx={{ mt: 1, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Selected: {importFile.name}
                </Box>
              )}
            </Box>

            {importPreview && (
              <Box sx={{ display: 'grid', gap: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid var(--border)', background: 'var(--panel)' }}>
                    <Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Rows</Box>
                    <Box sx={{ mt: 0.5, fontWeight: 700 }}>{importPreview.totalCount}</Box>
                    <Box sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{importPreview.importableCount} ready to import</Box>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid var(--border)', background: 'var(--panel)' }}>
                    <Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Duplicates</Box>
                    <Box sx={{ mt: 0.5, fontWeight: 700 }}>{importPreview.duplicateCount}</Box>
                    <Box sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Already imported or repeated in file</Box>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid var(--border)', background: 'var(--panel)' }}>
                    <Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Net Change</Box>
                    <Box sx={{ mt: 0.5, fontWeight: 700 }}>{formatCurrency(importPreview.importableNetChange)}</Box>
                    <Box sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Current {formatCurrency(importPreview.currentBalance)}</Box>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid var(--border)', background: 'var(--panel)' }}>
                    <Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Projected Ending</Box>
                    <Box sx={{ mt: 0.5, fontWeight: 700 }}>{formatCurrency(importPreview.projectedEndingBalance)}</Box>
                    <Box sx={{ fontSize: '0.78rem', color: importPreview.reconciliationStatus === 'MATCH' ? '#16a34a' : importPreview.reconciliationStatus === 'VARIANCE' ? '#dc2626' : 'var(--text-secondary)' }}>
                      {importPreview.reconciliationStatus === 'NOT_PROVIDED'
                        ? 'Add statement ending balance to reconcile'
                        : `${importPreview.reconciliationStatus === 'MATCH' ? 'Matches statement' : 'Difference'} ${formatCurrency(Math.abs(importPreview.reconciliationDifference || 0))}`}
                    </Box>
                  </Box>
                </Box>

                {importPreview.statementEndingBalance !== null && (
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: '1px solid var(--border)',
                      background: importPreview.reconciliationStatus === 'MATCH' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    }}
                  >
                    <Box sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      Statement ending balance: {formatCurrency(importPreview.statementEndingBalance)}
                    </Box>
                    <Box sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)', mt: 0.5 }}>
                      {importPreview.reconciliationStatus === 'MATCH'
                        ? 'Projected ledger ending balance matches the statement total.'
                        : `Projected ledger ending balance differs by ${formatCurrency(Math.abs(importPreview.reconciliationDifference || 0))}. Review duplicates and source data before importing.`}
                    </Box>
                  </Box>
                )}

                <Box sx={{ border: '1px solid var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                  <Box sx={{ px: 2, py: 1.25, fontWeight: 700, borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}>
                    Preview Rows
                  </Box>
                  <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ textAlign: 'left', padding: '10px 12px' }}>Date</th>
                          <th style={{ textAlign: 'left', padding: '10px 12px' }}>Description</th>
                          <th style={{ textAlign: 'left', padding: '10px 12px' }}>Status</th>
                          <th style={{ textAlign: 'right', padding: '10px 12px' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.rows.map((row, index) => (
                          <tr key={`${row.transactionDate}-${row.description}-${index}`} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>{new Date(`${row.transactionDate}T00:00:00`).toLocaleDateString()}</td>
                            <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                              <div style={{ fontWeight: 600 }}>{row.description}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                {row.reference ? `Ref: ${row.reference}` : 'No reference'}{row.notes ? ` • ${row.notes}` : ''}
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '4px 8px',
                                  borderRadius: 999,
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  background: row.isDuplicate ? 'rgba(234, 179, 8, 0.14)' : 'rgba(34, 197, 94, 0.12)',
                                  color: row.isDuplicate ? '#b45309' : '#15803d',
                                }}
                              >
                                {row.isDuplicate
                                  ? row.duplicateReason === 'ALREADY_IMPORTED'
                                    ? 'Already Imported'
                                    : 'Duplicate In File'
                                  : 'Will Import'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', verticalAlign: 'top', textAlign: 'right', color: row.type === 'DEBIT' ? 'var(--error)' : '#16a34a', fontWeight: 700 }}>
                              {row.type === 'DEBIT' ? '+' : '-'}{formatCurrency(row.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button variant="outline" onClick={() => { setOpenImportDialog(false); resetImportForm(); }} disabled={importing || previewingImport}>Cancel</Button>
            <Button variant="outline" onClick={handlePreviewBankCsv} disabled={importing || previewingImport}>{previewingImport ? 'Previewing...' : 'Preview CSV'}</Button>
            <Button variant="primary" onClick={handleImportBankCsv} disabled={importing || previewingImport || !importPreview}>{importing ? 'Importing...' : 'Import CSV'}</Button>
          </DialogActions>
        </Dialog>
      </DashboardSurface>
    </PermissionRoute>
  );
}