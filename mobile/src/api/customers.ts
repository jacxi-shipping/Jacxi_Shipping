import client from './client';
import { Customer, CustomerFilters, CustomerListResponse, CustomerStats } from '../types/user';
import { PaginationParams } from '../types/api';

type UserListItem = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  _count?: {
    shipments?: number;
  };
};

type UserListResponse = {
  users: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
};

type UserDetailResponse = {
  user: {
    id: string;
    name: string | null;
    email: string;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    loginCode?: string | null;
    createdAt: string;
    updatedAt: string;
    shipments?: Array<{
      status: string;
    }>;
    statement?: {
      summary?: {
        accountBalance?: number;
        overdueInvoiceCount?: number;
      };
    } | null;
  };
};

const inactiveShipmentStatuses = new Set(['DELIVERED', 'CANCELLED']);

function mapUserListItemToCustomer(user: UserListItem): Customer {
  return {
    id: user.id,
    name: user.name || user.email,
    email: user.email,
    balance: 0,
    totalShipments: user._count?.shipments || 0,
    activeShipments: 0,
    isActive: true,
    createdAt: user.createdAt,
    updatedAt: user.createdAt,
  };
}

function mapUserDetailToCustomer(user: UserDetailResponse['user']): Customer {
  const shipments = user.shipments || [];
  const activeShipments = shipments.filter((shipment) => !inactiveShipmentStatuses.has(shipment.status)).length;

  return {
    id: user.id,
    name: user.name || user.email,
    email: user.email,
    phone: user.phone || undefined,
    address: user.address || user.city || user.country
      ? {
          street: user.address || undefined,
          city: user.city || undefined,
          country: user.country || undefined,
        }
      : undefined,
    balance: user.statement?.summary?.accountBalance ?? 0,
    totalShipments: shipments.length,
    activeShipments,
    isActive: true,
    loginCode: user.loginCode || undefined,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export const customersApi = {
  async getCustomers(
    filters?: CustomerFilters,
    pagination?: PaginationParams
  ): Promise<CustomerListResponse> {
    const response = await client.get<UserListResponse>('/api/users', {
      params: {
        query: filters?.search,
        roleType: 'customers',
        ...pagination,
      },
    });

    return {
      data: (response.data.users || []).map(mapUserListItemToCustomer),
      total: response.data.total,
      page: response.data.page,
      pageSize: response.data.pageSize,
    };
  },

  async getCustomer(id: string): Promise<Customer> {
    const response = await client.get<UserDetailResponse>(`/api/users/${id}`);
    return mapUserDetailToCustomer(response.data.user);
  },

  async getCustomerStats(id: string): Promise<CustomerStats> {
    const customer = await this.getCustomer(id);

    return {
      totalShipments: customer.totalShipments,
      activeShipments: customer.activeShipments,
      deliveredShipments: Math.max(customer.totalShipments - customer.activeShipments, 0),
      totalSpent: 0,
      currentBalance: customer.balance,
      overdueInvoices: 0,
    };
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
