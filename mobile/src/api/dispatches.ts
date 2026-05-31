import client from './client';
import {
  DispatchDetailResponse,
  DispatchHandoffInput,
  DispatchListResponse,
  DispatchStatus,
} from '../types/dispatch';

export const dispatchesApi = {
  async getDispatches(params?: { search?: string; status?: DispatchStatus }): Promise<DispatchListResponse> {
    const response = await client.get<DispatchListResponse>('/api/dispatches', {
      params,
    });

    return response.data;
  },

  async getDispatch(id: string) {
    const response = await client.get<DispatchDetailResponse>(`/api/dispatches/${id}`);
    return response.data.dispatch;
  },

  async handoffDispatch(id: string, input: DispatchHandoffInput) {
    const response = await client.post(`/api/dispatches/${id}/handoff`, input);
    return response.data;
  },

  async receiveDispatch(id: string) {
    const response = await client.post(`/api/dispatches/${id}/receive`);
    return response.data;
  },
};