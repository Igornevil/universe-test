import { ArgumentsHost, Catch, HttpStatus, Logger, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';

import {
  DomainError,
  InvalidMoneyError,
  InvalidProductError,
  InvalidProductIdError,
  ProductNotFoundError,
} from '../domain/errors';

const statusForError = (error: DomainError): number => {
  if (error instanceof ProductNotFoundError) {
    return HttpStatus.NOT_FOUND;
  }
  if (
    error instanceof InvalidProductIdError ||
    error instanceof InvalidMoneyError ||
    error instanceof InvalidProductError
  ) {
    return HttpStatus.BAD_REQUEST;
  }
  return HttpStatus.INTERNAL_SERVER_ERROR;
};

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = statusForError(exception);

    if (status >= 500) {
      this.logger.error(exception.message, exception.stack);
    } else {
      this.logger.warn(`${exception.code}: ${exception.message}`);
    }

    response.status(status).json({
      statusCode: status,
      code: exception.code,
      message: exception.message,
    });
  }
}
