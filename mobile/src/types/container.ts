export type ContainerStatus =
  | 'CREATED'
  | 'WAITING_FOR_LOADING'
  | 'LOADED'
  | 'IN_TRANSIT'
  | 'ARRIVED_PORT'
  | 'CUSTOMS_CLEARANCE'
  | 'RELEASED'
  | 'CLOSED';

export interface Container {
  id: string;
  containerNumber: string;
  status: ContainerStatus;
  trackingNumber?: string | null;
  shippingLine?: string | null;
  vesselName?: string | null;
  voyageNumber?: string | null;
  bookingNumber?: string | null;
  loadingPort?: string | null;
  destinationPort?: string | null;
  departureDate?: string | null;
  actualArrival?: string | null;
  estimatedArrival?: string | null;
  currentLocation?: string | null;
  progress?: number | null;
  maxCapacity: number;
  currentCount: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  company?: {
    id: string;
    name: string;
    code: string | null;
  } | null;
  shipments?: Array<{
    id: string;
    vehicleVIN: string | null;
    vehicleMake: string | null;
    vehicleModel: string | null;
    status: string;
  }>;
  _count?: {
    shipments: number;
    expenses: number;
    invoices: number;
    documents: number;
  };
}

export interface ContainerDetailShipment {
  id: string;
  userId?: string;
  vehicleVIN: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  status: string;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

export interface ContainerDetailDocument {
  id: string;
  type: string;
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  notes?: string | null;
}

export interface ContainerDetailTrackingEvent {
  id: string;
  status: string;
  location?: string | null;
  description?: string | null;
  eventDate?: string | null;
  createdAt?: string;
}

export interface ContainerDetailExpense {
  id: string;
  type?: string;
  description: string;
  amount: number;
  currency?: string;
  date: string;
  vendor?: string | null;
  source?: string;
}

export interface ContainerDetailInvoice {
  id: string;
  invoiceNumber?: string;
  status?: string;
  amount: number;
  date?: string | null;
}

export interface ContainerDetail extends Container {
  totals?: {
    expenses: number;
    invoices: number;
  };
  shipments: ContainerDetailShipment[];
  documents: ContainerDetailDocument[];
  trackingEvents: ContainerDetailTrackingEvent[];
  expenses?: ContainerDetailExpense[];
  invoices?: ContainerDetailInvoice[];
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
  status?: ContainerStatus | 'active';
  shippingLine?: string;
  destinationPort?: string;
  search?: string;
}

export interface ContainerListResponse {
  containers: Container[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}
