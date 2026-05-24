/**
 * Domain errors raised by the Products service. Each carries a stable `code`
 * so the presentation layer can map errors to HTTP responses without
 * string-matching messages.
 */

export abstract class DomainError extends Error {
  protected constructor(
    public readonly code: string,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class InvalidProductIdError extends DomainError {
  constructor(value: string) {
    super('INVALID_PRODUCT_ID', `Invalid product id: "${value}". Expected a UUID v4.`);
  }
}

export class InvalidMoneyError extends DomainError {
  constructor(reason: string) {
    super('INVALID_MONEY', `Invalid money value: ${reason}`);
  }
}

export class InvalidProductError extends DomainError {
  constructor(reason: string) {
    super('INVALID_PRODUCT', `Invalid product: ${reason}`);
  }
}

export class ProductNotFoundError extends DomainError {
  constructor(id: string) {
    super('PRODUCT_NOT_FOUND', `Product with id "${id}" was not found.`);
  }
}
