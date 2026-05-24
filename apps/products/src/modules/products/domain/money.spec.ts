import { describe, expect, it } from 'vitest';

import { InvalidMoneyError } from './errors';
import { Money } from './money';

describe('Money', () => {
  describe('fromCents', () => {
    it('creates a Money instance from valid cents', () => {
      const money = Money.fromCents(1999);
      expect(money.toCents()).toBe(1999);
      expect(money.getCurrency()).toBe('USD');
    });

    it('allows zero', () => {
      expect(Money.fromCents(0).toCents()).toBe(0);
    });

    it('defaults currency to USD', () => {
      expect(Money.fromCents(100).getCurrency()).toBe('USD');
    });

    it('rejects non-integer cents', () => {
      expect(() => Money.fromCents(19.99)).toThrow(InvalidMoneyError);
    });

    it('rejects negative cents', () => {
      expect(() => Money.fromCents(-1)).toThrow(InvalidMoneyError);
    });

    it('rejects unsupported currency', () => {
      // @ts-expect-error testing runtime validation
      expect(() => Money.fromCents(100, 'EUR')).toThrow(InvalidMoneyError);
    });
  });

  describe('equals', () => {
    it('returns true for the same amount and currency', () => {
      expect(Money.fromCents(500).equals(Money.fromCents(500))).toBe(true);
    });

    it('returns false for different amounts', () => {
      expect(Money.fromCents(500).equals(Money.fromCents(501))).toBe(false);
    });
  });
});
