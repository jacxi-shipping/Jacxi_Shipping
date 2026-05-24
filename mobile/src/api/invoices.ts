import client from './client';
import { Invoice, InvoiceFilters, InvoiceListResponse, Payment } from '../types/invoice';
import { PaginationParams } from '../types/api';

export const invoicesApi = {
  async getInvoices(
    filters?: InvoiceFilters,
    pagination?: PaginationParams
  ): Promise<InvoiceListResponse> {
    const response = await client.get<InvoiceListResponse>('/api/invoices', {
      params: {
        ...filters,
        ...pagination,
      },
    });
    return response.data;
  },

  async getInvoice(id: string): Promise<Invoice> {
    const response = await client.get<Invoice>(`/api/invoices/${id}`);
    return response.data;
  },

  async createInvoice(data: Partial<Invoice>): Promise<Invoice> {
    const response = await client.post<Invoice>('/api/invoices', data);
    return response.data;
  },

  async updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice> {
    const response = await client.patch<Invoice>(`/api/invoices/${id}`, data);
    return response.data;
  },

  async deleteInvoice(id: string): Promise<void> {
    await client.delete(`/api/invoices/${id}`);
  },

  async markAsPaid(id: string, payment: Partial<Payment>): Promise<Invoice> {
    const response = await client.post<Invoice>(`/api/invoices/${id}/pay`, payment);
    return response.data;
  },

  async downloadInvoice(id: string): Promise<Blob> {
    const response = await client.get(`/api/invoices/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
