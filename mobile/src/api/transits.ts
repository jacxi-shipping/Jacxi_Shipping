import client from './client';
import { TransitDetail, TransitStatus, TransitSummary } from '../types/admin';

export interface TransitsResponse {
  transits: TransitSummary[];
}

export interface TransitDetailResponse {
  transit: TransitDetail;
  totalExpenses: number;
}

export const transitsApi = {
  async getTransits(params?: { search?: string; status?: TransitStatus; companyId?: string }): Promise<TransitsResponse> {
    const response = await client.get<TransitsResponse>('/api/transits', {
      params,
    });

    return response.data;
  },

  async getTransit(id: string): Promise<TransitDetailResponse> {
    const response = await client.get<TransitDetailResponse>(`/api/transits/${id}`);
    return response.data;
  },
};