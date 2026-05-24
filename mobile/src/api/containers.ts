import client from './client';
import { Container, ContainerFilters, ContainerListResponse } from '../types/container';
import { PaginationParams } from '../types/api';

export const containersApi = {
  async getContainers(
    filters?: ContainerFilters,
    pagination?: PaginationParams
  ): Promise<ContainerListResponse> {
    const response = await client.get<ContainerListResponse>('/api/containers', {
      params: {
        ...filters,
        ...pagination,
      },
    });
    return response.data;
  },

  async getContainer(id: string): Promise<Container> {
    const response = await client.get<Container>(`/api/containers/${id}`);
    return response.data;
  },

  async createContainer(data: Partial<Container>): Promise<Container> {
    const response = await client.post<Container>('/api/containers', data);
    return response.data;
  },

  async updateContainer(id: string, data: Partial<Container>): Promise<Container> {
    const response = await client.patch<Container>(`/api/containers/${id}`, data);
    return response.data;
  },

  async deleteContainer(id: string): Promise<void> {
    await client.delete(`/api/containers/${id}`);
  },

  async addShipmentToContainer(containerId: string, shipmentId: string): Promise<Container> {
    const response = await client.post<Container>(
      `/api/containers/${containerId}/shipments/${shipmentId}`
    );
    return response.data;
  },

  async removeShipmentFromContainer(containerId: string, shipmentId: string): Promise<Container> {
    const response = await client.delete<Container>(
      `/api/containers/${containerId}/shipments/${shipmentId}`
    );
    return response.data;
  },
};
