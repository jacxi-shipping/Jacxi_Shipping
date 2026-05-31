export interface AdminUserSummary {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt?: string;
  _count?: {
    shipments: number;
  };
}

export interface AdminUserStatement {
  summary: {
    outstandingAmount: number;
    overdueAmount: number;
    paidAmount: number;
    creditAmount: number;
    openInvoiceCount: number;
    overdueInvoiceCount: number;
    paidInvoiceCount: number;
    availableCredit: number;
    accountBalance: number;
  };
  collections: {
    status: string | null;
    promiseToPayDate: string | null;
    followUpDate: string | null;
    notes: string | null;
  };
  generatedAt: string;
}

export interface AdminUserShipment {
  id: string;
  vehicleType?: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehicleVIN: string | null;
  status: string;
  createdAt: string;
  price?: number | null;
}

export interface AdminUserDetail extends AdminUserSummary {
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  collectionStatus: string | null;
  promiseToPayDate: string | null;
  collectionFollowUpDate: string | null;
  collectionNotes: string | null;
  loginCode: string | null;
  createdAt: string;
  updatedAt: string;
  shipments: AdminUserShipment[];
  statement?: AdminUserStatement | null;
}

export interface AdminUserUpsertInput {
  name: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
}

export interface AdminUserCreateInput extends AdminUserUpsertInput {
  password: string;
}

export interface AdminUserRecord extends AdminUserUpsertInput {
  id: string;
  loginCode?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerPortalSummary {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  companyLabel?: string | null;
  customDomain?: string | null;
  memberships?: Array<{ role: string }>;
  _count?: {
    memberships?: number;
    customers?: number;
    shipmentAssignments?: number;
  };
}

export interface PartnerPortalDetail {
  id: string;
  name: string;
  code: string | null;
  customDomain: string | null;
  customDomainVerificationToken: string | null;
  customDomainVerifiedAt: string | null;
  companyLabel: string | null;
  accentColor: string | null;
  logoUrl: string | null;
  notifyOnShipmentAssigned: boolean;
  autoAssignToSingleCustomer: boolean;
  defaultShipmentNotes: string | null;
  requireCustomerLinkForReady: boolean;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerPortalCreateInput {
  name: string;
  ownerUserId: string;
  code?: string;
  companyLabel?: string;
  customDomain?: string;
  accentColor?: string;
  logoUrl?: string;
  notes?: string;
}

export interface PartnerPortalUpdateInput {
  customDomain?: string;
  companyLabel?: string;
  accentColor?: string;
  logoUrl?: string;
  notifyOnShipmentAssigned?: boolean;
  autoAssignToSingleCustomer?: boolean;
  defaultShipmentNotes?: string;
  requireCustomerLinkForReady?: boolean;
}

export interface PortalActivityItem {
  id: string;
  action: string;
  performedAt: string;
  actor: {
    id: string;
    name: string | null;
    email: string | null;
  };
  target: {
    id: string | null;
    name: string | null;
    email: string | null;
  };
  summary: string;
  changes?: Record<string, unknown>;
}

export type TransitStatus = 'PENDING' | 'DISPATCHED' | 'IN_TRANSIT' | 'ARRIVED' | 'DELIVERED' | 'CANCELLED';

export interface TransitCompany {
  id: string;
  name: string;
  code: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface TransitEvent {
  id: string;
  origin: string;
  destination: string;
  status: string;
  eventDate?: string;
  createdAt?: string;
  company?: TransitCompany | null;
}

export interface TransitExpense {
  id: string;
  type: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  vendor: string | null;
  invoiceNumber: string | null;
  category: string | null;
  notes: string | null;
  shipment?: {
    id: string;
    vehicleMake: string | null;
    vehicleModel: string | null;
    vehicleVIN: string | null;
  } | null;
  transitEvent?: {
    id: string;
    company?: TransitCompany | null;
  } | null;
  source: 'TRANSIT_EXPENSE' | 'SHIPMENT_EXPENSE';
}

export interface TransitShipment {
  id: string;
  status: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleVIN: string | null;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

export interface TransitSummary {
  id: string;
  referenceNumber: string;
  origin: string;
  destination: string;
  status: TransitStatus;
  dispatchDate: string | null;
  estimatedDelivery: string | null;
  actualDelivery?: string | null;
  cost: number | null;
  notes: string | null;
  createdAt: string;
  currentEvent: TransitEvent | null;
  currentCompany: TransitCompany | null;
  _count: {
    shipments: number;
    events: number;
    expenses: number;
  };
}

export interface TransitDetail extends TransitSummary {
  shipments: TransitShipment[];
  events: TransitEvent[];
  expenses: TransitExpense[];
}

export type FinanceCompanyType = 'SHIPPING' | 'DISPATCH' | 'TRANSIT';

export interface FinanceCompanySummary {
  id: string;
  name: string;
  code: string | null;
  companyType: FinanceCompanyType;
  isDispatch: boolean;
  isShipping: boolean;
  isTransit: boolean;
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  currentBalance: number;
  totalDebit: number;
  totalCredit: number;
  _count: {
    ledgerEntries: number;
  };
}

export interface FinanceCompanyDetail extends FinanceCompanySummary {
  _count: {
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

export interface CompanyLedgerSummary {
  totalDebit: number;
  totalCredit: number;
  totalExpenseCharges: number;
  currentBalance: number;
}

export interface CompanyLedgerEntry {
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

export interface BankingLedgerEntry {
  id: string;
  transactionDate: string;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  balance: number;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  reference?: string | null;
  category?: string | null;
}

export interface FilteredBankSummary {
  entryCount: number;
  totalDebit: number;
  totalCredit: number;
  netChange: number;
}

export interface BankAccountSummary {
  accountId: string;
  name: string;
  mask?: string | null;
  subtype?: string | null;
  type: string;
}

export interface BankItemSummary {
  id: string;
  itemId: string;
  institutionId?: string | null;
  institutionName?: string | null;
  lastSyncAt?: string | null;
  selectedAccounts?: BankAccountSummary[] | null;
  createdAt: string;
}

export interface BankingLedgerResponse {
  entries: BankingLedgerEntry[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  filteredSummary: FilteredBankSummary;
}

export type FinancialReportType = 'summary' | 'user-wise' | 'shipment-wise';

export interface FinancialUserBalance {
  userId: string;
  userName: string;
  currentBalance: number;
}

export interface FinancialUserReport {
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
}

export interface FinancialShipmentReport {
  shipmentId: string;
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
  createdAt?: string;
}

export interface FinancialReportData {
  reportType: FinancialReportType;
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
  userBalances?: FinancialUserBalance[];
  users?: FinancialUserReport[];
  summary?: {
    totalRevenue: number;
    totalExpenses: number;
    totalProfit: number;
    avgProfitMargin: number;
    shipmentCount: number;
  };
  dispatchSummary?: {
    activeCount: number;
    totalCount: number;
    totalExpenseAmount: number;
    expenseCount: number;
    statuses: Array<{
      status: string;
      count: number;
    }>;
  };
  shipments?: FinancialShipmentReport[];
}