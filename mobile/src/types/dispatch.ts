export type DispatchStatus = 'PENDING' | 'DISPATCHED' | 'ARRIVED_AT_PORT' | 'COMPLETED' | 'CANCELLED';

export interface DispatchSummary {
  id: string;
  referenceNumber: string;
  status: DispatchStatus;
  origin: string;
  destination: string;
  dispatchDate?: string | null;
  estimatedArrival?: string | null;
  cost?: number | null;
  notes?: string | null;
  createdAt: string;
  company?: {
    id: string;
    name: string;
    code: string | null;
  } | null;
  _count: {
    shipments: number;
    events: number;
    expenses: number;
  };
}

export interface DispatchListResponse {
  dispatches: DispatchSummary[];
}

export interface DispatchDetailShipment {
  id: string;
  status: string;
  dispatchId?: string | null;
  containerId?: string | null;
  transitId?: string | null;
  vehicleYear?: number | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleVIN?: string | null;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
    phone?: string | null;
  } | null;
}

export interface DispatchDetail {
  id: string;
  referenceNumber: string;
  status: DispatchStatus;
  origin: string;
  destination: string;
  estimatedArrival?: string | null;
  actualArrival?: string | null;
  notes?: string | null;
  shipments: DispatchDetailShipment[];
  _count: {
    shipments: number;
    events: number;
    expenses: number;
  };
}

export interface DispatchDetailResponse {
  dispatch: DispatchDetail;
  totalExpenses: number;
}

export interface DispatchHandoffInput {
  containerId: string;
  shipmentIds: string[];
}