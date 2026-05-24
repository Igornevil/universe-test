import { randomUUID } from 'node:crypto';

import { InvalidProductError, InvalidProductIdError } from './errors';
import { Money } from './money';

const NAME_MIN_LENGTH = 1;
const NAME_MAX_LENGTH = 255;
const DESCRIPTION_MAX_LENGTH = 2000;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Validates that a string is a UUID v1-v5; throws InvalidProductIdError otherwise. */
export const assertProductId = (id: string): void => {
  if (!UUID_REGEX.test(id)) {
    throw new InvalidProductIdError(id);
  }
};

interface ProductSnapshot {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  currency: 'USD';
  createdAt: Date;
}

/**
 * The Product aggregate root. Construction is gated through the static
 * factory methods so that every Product instance satisfies the invariants
 * defined here (valid UUID, non-empty name, length limits, valid Money).
 */
export class Product {
  private constructor(
    private readonly _id: string,
    private readonly _name: string,
    private readonly _description: string,
    private readonly _price: Money,
    private readonly _createdAt: Date,
  ) {}

  static create(params: { name: string; description: string; price: Money }): Product {
    const name = params.name.trim();
    const description = params.description.trim();

    Product.validateName(name);
    Product.validateDescription(description);

    return new Product(randomUUID(), name, description, params.price, new Date());
  }

  static restore(snapshot: ProductSnapshot): Product {
    assertProductId(snapshot.id);
    return new Product(
      snapshot.id.toLowerCase(),
      snapshot.name,
      snapshot.description,
      Money.fromCents(snapshot.priceCents, snapshot.currency),
      snapshot.createdAt,
    );
  }

  private static validateName(name: string): void {
    if (name.length < NAME_MIN_LENGTH) {
      throw new InvalidProductError('name must not be empty');
    }
    if (name.length > NAME_MAX_LENGTH) {
      throw new InvalidProductError(`name must be at most ${NAME_MAX_LENGTH} characters`);
    }
  }

  private static validateDescription(description: string): void {
    if (description.length > DESCRIPTION_MAX_LENGTH) {
      throw new InvalidProductError(
        `description must be at most ${DESCRIPTION_MAX_LENGTH} characters`,
      );
    }
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get description(): string {
    return this._description;
  }

  get price(): Money {
    return this._price;
  }

  get createdAt(): Date {
    return this._createdAt;
  }
}
