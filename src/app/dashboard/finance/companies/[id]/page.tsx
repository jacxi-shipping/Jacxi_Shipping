'use client';

import { ChangeEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Tab,
  Tabs,
  TextField,
  Tooltip,
} from '@mui/material';
import { ArrowLeft, Building2, DollarSign, Eye, Landmark, Pencil, Plus, ReceiptText, Trash2, Truck, Upload } from 'lucide-react';
import PermissionRoute from "@/components/auth/PermissionRoute";
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Breadcrumbs, Button, StatsCard, toast, TableSkeleton } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import type { AuctionRateEntry, ShippingRateCalculatorConfig } from '@/lib/shipping-rate-calculator';

type PriceListImportMode = 'replace' | 'merge' | 'add_new';

interface Company {
  id: string;
  name: string;
  code: string | null;
  companyType: 'SHIPPING' | 'DISPATCH' | 'TRANSIT';
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  notes: string | null;
  isActive: boolean;
  priceListConfig?: ShippingRateCalculatorConfig | null;
  priceLists?: CompanyPriceListSummary[];
  _count?: {
    ledgerEntries: number;
    dispatches: number;
    containers: number;
    shipments: number;
    transits: number;
  };
  dispatches?: Array<{
    id: string;
    referenceNumber: string;
    status: string;
    origin: string;
    destination: string;
    createdAt: string;
    _count: {
      shipments: number;
    };
  }>;
  containers?: Array<{
    id: string;
    containerNumber: string;
    status: string;
    currentCount: number;
    maxCapacity: number;
    createdAt: string;
  }>;
  shipments?: Array<{
    id: string;
    vehicleVIN: string | null;
    vehicleMake: string | null;
    vehicleModel: string | null;
    status: string;
    createdAt: string;
    dispatchId?: string | null;
    containerId?: string | null;
    transitId: string | null;
  }>;
  transits?: Array<{
    id: string;
    referenceNumber: string;
    status: string;
    origin: string;
    destination: string;
    createdAt: string;
    _count: {
      shipments: number;
    };
  }>;
}

interface CompanySummary {
  totalDebit: number;
  totalCredit: number;
  totalExpenseCharges: number;
  currentBalance: number;
}

interface LedgerEntry {
  id: string;
  companyId?: string;
  transactionDate: string;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  balance: number;
  category?: string | null;
  reference?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  company?: {
    id: string;
    name: string;
    code: string | null;
  };
}

interface CompanyPriceListSummary {
  id: string;
  name: string;
  destinationLabel: string;
  sourceFileName: string;
  importMode: string;
  importedStateRateCount: number;
  importedAuctionRateCount: number;
  warnings: string[] | null;
  isActive: boolean;
  effectiveFrom: string | null;
  createdAt: string;
}

interface PriceListPreview {
  fileName: string;
  mode: PriceListImportMode;
  listName: string;
  destinationLabel: string;
  importedCount: number;
  importedAuctionRateCount: number;
  totalStateRateCount: number;
  totalAuctionRateCount: number;
  warnings: string[];
  rows: AuctionRateEntry[];
  stateRates: Record<string, number>;
  extractedTextPreview: string;
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

interface CompanyReport {
  summary: {
    transactionCount: number;
    totalDebit: number;
    totalCredit: number;
    netMovement: number;
    currentBalance: number;
  };
  monthlyBreakdown?: Array<{
    month: string;
    debit: number;
    credit: number;
    net: number;
  }>;
}

export default function CompanyLedgerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = String(params.id || '');
  const focusedEntryId = searchParams.get('entryId') || '';

  const [company, setCompany] = useState<Company | null>(null);
  const [summary, setSummary] = useState<CompanySummary>({ totalDebit: 0, totalCredit: 0, totalExpenseCharges: 0, currentBalance: 0 });
  const [report, setReport] = useState<CompanyReport | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [openEntry, setOpenEntry] = useState(false);
  const [isPaymentMode, setIsPaymentMode] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [previewingImport, setPreviewingImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [priceListFile, setPriceListFile] = useState<File | null>(null);
  const [previewingPriceList, setPreviewingPriceList] = useState(false);
  const [importingPriceList, setImportingPriceList] = useState(false);
  const [priceListPreview, setPriceListPreview] = useState<PriceListPreview | null>(null);
  const [priceListSearch, setPriceListSearch] = useState('');
  const [activatingPriceListId, setActivatingPriceListId] = useState<string | null>(null);
  const [priceListForm, setPriceListForm] = useState({
    name: '',
    destinationLabel: '',
    effectiveFrom: '',
    mode: 'merge' as PriceListImportMode,
  });
  const [filters, setFilters] = useState({ search: '', type: '', source: '' });
  const [importForm, setImportForm] = useState({
    category: 'Bank Statement',
    statementEndingBalance: '',
  });
  const [formData, setFormData] = useState({
    description: '',
    type: 'CREDIT',
    amount: '',
    transactionDate: new Date().toISOString().slice(0, 10),
    category: '',
    reference: '',
    notes: '',
  });

  // Edit entry state
  const [openEditEntry, setOpenEditEntry] = useState(false);
  const [editEntry, setEditEntry] = useState<LedgerEntry | null>(null);
  const [editForm, setEditForm] = useState({
    description: '',
    type: 'CREDIT',
    amount: '',
    transactionDate: new Date().toISOString().slice(0, 10),
    category: '',
    reference: '',
    notes: '',
  });
  const [updating, setUpdating] = useState(false);
  const [focusedEntry, setFocusedEntry] = useState<LedgerEntry | null>(null);
  const [focusedEntryLoading, setFocusedEntryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const companyTypeLabel =
    company?.companyType === 'SHIPPING'
      ? 'Shipping'
      : company?.companyType === 'DISPATCH'
      ? 'Dispatch'
      : 'Transit';

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const activePriceListRows = useMemo(() => {
    const rows = company?.priceListConfig?.auctionRates || [];
    const query = priceListSearch.trim().toLowerCase();
    if (!query) return rows.slice(0, 200);

    return rows
      .filter((row) => [
        row.stateCode,
        row.branch,
        row.city,
        row.loadingPoint || '',
        String(row.total),
      ].join(' ').toLowerCase().includes(query))
      .slice(0, 200);
  }, [company?.priceListConfig?.auctionRates, priceListSearch]);

  const activePriceListWarnings = useMemo(() => {
    const activeList = company?.priceLists?.find((list) => list.isActive);
    return Array.isArray(activeList?.warnings) ? activeList.warnings : [];
  }, [company?.priceLists]);

  const companyTabs = useMemo(() => [
    { label: 'Ledger', icon: <ReceiptText className="h-4 w-4" /> },
    { label: 'Price List', icon: <Upload className="h-4 w-4" /> },
    {
      label: companyTypeLabel === 'Shipping'
        ? 'Shipping'
        : companyTypeLabel === 'Dispatch'
        ? 'Dispatch'
        : 'Transit',
      icon: <Truck className="h-4 w-4" />,
    },
    { label: 'Reports', icon: <DollarSign className="h-4 w-4" /> },
  ], [companyTypeLabel]);

  const TabPanel = ({ children, value, index }: { children: ReactNode; value: number; index: number }) => (
    <div role="tabpanel" hidden={value !== index} id={`company-tabpanel-${index}`} aria-labelledby={`company-tab-${index}`}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );

  const isExpenseRecoveryEntry = (row: LedgerEntry) => {
    const category = (row.category || '').toLowerCase();
    if (category.includes('expense recovery') || category.includes('shipping fare') || category.includes('damage cost')) return true;

    const metadata = (row.metadata || {}) as Record<string, unknown>;
    return (
      metadata.isExpenseRecovery === true ||
      metadata.isDispatchExpense === true ||
      metadata.isTransitExpense === true ||
      metadata.isContainerExpense === true ||
      metadata.isShipmentShippingFare === true ||
      metadata.isShipmentDamage === true ||
      typeof row.reference === 'string' &&
        (row.reference.startsWith('shipment-expense:') ||
          row.reference.startsWith('dispatch-expense:') ||
          row.reference.startsWith('transit-expense:') ||
          row.reference.startsWith('container-expense:') ||
          row.reference.startsWith('shipment-shipping-fare:') ||
          row.reference.startsWith('shipment-damage:'))
    );
  };

  const getDisplayType = (row: LedgerEntry) => (isExpenseRecoveryEntry(row) ? 'CREDIT' : row.type);

  const isBankImportedEntry = (row: LedgerEntry) => {
    const metadata = (row.metadata || {}) as Record<string, unknown>;
    return metadata.importSource === 'BANK_OF_AMERICA_CSV';
  };

  const resetImportForm = () => {
    setImportFile(null);
    setImportPreview(null);
    setImportForm({ category: 'Bank Statement', statementEndingBalance: '' });
  };

  const fetchCompany = async () => {
    const response = await fetch(`/api/finance/companies/${companyId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch company');
    }

    setCompany(data.company);
    setSummary(data.summary);
  };

  const fetchLedger = async () => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.type) params.append('type', filters.type);
    if (filters.source) params.append('source', filters.source);

    const response = await fetch(`/api/finance/companies/${companyId}/ledger?${params}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch ledger entries');
    }

    setEntries(data.entries || []);
    setSummary(data.summary || { totalDebit: 0, totalCredit: 0, totalExpenseCharges: 0, currentBalance: 0 });
  };

  const canEditEntry = (row: LedgerEntry) => getDisplayType(row) === 'CREDIT' && !isExpenseRecoveryEntry(row);

  const fetchReport = async () => {
    const response = await fetch(`/api/finance/companies/${companyId}/reports`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch report');
    }

    setReport(data);
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchCompany(), fetchLedger(), fetchReport()]);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load company ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      void fetchAll();
    }
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    void fetchLedger();
  }, [filters.search, filters.type, filters.source]);

  useEffect(() => {
    if (!focusedEntryId) {
      setFocusedEntry(null);
      return;
    }

    const fetchFocusedEntry = async () => {
      try {
        setFocusedEntryLoading(true);
        const response = await fetch(`/api/finance/companies/ledger/${focusedEntryId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load focused ledger entry');
        }

        if (data.entry?.company?.id !== companyId) {
          throw new Error('The selected ledger entry does not belong to this company');
        }

        setFocusedEntry(data.entry);
      } catch (error) {
        console.error(error);
        setFocusedEntry(null);
        toast.error(error instanceof Error ? error.message : 'Failed to load focused ledger entry');
      } finally {
        setFocusedEntryLoading(false);
      }
    };

    void fetchFocusedEntry();
  }, [companyId, focusedEntryId]);

  const clearFocusedEntry = () => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('entryId');
    const queryString = nextParams.toString();
    router.replace(queryString ? `/dashboard/finance/companies/${companyId}?${queryString}` : `/dashboard/finance/companies/${companyId}`);
  };

  const handleCreateEntry = async () => {
    if (!formData.description.trim()) {
      toast.error('Description is required');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    try {
      setPosting(true);
      const response = await fetch(`/api/finance/companies/${companyId}/ledger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formData.description,
          type: formData.type,
          amount,
          transactionDate: formData.transactionDate,
          category: formData.category || undefined,
          reference: formData.reference || undefined,
          notes: formData.notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create transaction');
      }

      toast.success('Transaction created');
      setOpenEntry(false);
      setIsPaymentMode(false);
      setFormData({
        description: '',
        type: 'CREDIT',
        amount: '',
        transactionDate: new Date().toISOString().slice(0, 10),
        category: '',
        reference: '',
        notes: '',
      });
      // Reset type filter so the new entry is always visible
      setFilters((prev) => ({ ...prev, type: '' }));

      await Promise.all([fetchLedger(), fetchReport()]);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to create transaction');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Delete this transaction?')) return;

    try {
      const response = await fetch(`/api/finance/companies/ledger/${entryId}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete transaction');
      }

      toast.success('Transaction deleted');
      await Promise.all([fetchLedger(), fetchReport()]);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete transaction');
    }
  };

  const handleImportFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setImportFile(event.target.files?.[0] || null);
    setImportPreview(null);
  };

  const handlePriceListFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPriceListFile(event.target.files?.[0] || null);
    setPriceListPreview(null);
  };

  const appendPriceListForm = (body: FormData, action: 'preview' | 'import') => {
    body.append('action', action);
    body.append('mode', priceListForm.mode);
    body.append('name', priceListForm.name.trim());
    body.append('destinationLabel', priceListForm.destinationLabel.trim());
    body.append('effectiveFrom', priceListForm.effectiveFrom);
  };

  const handlePreviewPriceListPdf = async () => {
    if (!priceListFile) {
      toast.error('Select a price list PDF first');
      return;
    }

    try {
      setPreviewingPriceList(true);
      const body = new FormData();
      body.append('file', priceListFile);
      appendPriceListForm(body, 'preview');

      const response = await fetch(`/api/finance/companies/${companyId}/price-list/import-pdf`, {
        method: 'POST',
        body,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import company price list');
      }

      setPriceListPreview(data.preview as PriceListPreview);
      toast.success('Price list preview ready');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to preview company price list');
    } finally {
      setPreviewingPriceList(false);
    }
  };

  const handleImportPriceListPdf = async () => {
    if (!priceListFile) {
      toast.error('Select a price list PDF first');
      return;
    }

    if (!priceListPreview) {
      toast.error('Preview the price list before importing');
      return;
    }

    try {
      setImportingPriceList(true);
      const body = new FormData();
      body.append('file', priceListFile);
      appendPriceListForm(body, 'import');

      const response = await fetch(`/api/finance/companies/${companyId}/price-list/import-pdf`, {
        method: 'POST',
        body,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import company price list');
      }

      setPriceListFile(null);
      setPriceListPreview(null);
      await fetchCompany();
      toast.success(`Imported ${data.importedAuctionRateCount || data.importedCount} rates for ${company?.name || 'company'}`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to import company price list');
    } finally {
      setImportingPriceList(false);
    }
  };

  const handleActivatePriceList = async (priceListId: string) => {
    try {
      setActivatingPriceListId(priceListId);
      const response = await fetch(`/api/finance/companies/${companyId}/price-list/${priceListId}/activate`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to activate price list');
      }

      await fetchCompany();
      toast.success('Price list activated');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to activate price list');
    } finally {
      setActivatingPriceListId(null);
    }
  };

  const handlePreviewBankCsv = async () => {
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

      const response = await fetch(`/api/finance/companies/${companyId}/ledger/import-bank-csv`, {
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

      const response = await fetch(`/api/finance/companies/${companyId}/ledger/import-bank-csv`, {
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

      setFilters({ search: '', type: '', source: 'BANK_IMPORT' });
      setOpenImportDialog(false);
      resetImportForm();
      await Promise.all([fetchCompany(), fetchLedger(), fetchReport()]);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to import Bank of America CSV');
    } finally {
      setImporting(false);
    }
  };

  const openEditEntryDialog = (entry: LedgerEntry, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditEntry(entry);
    setEditForm({
      description: entry.description,
      type: entry.type,
      amount: String(entry.amount),
      transactionDate: new Date(entry.transactionDate).toISOString().slice(0, 10),
      category: entry.category || '',
      reference: entry.reference || '',
      notes: entry.notes || '',
    });
    setOpenEditEntry(true);
  };

  const handleEditEntry = async () => {
    if (!editEntry) return;

    if (!editForm.description.trim()) {
      toast.error('Description is required');
      return;
    }

    const amount = parseFloat(editForm.amount);
    if (!amount || amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    try {
      setUpdating(true);
      const response = await fetch(`/api/finance/companies/ledger/${editEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editForm.description,
          type: editForm.type,
          amount,
          transactionDate: editForm.transactionDate,
          category: editForm.category || null,
          reference: editForm.reference || null,
          notes: editForm.notes || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update transaction');
      }

      toast.success('Transaction updated');
      setOpenEditEntry(false);
      setEditEntry(null);
      await Promise.all([fetchLedger(), fetchReport()]);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to update transaction');
    } finally {
      setUpdating(false);
    }
  };

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
              <Box sx={{ fontWeight: 500 }}>{row.description}</Box>
              {isBankImportedEntry(row) && (
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
              )}
            </Box>
            <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {row.category || 'General'}{row.reference ? ` • Ref: ${row.reference}` : ''}
            </Box>
          </Box>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        align: 'center',
        render: (_, row) => {
          const normalizedType = getDisplayType(row);
          return normalizedType;
        },
      },
      {
        key: 'amount',
        header: 'Amount',
        align: 'right',
        render: (_, row) => {
          const normalizedType = getDisplayType(row);
          return (
          <span style={{ color: normalizedType === 'DEBIT' ? 'var(--error)' : '#22c55e', fontWeight: 600 }}>
            {normalizedType === 'DEBIT' ? '+' : '-'}{formatCurrency(row.amount)}
          </span>
          );
        },
      },
      {
        key: 'balance',
        header: 'Balance',
        align: 'right',
        render: (_, row) => <span style={{ fontWeight: 600 }}>{formatCurrency(row.balance)}</span>,
      },
      {
        key: 'id',
        header: 'Actions',
        align: 'center',
        render: (_, row) => (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
            {canEditEntry(row) && (
              <Tooltip title="Edit transaction">
                <IconButton
                  size="small"
                  onClick={(event) => openEditEntryDialog(row, event)}
                >
                  <Pencil className="w-4 h-4" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Delete transaction">
              <IconButton
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  void handleDeleteEntry(row.id);
                }}
                color="error"
              >
                <Trash2 className="w-4 h-4" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    []
  );

  if (loading) {
    return (
      <PermissionRoute permission="finance:manage">
        <DashboardSurface>
          <TableSkeleton rows={8} />
        </DashboardSurface>
      </PermissionRoute>
    );
  }

  if (!company) {
    return (
      <PermissionRoute permission="finance:manage">
        <DashboardSurface>
          <DashboardPanel title="Company not found">
            <Box sx={{ color: 'var(--text-secondary)' }}>The requested company could not be loaded.</Box>
          </DashboardPanel>
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
          title={company.name}
          description={`${companyTypeLabel} Company Ledger${company.code ? ` • ${company.code}` : ''}`}
          actions={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Link href="/dashboard/finance/companies" style={{ textDecoration: 'none' }}>
                <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
              </Link>
              <Link href="/dashboard/finance/banking" style={{ textDecoration: 'none' }}>
                <Button variant="outline" icon={<Landmark className="w-4 h-4" />}>
                  Banking
                </Button>
              </Link>
              <Button variant="outline" icon={<DollarSign className="w-4 h-4" />} onClick={() => {
                setIsPaymentMode(true);
                setFormData((prev) => ({ ...prev, type: 'DEBIT', category: 'Payment', description: `Payment to ${company?.name || 'Company'}` }));
                setOpenEntry(true);
              }}>
                Record Payment
              </Button>
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => {
                setIsPaymentMode(false);
                setFormData((prev) => ({ ...prev, type: 'CREDIT', category: '', description: '' }));
                setOpenEntry(true);
              }}>
                Add Transaction
              </Button>
            </Box>
          }
        >
          <DashboardGrid className="grid-cols-1 md:grid-cols-4 mb-4">
            <StatsCard icon={<DollarSign className="w-5 h-5" />} title="Total Expenses" value={formatCurrency(summary.totalExpenseCharges)} variant="error" />
            <StatsCard icon={<DollarSign className="w-5 h-5" />} title="Total Paid" value={formatCurrency(summary.totalDebit)} variant="success" />
            <StatsCard icon={<Building2 className="w-5 h-5" />} title="Total Owed" value={formatCurrency(Math.abs(summary.currentBalance))} variant="info" />
            <StatsCard icon={<ReceiptText className="w-5 h-5" />} title="Total Transactions" value={report?.summary.transactionCount || entries.length} variant="default" />
          </DashboardGrid>
        </DashboardPanel>

        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 15,
            border: '1px solid var(--border)',
            borderRadius: '12px',
            backgroundColor: 'var(--panel)',
            boxShadow: '0 12px 28px rgba(var(--text-primary-rgb),0.08)',
            overflow: 'hidden',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 52,
              '& .MuiTabs-flexContainer': {
                gap: 0.25,
                px: 1,
              },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '0.875rem',
                fontWeight: 650,
                color: 'var(--text-secondary)',
                minHeight: 52,
                borderRadius: '10px',
                my: 0.75,
                px: 1.5,
                '&:hover': {
                  color: 'var(--accent-gold)',
                  backgroundColor: 'rgba(var(--accent-gold-rgb), 0.08)',
                },
              },
              '& .Mui-selected': {
                color: 'var(--accent-gold) !important',
                backgroundColor: 'rgba(var(--accent-gold-rgb), 0.1)',
              },
              '& .MuiTabs-indicator': {
                backgroundColor: 'var(--accent-gold)',
                height: 3,
              },
            }}
          >
            {companyTabs.map((tab, index) => (
              <Tab
                key={tab.label}
                id={`company-tab-${index}`}
                aria-controls={`company-tabpanel-${index}`}
                icon={tab.icon}
                iconPosition="start"
                label={tab.label}
              />
            ))}
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
        <DashboardPanel
          title="Company Ledger"
          description="Search, filter, and manage transactions for this company"
        >

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 180px 180px' }, gap: 1.5, mb: 2 }}>
            <TextField
              size="small"
              placeholder="Search description / category / notes"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            />
            <TextField
              select
              size="small"
              value={filters.type}
              onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="DEBIT">DEBIT</MenuItem>
              <MenuItem value="CREDIT">CREDIT</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              value={filters.source}
              onChange={(event) => setFilters((prev) => ({ ...prev, source: event.target.value }))}
            >
              <MenuItem value="">All Sources</MenuItem>
              <MenuItem value="BANK_IMPORT">Bank Imports</MenuItem>
              <MenuItem value="MANUAL">Manual Entries</MenuItem>
            </TextField>
          </Box>

          {(focusedEntryId || focusedEntryLoading || focusedEntry) && (
            <Box
              sx={{
                mb: 2,
                border: '1px solid rgba(var(--accent-gold-rgb), 0.32)',
                background: 'rgba(var(--accent-gold-rgb), 0.08)',
                borderRadius: 2,
                p: 2,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 2, flexWrap: 'wrap' }}>
                <Box>
                  <Box sx={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', fontWeight: 700 }}>
                    Focused Ledger Entry
                  </Box>
                  {focusedEntryLoading ? (
                    <Box sx={{ mt: 1, color: 'var(--text-secondary)' }}>Loading selected entry...</Box>
                  ) : focusedEntry ? (
                    <>
                      <Box sx={{ mt: 1, fontWeight: 700, color: 'var(--text-primary)' }}>{focusedEntry.description}</Box>
                      <Box sx={{ mt: 0.75, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {new Date(focusedEntry.transactionDate).toLocaleString()} • {getDisplayType(focusedEntry)} • {formatCurrency(focusedEntry.amount)}
                      </Box>
                      <Box sx={{ mt: 0.75, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {focusedEntry.category || 'General'}{focusedEntry.reference ? ` • Ref: ${focusedEntry.reference}` : ''}
                      </Box>
                      {focusedEntry.notes && (
                        <Box sx={{ mt: 0.75, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{focusedEntry.notes}</Box>
                      )}
                    </>
                  ) : (
                    <Box sx={{ mt: 1, color: 'var(--text-secondary)' }}>The selected entry could not be loaded.</Box>
                  )}
                </Box>
                <Button variant="outline" size="sm" onClick={clearFocusedEntry}>Clear Focus</Button>
              </Box>
            </Box>
          )}

          <DataTable
            data={entries}
            columns={columns}
            keyField="id"
            getRowClassName={(row) =>
              row.id === focusedEntryId
                ? 'bg-[rgba(var(--accent-gold-rgb),0.12)] ring-1 ring-inset ring-[rgba(var(--accent-gold-rgb),0.35)]'
                : undefined
            }
          />
        </DashboardPanel>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
        <DashboardPanel
          title="Company Price List"
          description="Upload and manage the rate sheet used by this company"
        >
          <Box sx={{ display: 'grid', gap: 2.5 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid var(--border)', background: 'var(--panel)' }}>
                <Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Destination</Box>
                <Box sx={{ mt: 0.5, fontWeight: 700 }}>{company.priceListConfig?.destinationLabel || 'Not imported'}</Box>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid var(--border)', background: 'var(--panel)' }}>
                <Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>State Rates</Box>
                <Box sx={{ mt: 0.5, fontWeight: 700 }}>{Object.keys(company.priceListConfig?.stateRates || {}).length}</Box>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid var(--border)', background: 'var(--panel)' }}>
                <Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Auction Rows</Box>
                <Box sx={{ mt: 0.5, fontWeight: 700 }}>{company.priceListConfig?.auctionRates?.length || 0}</Box>
              </Box>
            </Box>

            {activePriceListWarnings.length > 0 && (
              <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid rgba(234, 179, 8, 0.35)', background: 'rgba(234, 179, 8, 0.08)', color: 'var(--text-primary)' }}>
                <Box sx={{ fontWeight: 700, mb: 0.75 }}>Import Warnings</Box>
                {activePriceListWarnings.map((warning) => (
                  <Box key={warning} sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{warning}</Box>
                ))}
              </Box>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 180px 180px' }, gap: 1.5 }}>
              <TextField
                size="small"
                label="List Name"
                value={priceListForm.name}
                onChange={(event) => {
                  setPriceListForm((prev) => ({ ...prev, name: event.target.value }));
                  setPriceListPreview(null);
                }}
                placeholder={`${company.name} price list`}
              />
              <TextField
                size="small"
                label="Destination"
                value={priceListForm.destinationLabel}
                onChange={(event) => {
                  setPriceListForm((prev) => ({ ...prev, destinationLabel: event.target.value }));
                  setPriceListPreview(null);
                }}
                placeholder={company.priceListConfig?.destinationLabel || 'Islam Qala, Afghanistan'}
              />
              <TextField
                size="small"
                type="date"
                label="Effective From"
                InputLabelProps={{ shrink: true }}
                value={priceListForm.effectiveFrom}
                onChange={(event) => {
                  setPriceListForm((prev) => ({ ...prev, effectiveFrom: event.target.value }));
                  setPriceListPreview(null);
                }}
              />
              <TextField
                select
                size="small"
                label="Import Mode"
                value={priceListForm.mode}
                onChange={(event) => {
                  setPriceListForm((prev) => ({ ...prev, mode: event.target.value as PriceListImportMode }));
                  setPriceListPreview(null);
                }}
              >
                <MenuItem value="merge">Merge/update</MenuItem>
                <MenuItem value="replace">Replace all</MenuItem>
                <MenuItem value="add_new">Add new only</MenuItem>
              </TextField>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, alignItems: { xs: 'stretch', sm: 'center' } }}>
              <input id="company-price-list-pdf" type="file" accept="application/pdf" onChange={handlePriceListFileChange} style={{ display: 'none' }} />
              <label htmlFor="company-price-list-pdf">
                <Button component="span" variant="outline" icon={<Upload className="w-4 h-4" />}>
                  {priceListFile ? priceListFile.name : 'Select PDF'}
                </Button>
              </label>
              <Button variant="outline" onClick={handlePreviewPriceListPdf} disabled={!priceListFile || previewingPriceList || importingPriceList}>
                {previewingPriceList ? 'Previewing...' : 'Preview'}
              </Button>
              <Button variant="primary" onClick={handleImportPriceListPdf} disabled={!priceListFile || !priceListPreview || importingPriceList || previewingPriceList}>
                {importingPriceList ? 'Importing...' : 'Import Price List'}
              </Button>
            </Box>

            {priceListPreview && (
              <Box sx={{ display: 'grid', gap: 1.5, p: 1.5, borderRadius: 2, border: '1px solid var(--border)', background: 'var(--background)' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                  <Box><Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700 }}>States Found</Box><Box sx={{ fontWeight: 700 }}>{priceListPreview.importedCount}</Box></Box>
                  <Box><Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Auction Rows Found</Box><Box sx={{ fontWeight: 700 }}>{priceListPreview.importedAuctionRateCount}</Box></Box>
                  <Box><Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700 }}>After Import Rows</Box><Box sx={{ fontWeight: 700 }}>{priceListPreview.totalAuctionRateCount}</Box></Box>
                  <Box><Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Mode</Box><Box sx={{ fontWeight: 700 }}>{priceListPreview.mode}</Box></Box>
                </Box>
                {priceListPreview.warnings.length > 0 && (
                  <Box sx={{ p: 1.25, borderRadius: 2, background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                    {priceListPreview.warnings.map((warning) => (
                      <Box key={warning} sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{warning}</Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            <Box sx={{ display: 'grid', gap: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                <Box sx={{ fontWeight: 700 }}>Rate Lookup</Box>
                <TextField size="small" placeholder="Search state, branch, city" value={priceListSearch} onChange={(event) => setPriceListSearch(event.target.value)} />
              </Box>
              <Box sx={{ border: '1px solid var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ maxHeight: 360, overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ textAlign: 'left', padding: '10px 12px' }}>State</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px' }}>Branch</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px' }}>City</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px' }}>Loading Point</th>
                        <th style={{ textAlign: 'right', padding: '10px 12px' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activePriceListRows.length > 0 ? activePriceListRows.map((row, index) => (
                        <tr key={`${row.stateCode}-${row.branch}-${row.city}-${index}`} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 700 }}>{row.stateCode}</td>
                          <td style={{ padding: '10px 12px' }}>{row.branch || '-'}</td>
                          <td style={{ padding: '10px 12px' }}>{row.city || '-'}</td>
                          <td style={{ padding: '10px 12px' }}>{row.loadingPoint || '-'}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(row.total)}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={5} style={{ padding: '16px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>No imported auction rows to display.</td></tr>
                      )}
                    </tbody>
                  </table>
                </Box>
              </Box>
            </Box>

            {company.priceLists && company.priceLists.length > 0 && (
              <Box sx={{ display: 'grid', gap: 1 }}>
                <Box sx={{ fontWeight: 700 }}>Import History</Box>
                {company.priceLists.map((list) => (
                  <Box key={list.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' }, gap: 1.5, alignItems: 'center', p: 1.5, border: '1px solid var(--border)', borderRadius: 2, background: list.isActive ? 'rgba(34, 197, 94, 0.08)' : 'var(--panel)' }}>
                    <Box>
                      <Box sx={{ fontWeight: 700 }}>{list.name}{list.isActive ? ' • Active' : ''}</Box>
                      <Box sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)', mt: 0.25 }}>
                        {list.sourceFileName} • {list.destinationLabel} • {list.importedAuctionRateCount || list.importedStateRateCount} rows • {new Date(list.createdAt).toLocaleString()}
                      </Box>
                    </Box>
                    <Button variant="outline" size="sm" disabled={list.isActive || activatingPriceListId === list.id} onClick={() => void handleActivatePriceList(list.id)}>
                      {activatingPriceListId === list.id ? 'Activating...' : 'Activate'}
                    </Button>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </DashboardPanel>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
        {company.companyType === 'SHIPPING' && (
          <DashboardPanel
            title="Shipping Operations"
            description="Containers and shipments linked to this shipping company"
          >
            <DashboardGrid className="grid-cols-1 md:grid-cols-2 mb-4">
              <StatsCard icon={<Building2 className="w-5 h-5" />} title="Containers" value={company._count?.containers || 0} variant="default" />
              <StatsCard icon={<ReceiptText className="w-5 h-5" />} title="Shipments" value={company._count?.shipments || 0} variant="info" />
            </DashboardGrid>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ fontWeight: 600, mb: 1 }}>Recent Containers</Box>
              <DataTable
                data={company.containers || []}
                keyField="id"
                columns={[
                  { key: 'containerNumber', header: 'Container', sortable: true },
                  { key: 'status', header: 'Status', sortable: true },
                  {
                    key: 'currentCount',
                    header: 'Capacity',
                    render: (_, row) => `${row.currentCount}/${row.maxCapacity}`,
                  },
                  {
                    key: 'createdAt',
                    header: 'Created',
                    render: (_, row) => new Date(row.createdAt).toLocaleDateString(),
                  },
                ]}
              />
            </Box>

          </DashboardPanel>
        )}

        {company.companyType === 'DISPATCH' && (
          <DashboardPanel
            title="Dispatch Operations"
            description="Dispatch records and assigned shipments linked to this dispatch company"
          >
            <DashboardGrid className="grid-cols-1 md:grid-cols-2 mb-4">
              <StatsCard icon={<Truck className="w-5 h-5" />} title="Dispatches" value={company._count?.dispatches || 0} variant="default" />
              <StatsCard icon={<ReceiptText className="w-5 h-5" />} title="Shipments" value={(company.shipments || []).filter((shipment) => Boolean(shipment.dispatchId)).length} variant="info" />
            </DashboardGrid>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ fontWeight: 600, mb: 1 }}>Recent Dispatches</Box>
              <DataTable
                data={company.dispatches || []}
                keyField="id"
                columns={[
                  { key: 'referenceNumber', header: 'Reference', sortable: true },
                  {
                    key: 'origin',
                    header: 'Route',
                    render: (_, row) => `${row.origin} -> ${row.destination}`,
                  },
                  { key: 'status', header: 'Status', sortable: true },
                  {
                    key: '_count',
                    header: 'Shipments',
                    render: (_, row) => row._count.shipments,
                  },
                  {
                    key: 'id',
                    header: 'Actions',
                    render: (_, row) => (
                      <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'center' }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/dispatches/${row.id}`)}
                        >
                          Dispatch
                        </Button>
                      </Box>
                    ),
                  },
                ]}
              />
            </Box>

            <Box>
              <Box sx={{ fontWeight: 600, mb: 1 }}>Assigned Shipments</Box>
              <DataTable
                data={(company.shipments || []).filter((shipment) => Boolean(shipment.dispatchId))}
                keyField="id"
                columns={[
                  {
                    key: 'vehicleVIN',
                    header: 'Vehicle',
                    render: (_, row) => row.vehicleVIN || [row.vehicleMake, row.vehicleModel].filter(Boolean).join(' ') || '-',
                  },
                  { key: 'status', header: 'Status', sortable: true },
                  {
                    key: 'createdAt',
                    header: 'Created',
                    render: (_, row) => new Date(row.createdAt).toLocaleDateString(),
                  },
                  {
                    key: 'id',
                    header: 'Actions',
                    render: (_, row) => (
                      <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'center' }}>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => router.push(`/dashboard/shipments/${row.id}`)}
                        >
                          Shipment
                        </Button>
                        {row.dispatchId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/dispatches/${row.dispatchId}`)}
                          >
                            Dispatch
                          </Button>
                        )}
                      </Box>
                    ),
                  },
                ]}
              />
            </Box>
          </DashboardPanel>
        )}

        {company.companyType === 'TRANSIT' && (
          <DashboardPanel
            title="Transit Operations"
            description="Transits and assigned shipments linked to this transit company"
          >
            <DashboardGrid className="grid-cols-1 md:grid-cols-2 mb-4">
              <StatsCard icon={<Building2 className="w-5 h-5" />} title="Transits" value={company._count?.transits || 0} variant="default" />
              <StatsCard icon={<ReceiptText className="w-5 h-5" />} title="Shipments" value={(company.shipments || []).filter((shipment) => Boolean(shipment.transitId)).length} variant="info" />
            </DashboardGrid>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ fontWeight: 600, mb: 1 }}>Recent Transits</Box>
              <DataTable
                data={company.transits || []}
                keyField="id"
                columns={[
                  { key: 'referenceNumber', header: 'Reference', sortable: true },
                  {
                    key: 'origin',
                    header: 'Route',
                    render: (_, row) => `${row.origin} -> ${row.destination}`,
                  },
                  { key: 'status', header: 'Status', sortable: true },
                  {
                    key: '_count',
                    header: 'Shipments',
                    render: (_, row) => row._count.shipments,
                  },
                ]}
              />
            </Box>

            <Box>
              <Box sx={{ fontWeight: 600, mb: 1 }}>Assigned Shipments</Box>
              <DataTable
                data={(company.shipments || []).filter((shipment) => Boolean(shipment.transitId))}
                keyField="id"
                columns={[
                  {
                    key: 'vehicleVIN',
                    header: 'Vehicle',
                    render: (_, row) => row.vehicleVIN || [row.vehicleMake, row.vehicleModel].filter(Boolean).join(' ') || '-',
                  },
                  { key: 'status', header: 'Status', sortable: true },
                  {
                    key: 'createdAt',
                    header: 'Created',
                    render: (_, row) => new Date(row.createdAt).toLocaleDateString(),
                  },
                  {
                    key: 'id',
                    header: 'Actions',
                    render: (_, row) => (
                      <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'center' }}>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => router.push(`/dashboard/shipments/${row.id}`)}
                        >
                          Shipment
                        </Button>
                        {row.transitId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/transits/${row.transitId}`)}
                          >
                            Transit
                          </Button>
                        )}
                      </Box>
                    ),
                  },
                ]}
              />
            </Box>

          </DashboardPanel>
        )}
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
        {report && report.summary.transactionCount > 0 && (
          <DashboardPanel title="Monthly Report" description="Transaction breakdown by month">
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Month</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Debit</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Credit</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {report.monthlyBreakdown?.map((row) => (
                    <tr key={row.month} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 500 }}>{row.month}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--error)' }}>{formatCurrency(row.debit)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--success)' }}>{formatCurrency(row.credit)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: row.net >= 0 ? 'var(--text-primary)' : 'var(--error)' }}>
                        {formatCurrency(row.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </DashboardPanel>
        )}
        {(!report || report.summary.transactionCount === 0) && (
          <DashboardPanel title="Monthly Report" description="Transaction breakdown by month">
            <Box sx={{ color: 'var(--text-secondary)' }}>No report data is available for this company yet.</Box>
          </DashboardPanel>
        )}
        </TabPanel>

        <Dialog open={openEntry} onClose={() => { if (!posting) { setOpenEntry(false); setIsPaymentMode(false); } }} maxWidth="sm" fullWidth>
          <DialogTitle>{isPaymentMode ? `Record Payment to ${company?.name || 'Company'}` : 'Add Company Transaction'}</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1.5 }}>
            <TextField label="Description" value={formData.description} onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))} required />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField select label="Type" value={formData.type} onChange={(event) => setFormData((prev) => ({ ...prev, type: event.target.value }))}>
                <MenuItem value="DEBIT">DEBIT (Payment to Company)</MenuItem>
                <MenuItem value="CREDIT">CREDIT (Company Charge/Expense)</MenuItem>
              </TextField>
              <TextField label="Amount" type="number" inputProps={{ min: 0.01, step: 0.01 }} value={formData.amount} onChange={(event) => setFormData((prev) => ({ ...prev, amount: event.target.value }))} />
            </Box>
            <TextField label="Transaction Date" type="date" InputLabelProps={{ shrink: true }} value={formData.transactionDate} onChange={(event) => setFormData((prev) => ({ ...prev, transactionDate: event.target.value }))} />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField label="Category" value={formData.category} onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))} />
              <TextField label="Reference" value={formData.reference} onChange={(event) => setFormData((prev) => ({ ...prev, reference: event.target.value }))} />
            </Box>
            <TextField label="Notes" rows={3} multiline value={formData.notes} onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))} />
          </DialogContent>
          <DialogActions>
            <Button variant="outline" onClick={() => { setOpenEntry(false); setIsPaymentMode(false); }} disabled={posting}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateEntry} disabled={posting}>{posting ? 'Saving...' : isPaymentMode ? 'Record Payment' : 'Save Transaction'}</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openImportDialog} onClose={() => { if (!importing && !previewingImport) { setOpenImportDialog(false); resetImportForm(); } }} maxWidth="md" fullWidth>
          <DialogTitle>Import Bank of America CSV</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1.5 }}>
            <Box sx={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Import a Bank of America CSV statement into this company ledger. Use a dedicated company record per bank account so the running balance stays meaningful.
            </Box>
            <Box sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Money in is imported as <strong>DEBIT</strong>. Money out is imported as <strong>CREDIT</strong>. Previously imported rows are skipped automatically.
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
              helperText="Optional, but recommended for reconciliation against the statement total"
              fullWidth
            />
            <Box>
              <Box sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)', mb: 1 }}>
                CSV file
              </Box>
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

        <Dialog open={openEditEntry} onClose={() => !updating && setOpenEditEntry(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1.5 }}>
            <TextField label="Description" value={editForm.description} onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))} required />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField select label="Type" value={editForm.type} onChange={(event) => setEditForm((prev) => ({ ...prev, type: event.target.value }))}>
                <MenuItem value="DEBIT">DEBIT</MenuItem>
                <MenuItem value="CREDIT">CREDIT</MenuItem>
              </TextField>
              <TextField label="Amount" type="number" inputProps={{ min: 0.01, step: 0.01 }} value={editForm.amount} onChange={(event) => setEditForm((prev) => ({ ...prev, amount: event.target.value }))} />
            </Box>
            <TextField label="Transaction Date" type="date" InputLabelProps={{ shrink: true }} value={editForm.transactionDate} onChange={(event) => setEditForm((prev) => ({ ...prev, transactionDate: event.target.value }))} />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField label="Category" value={editForm.category} onChange={(event) => setEditForm((prev) => ({ ...prev, category: event.target.value }))} />
              <TextField label="Reference" value={editForm.reference} onChange={(event) => setEditForm((prev) => ({ ...prev, reference: event.target.value }))} />
            </Box>
            <TextField label="Notes" rows={3} multiline value={editForm.notes} onChange={(event) => setEditForm((prev) => ({ ...prev, notes: event.target.value }))} />
          </DialogContent>
          <DialogActions>
            <Button variant="outline" onClick={() => setOpenEditEntry(false)} disabled={updating}>Cancel</Button>
            <Button variant="primary" onClick={handleEditEntry} disabled={updating}>{updating ? 'Saving...' : 'Save Changes'}</Button>
          </DialogActions>
        </Dialog>
      </DashboardSurface>
    </PermissionRoute>
  );
}
