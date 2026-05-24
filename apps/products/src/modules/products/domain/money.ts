import { InvalidMoneyError } from './errors';

export type Currency = 'USD';

const SUPPORTED_CURRENCIES: readonly Currency[] = ['USD'];

/**
 * Money is an immutable value object representing a monetary amount.
 * Internally stored as integer cents (smallest currency unit) to avoid
 * any floating-point arithmetic in the domain.
 */
export class Money {
  private constructor(
    private readonly cents: number,
    private readonly currency: Currency,
  ) {}

  static fromCents(cents: number, currency: Currency = 'USD'): Money {
    if (!Number.isInteger(cents)) {
      throw new InvalidMoneyError(`cents must be an integer, got ${cents}`);
    }
    if (cents < 0) {
      throw new InvalidMoneyError(`cents must be non-negative, got ${cents}`);
    }
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      throw new InvalidMoneyError(`unsupported currency: ${currency}`);
    }
    return new Money(cents, currency);
  }

  toCents(): number {
    return this.cents;
  }

  getCurrency(): Currency {
    return this.currency;
  }

  equals(other: Money): boolean {
    return this.cents === other.cents && this.currency === other.currency;
  }
}
