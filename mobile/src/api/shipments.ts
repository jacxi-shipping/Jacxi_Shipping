import client from './client';
import {
  Shipment,
  ShipmentCreateInput,
  ShipmentFilters,
  ShipmentListResponse,
  ShipmentUpdateInput,
  ShipmentTracking,
} from '../types/shipment';
import { PaginationParams } from '../types/api';

export const shipmentsApi = {
  async getShipments(
    filters?: ShipmentFilters,
    pagination?: PaginationParams
  ): Promise<ShipmentListResponse> {
    const response = await client.get<ShipmentListResponse>('/api/shipments', {
      params: {
        ...filters,
        ...pagination,
      },
    });
    return response.data;
  },

  async getShipment(id: string): Promise<Shipment> {
    const response = await client.get<Shipment>(`/api/shipments/${id}`);
    return response.data;
  },

  async getShipmentByTracking(trackingNumber: string): Promise<Shipment> {
    const response = await client.get<Shipment>(`/api/shipments/tracking/${trackingNumber}`);
    return response.data;
  },

  async createShipment(data: ShipmentCreateInput): Promise<Shipment> {
    const response = await client.post<Shipment>('/api/shipments', data);
    return response.data;
  },

  async updateShipment(id: string, data: ShipmentUpdateInput): Promise<Shipment> {
    const response = await client.patch<Shipment>(`/api/shipments/${id}`, data);
    return response.data;
  },

  async deleteShipment(id: string): Promise<void> {
    await client.delete(`/api/shipments/${id}`);
  },

  async addTracking(id: string, tracking: Omit<ShipmentTracking, 'id'>): Promise<Shipment> {
    const response = await client.post<Shipment>(`/api/shipments/${id}/tracking`, tracking);
    return response.data;
  },

  async uploadDocument(id: string, file: FormData): Promise<Shipment> {
    const response = await client.post<Shipment>(`/api/shipments/${id}/documents`, file, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async uploadPhoto(id: string, file: FormData): Promise<Shipment> {
    const response = await client.post<Shipment>(`/api/shipments/${id}/photos`, file, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async deleteDocument(id: string, documentId: string): Promise<void> {
    await client.delete(`/api/shipments/${id}/documents/${documentId}`);
  },

  async deletePhoto(id: string, photoId: string): Promise<void> {
    await client.delete(`/api/shipments/${id}/photos/${photoId}`);
  },
};
