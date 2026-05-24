export type ContainerStatus =
  | 'LOADING'
  | 'IN_TRANSIT'
  | 'AT_PORT'
  | 'CUSTOMS'
  | 'DELIVERED'
  | 'EMPTY'
  | 'CANCELLED';

export interface Container {
  id: string;
  containerNumber: string;
  status: ContainerStatus;
  type: string;
  size: string;
  capacity: number;
  currentLoad: number;
  origin: {
    port?: string;
    country?: string;
  };
  destination: {
    port?: string;
    country?: string;
  };
  departureDate?: string;
  arrivalDate?: string;
  estimatedArrival?: string;
  shipmentIds: string[];
  shipmentCount: number;
  tracking: ContainerTracking[];
  sealNumber?: string;
  bookingNumber?: string;
  billOfLading?: string;
  vessel?: string;
  voyage?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContainerTracking {
  id: string;
  status: ContainerStatus;
  location?: string;
  description?: string;
  timestamp: string;
  updatedBy?: string;
}

export interface ContainerFilters {
  status?: ContainerStatus[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface ContainerListResponse {
  data: Container[];
  total: number;
  page: number;
  pageSize: number;
}
