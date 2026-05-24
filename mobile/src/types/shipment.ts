export type ShipmentStatus =
  | 'ON_HAND'
  | 'DISPATCHING'
  | 'IN_TRANSIT'
  | 'IN_TRANSIT_TO_DESTINATION'
  | 'AT_PORT'
  | 'CUSTOMS_CLEARANCE'
  | 'RELEASED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'PENDING';

export interface Vehicle {
  vin: string;
  year?: number;
  make?: string;
  model?: string;
  color?: string;
  type?: string;
  keys?: string;
  title?: string;
  titleState?: string;
}

export interface Location {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface ShipmentTracking {
  id: string;
  status: ShipmentStatus;
  location?: string;
  description?: string;
  timestamp: string;
  updatedBy?: string;
}

export interface ShipmentDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface ShipmentPhoto {
  id: string;
  url: string;
  thumbnail?: string;
  caption?: string;
  uploadedAt: string;
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  vehicle: Vehicle;
  status: ShipmentStatus;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  origin: Location;
  destination: Location;
  pickupDate?: string;
  deliveryDate?: string;
  estimatedDelivery?: string;
  containerId?: string;
  containerNumber?: string;
  invoiceId?: string;
  pricing?: {
    shippingCost: number;
    oceanFreight?: number;
    insurance?: number;
    total: number;
    currency: string;
  };
  tracking: ShipmentTracking[];
  documents: ShipmentDocument[];
  photos: ShipmentPhoto[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentCreateInput {
  vehicle: Vehicle;
  customerId: string;
  origin: Location;
  destination: Location;
  pickupDate?: string;
  estimatedDelivery?: string;
  pricing?: {
    shippingCost: number;
    oceanFreight?: number;
    insurance?: number;
  };
  notes?: string;
}

export interface ShipmentUpdateInput {
  status?: ShipmentStatus;
  containerId?: string;
  deliveryDate?: string;
  estimatedDelivery?: string;
  notes?: string;
}

export interface ShipmentFilters {
  status?: ShipmentStatus[];
  customerId?: string;
  containerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface ShipmentListResponse {
  data: Shipment[];
  total: number;
  page: number;
  pageSize: number;
}
