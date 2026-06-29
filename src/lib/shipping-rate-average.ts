import {
  type AuctionRateEntry,
  type ShippingRateCalculatorConfig,
  normalizeShippingRateConfig,
} from '@/lib/shipping-rate-calculator';

export type CompanyRateEstimateSource = {
  companyId: string;
  companyName: string;
  priceListId?: string | null;
  priceListName?: string | null;
  sourceFileName?: string | null;
  config: unknown;
};

export type CompanyRateEstimate = {
  companyId: string;
  companyName: string;
  priceListId: string | null;
  priceListName: string | null;
  sourceFileName: string | null;
  baseRate: number;
  rateType: 'auction_average' | 'state_rate';
  matchedAuctionRows: number;
};

export type AverageCompanyRateEstimate = {
  originState: string;
  averageBaseRate: number | null;
  companyCount: number;
  matchedAuctionRows: number;
  sources: CompanyRateEstimate[];
};

function getRawStateRates(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const stateRates = (value as { stateRates?: unknown }).stateRates;
  return stateRates && typeof stateRates === 'object' && !Array.isArray(stateRates)
    ? stateRates as Record<string, unknown>
    : {};
}

function getStateAuctionRates(config: ShippingRateCalculatorConfig, originState: string) {
  return config.auctionRates.filter((rate) => rate.stateCode === originState && Number.isFinite(rate.total) && rate.total > 0);
}

function average(numbers: number[]) {
  if (!numbers.length) return null;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

export function buildAverageCompanyRateEstimate(
  sources: CompanyRateEstimateSource[],
  originState: string,
): AverageCompanyRateEstimate {
  const normalizedState = originState.trim().toUpperCase();
  const estimates: CompanyRateEstimate[] = [];

  for (const source of sources) {
    const config = normalizeShippingRateConfig(source.config);
    const auctionRates = getStateAuctionRates(config, normalizedState);
    const auctionAverage = average(auctionRates.map((rate: AuctionRateEntry) => rate.total));
    const rawStateRates = getRawStateRates(source.config);
    const rawStateRate = rawStateRates[normalizedState];
    const parsedStateRate = typeof rawStateRate === 'number'
      ? rawStateRate
      : Number(String(rawStateRate ?? '').replace(/[$,\s]/g, ''));
    const hasStateRate = Number.isFinite(parsedStateRate) && parsedStateRate > 0;
    const baseRate = auctionAverage ?? (hasStateRate ? parsedStateRate : null);

    if (!baseRate) continue;

    estimates.push({
      companyId: source.companyId,
      companyName: source.companyName,
      priceListId: source.priceListId || null,
      priceListName: source.priceListName || null,
      sourceFileName: source.sourceFileName || null,
      baseRate: Math.round(baseRate),
      rateType: auctionAverage ? 'auction_average' : 'state_rate',
      matchedAuctionRows: auctionRates.length,
    });
  }

  const averageBaseRate = average(estimates.map((estimate) => estimate.baseRate));

  return {
    originState: normalizedState,
    averageBaseRate: averageBaseRate === null ? null : Math.round(averageBaseRate),
    companyCount: estimates.length,
    matchedAuctionRows: estimates.reduce((sum, estimate) => sum + estimate.matchedAuctionRows, 0),
    sources: estimates,
  };
}
