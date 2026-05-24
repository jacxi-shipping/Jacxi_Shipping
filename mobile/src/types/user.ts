export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  balance: number;
  totalShipments: number;
  activeShipments: number;
  isActive: boolean;
  loginCode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerStats {
  totalShipments: number;
  activeShipments: number;
  deliveredShipments: number;
  totalSpent: number;
  currentBalance: number;
  overdueInvoices: number;
}

export interface CustomerFilters {
  search?: string;
  isActive?: boolean;
  hasBalance?: boolean;
}

export interface CustomerListResponse {
  data: Customer[];
  total: number;
  page: number;
  pageSize: number;
}
