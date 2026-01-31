/**
 * Multi-currency support utilities
 * Handles currency conversion and formatting
 */

export type Currency = "USD" | "EUR" | "GBP" | "CAD" | "AUD" | "JPY" | "CNY" | "AED";

export interface CurrencyRate {
  currency: Currency;
  rate: number; // Rate relative to USD
  lastUpdated: Date;
}

// Default exchange rates (relative to USD = 1.0)
// In production, these should be fetched from an API like exchangerate-api.com
const DEFAULT_RATES: Record<Currency, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.35,
  AUD: 1.52,
  JPY: 149.50,
  CNY: 7.24,
  AED: 3.67,
};

/**
 * Convert amount from one currency to another
 */
export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  rates: Record<Currency, number> = DEFAULT_RATES
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // Convert to USD first, then to target currency
  const usdAmount = amount / rates[fromCurrency];
  const convertedAmount = usdAmount * rates[toCurrency];

  return Number(convertedAmount.toFixed(2));
}

/**
 * Format amount with currency symbol
 */
export function formatCurrency(amount: number, currency: Currency = "USD"): string {
  const symbols: Record<Currency, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    CAD: "C$",
    AUD: "A$",
    JPY: "¥",
    CNY: "¥",
    AED: "AED ",
  };

  const decimals = currency === "JPY" ? 0 : 2;
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${symbols[currency]}${formatted}`;
}

/**
 * Get exchange rate between two currencies
 */
export function getExchangeRate(
  fromCurrency: Currency,
  toCurrency: Currency,
  rates: Record<Currency, number> = DEFAULT_RATES
): number {
  if (fromCurrency === toCurrency) {
    return 1.0;
  }

  const rate = rates[toCurrency] / rates[fromCurrency];
  return Number(rate.toFixed(6));
}

/**
 * Fetch latest exchange rates from API (stub for future implementation)
 * In production, integrate with: exchangerate-api.com, fixer.io, or xe.com
 */
export async function fetchExchangeRates(): Promise<Record<Currency, number>> {
  // TODO: Implement actual API call
  // Example: const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
  // For now, return default rates
  return DEFAULT_RATES;
}

/**
 * Currency display settings
 */
export const CURRENCY_CONFIG: Record<
  Currency,
  { name: string; symbol: string; decimals: number }
> = {
  USD: { name: "US Dollar", symbol: "$", decimals: 2 },
  EUR: { name: "Euro", symbol: "€", decimals: 2 },
  GBP: { name: "British Pound", symbol: "£", decimals: 2 },
  CAD: { name: "Canadian Dollar", symbol: "C$", decimals: 2 },
  AUD: { name: "Australian Dollar", symbol: "A$", decimals: 2 },
  JPY: { name: "Japanese Yen", symbol: "¥", decimals: 0 },
  CNY: { name: "Chinese Yuan", symbol: "¥", decimals: 2 },
  AED: { name: "UAE Dirham", symbol: "AED ", decimals: 2 },
};
