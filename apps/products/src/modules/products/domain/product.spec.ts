import { describe, expect, it } from 'vitest';

import { InvalidProductError, InvalidProductIdError } from './errors';
import { Money } from './money';
import { Product, assertProductId } from './product';

const validInput = {
  name: 'Test Product',
  description: 'A description',
  price: Money.fromCents(1999),
};

describe('Product.create', () => {
  it('produces a Product with generated id and current createdAt', () => {
    const before = Date.now();
    const product = Product.create(validInput);
    const after = Date.now();

    expect(product.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(product.name).toBe('Test Product');
    expect(product.description).toBe('A description');
    expect(product.price.equals(Money.fromCents(1999))).toBe(true);
    expect(product.createdAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(product.createdAt.getTime()).toBeLessThanOrEqual(after);
  });

  it('trims whitespace from name and description', () => {
    const product = Product.create({
      ...validInput,
      name: '  Spaced Name  ',
      description: '  Spaced desc  ',
    });
    expect(product.name).toBe('Spaced Name');
    expect(product.description).toBe('Spaced desc');
  });

  it('accepts empty description', () => {
    const product = Product.create({ ...validInput, description: '' });
    expect(product.description).toBe('');
  });

  it('rejects empty name', () => {
    expect(() => Product.create({ ...validInput, name: '' })).toThrow(InvalidProductError);
  });

  it('rejects whitespace-only name', () => {
    expect(() => Product.create({ ...validInput, name: '   ' })).toThrow(InvalidProductError);
  });

  it('rejects name longer than 255 chars', () => {
    expect(() => Product.create({ ...validInput, name: 'a'.repeat(256) })).toThrow(
      InvalidProductError,
    );
  });

  it('rejects description longer than 2000 chars', () => {
    expect(() => Product.create({ ...validInput, description: 'a'.repeat(2001) })).toThrow(
      InvalidProductError,
    );
  });
});

describe('Product.restore', () => {
  const snapshot = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Restored',
    description: 'Restored desc',
    priceCents: 4500,
    currency: 'USD' as const,
    createdAt: new Date('2026-05-21T10:00:00.000Z'),
  };

  it('hydrates a Product from a persistence snapshot', () => {
    const product = Product.restore(snapshot);
    expect(product.id).toBe(snapshot.id);
    expect(product.name).toBe(snapshot.name);
    expect(product.price.toCents()).toBe(snapshot.priceCents);
    expect(product.createdAt).toEqual(snapshot.createdAt);
  });

  it('normalises uppercase UUIDs to lowercase', () => {
    const product = Product.restore({ ...snapshot, id: snapshot.id.toUpperCase() });
    expect(product.id).toBe(snapshot.id);
  });

  it('throws InvalidProductIdError for a malformed id', () => {
    expect(() => Product.restore({ ...snapshot, id: 'not-a-uuid' })).toThrow(InvalidProductIdError);
  });

  it('does not re-trim the snapshot values', () => {
    const product = Product.restore({ ...snapshot, name: '  Padded  ' });
    expect(product.name).toBe('  Padded  ');
  });
});

describe('assertProductId', () => {
  it('accepts valid UUIDs', () => {
    expect(() => assertProductId('550e8400-e29b-41d4-a716-446655440000')).not.toThrow();
  });

  it.each([
    ['empty string', ''],
    ['random text', 'not-a-uuid'],
    ['truncated UUID', '550e8400-e29b-41d4-a716'],
    ['invalid version', '550e8400-e29b-71d4-a716-446655440000'],
  ])('rejects %s', (_label, value) => {
    expect(() => assertProductId(value)).toThrow(InvalidProductIdError);
  });
});
