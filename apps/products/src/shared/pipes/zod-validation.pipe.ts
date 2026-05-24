import { BadRequestException, type PipeTransform } from '@nestjs/common';
import { ZodError, type ZodSchema } from 'zod';

interface ZodFieldError {
  path: string;
  message: string;
}

/**
 * Generic NestJS pipe that validates and transforms input using a Zod schema.
 * On failure, throws a 400 with a structured list of issues so clients can
 * map errors to specific form fields.
 */
export class ZodValidationPipe<TSchema extends ZodSchema> implements PipeTransform {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): unknown {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: ZodFieldError[] = error.issues.map((issue) => ({
          path: issue.path.join('.') || '(root)',
          message: issue.message,
        }));
        throw new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Validation failed',
          code: 'VALIDATION_FAILED',
          details: errors,
        });
      }
      throw error;
    }
  }
}
