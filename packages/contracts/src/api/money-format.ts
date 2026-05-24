/**
 * Helpers for converting between display strings ("19.99") and integer cents (1999).
 * Used by the frontend; backend never deals with decimal strings.
 */

const CENTS_PER_UNIT = 100;

/**
 * Parses a decimal string into integer cents. Returns null on invalid input.
 * Accepts: "0", "0.5", "19.99", " 19.99 ". Rejects: "", "abc", "19.999", "-1".
 */
export const parsePriceToCents = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }
  const [whole, fraction = ''] = trimmed.split('.');
  const wholePart = Number.parseInt(whole ?? '0', 10);
  const fractionPart = Number.parseInt(fraction.padEnd(2, '0'), 10);
  if (Number.isNaN(wholePart) || Number.isNaN(fractionPart)) {
    return null;
  }
  return wholePart * CENTS_PER_UNIT + fractionPart;
};

/** Formats integer cents as a decimal string with exactly 2 fraction digits. */
export const formatCentsAsDecimal = (cents: number): string => {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error(`Invalid cents value: ${cents}`);
  }
  const whole = Math.trunc(cents / CENTS_PER_UNIT);
  const fraction = cents % CENTS_PER_UNIT;
  return `${whole}.${fraction.toString().padStart(2, '0')}`;
};
