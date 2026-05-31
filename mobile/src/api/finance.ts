import client from './client';
import {
  BankItemSummary,
  BankingLedgerResponse,
  CompanyLedgerEntry,
  CompanyLedgerSummary,
  FilteredBankSummary,
  FinanceCompanyDetail,
  FinanceCompanySummary,
  FinancialReportData,
  FinancialReportType,
} from '../types/admin';

export interface CompaniesResponse {
  companies: FinanceCompanySummary[];
}

export interface CompanyDetailResponse {
  company: FinanceCompanyDetail;
  summary: CompanyLedgerSummary;
}

export interface CompanyLedgerResponse {
  entries: CompanyLedgerEntry[];
  summary: CompanyLedgerSummary;
}

export interface BankItemsResponse {
  configured: boolean;
  items: BankItemSummary[];
}

export const financeApi = {
  async getCompanies(params?: { search?: string; companyType?: 'SHIPPING' | 'DISPATCH' | 'TRANSIT' }): Promise<CompaniesResponse> {
    const response = await client.get<CompaniesResponse>('/api/finance/companies', {
      params,
    });

    return response.data;
  },

  async getCompany(id: string): Promise<CompanyDetailResponse> {
    const response = await client.get<CompanyDetailResponse>(`/api/finance/companies/${id}`);
    return response.data;
  },

  async getCompanyLedger(id: string, params?: { search?: string; type?: 'DEBIT' | 'CREDIT'; source?: 'BANK_IMPORT' | 'MANUAL' }): Promise<CompanyLedgerResponse> {
    const response = await client.get<CompanyLedgerResponse>(`/api/finance/companies/${id}/ledger`, {
      params,
    });

    return response.data;
  },

  async getBankItems(): Promise<BankItemsResponse> {
    try {
      const response = await client.get<{ items: BankItemSummary[] }>('/api/finicity/items');
      return {
        configured: true,
        items: response.data.items || [],
      };
    } catch (error: any) {
      if (error?.status === 503) {
        return {
          configured: false,
          items: [],
        };
      }

      throw error;
    }
  },

  async getBankingLedger(): Promise<BankingLedgerResponse> {
    const response = await client.get<BankingLedgerResponse>('/api/ledger', {
      params: {
        source: 'BANK_IMPORT',
        page: 1,
        limit: 200,
      },
    });

    return response.data;
  },

  async getConnectUrl(): Promise<string> {
    const response = await client.post<{ connectUrl: string }>('/api/finicity/connect-url');
    return response.data.connectUrl;
  },

  async syncConnectedAccounts(itemId?: string): Promise<{ results: Array<{ importedCount?: number }> }> {
    const response = await client.post<{ results: Array<{ importedCount?: number }> }>('/api/finicity/sync', {
      ...(itemId ? { itemId } : {}),
      refresh: true,
    });

    return response.data;
  },

  async getFinancialReport(params: { type: FinancialReportType; startDate?: string; endDate?: string; userId?: string }): Promise<FinancialReportData> {
    const response = await client.get<FinancialReportData>('/api/reports/financial', {
      params,
    });

    return response.data;
  },
};