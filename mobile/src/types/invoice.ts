export type InvoiceStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED' | 'DRAFT';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  shipmentId?: string;
  trackingNumber?: string;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceFilters {
  status?: InvoiceStatus[];
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface InvoiceListResponse {
  data: Invoice[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  method: string;
  reference?: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  paidAt: string;
  notes?: string;
}
