import { formatCentsAsDecimal, type SupportedCurrency } from '@universe/contracts';

const CURRENCY_SYMBOL: Record<SupportedCurrency, string> = { USD: '$' };

export const formatPrice = (cents: number, currency: SupportedCurrency): string => {
  return `${CURRENCY_SYMBOL[currency]}${formatCentsAsDecimal(cents)}`;
};

export const formatDate = (iso: string): string => {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
