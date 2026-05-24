import client from './client';
import { Customer, CustomerFilters, CustomerListResponse, CustomerStats } from '../types/user';
import { PaginationParams } from '../types/api';

export const customersApi = {
  async getCustomers(
    filters?: CustomerFilters,
    pagination?: PaginationParams
  ): Promise<CustomerListResponse> {
    const response = await client.get<CustomerListResponse>('/api/customers', {
      params: {
        ...filters,
        ...pagination,
      },
    });
    return response.data;
  },

  async getCustomer(id: string): Promise<Customer> {
    const response = await client.get<Customer>(`/api/customers/${id}`);
    return response.data;
  },

  async getCustomerStats(id: string): Promise<CustomerStats> {
    const response = await client.get<CustomerStats>(`/api/customers/${id}/stats`);
    return response.data;
  },

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    const response = await client.post<Customer>('/api/customers', data);
    return response.data;
  },

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    const response = await client.patch<Customer>(`/api/customers/${id}`, data);
    return response.data;
  },

  async deleteCustomer(id: string): Promise<void> {
    await client.delete(`/api/customers/${id}`);
  },
};
