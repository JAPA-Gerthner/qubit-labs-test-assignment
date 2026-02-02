import { OperationalError } from '@/shared/errors/OperationalError';

/**
 * Error thrown when input validation fails.
 * Contains the field name and reason for failure.
 */
export class ValidationError extends OperationalError {
  readonly code = 'VALIDATION_ERROR' as const;
  readonly httpStatus = 400;

  constructor(
    readonly field: string,
    readonly reason: string
  ) {
    super(`Validation failed for ${field}: ${reason}`);
  }

  get userMessage(): string {
    return `Invalid ${this.field}: ${this.reason}`;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      field: this.field,
      reason: this.reason,
    };
  }
}

/**
 * Aggregates multiple validation errors.
 */
export class ValidationErrors extends OperationalError {
  readonly code = 'VALIDATION_ERRORS' as const;
  readonly httpStatus = 400;

  constructor(readonly errors: ValidationError[]) {
    super(`Multiple validation errors: ${errors.map((e) => e.field).join(', ')}`);
  }

  get userMessage(): string {
    return this.errors.map((e) => e.userMessage).join('; ');
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      errors: this.errors.map((e) => e.toJSON()),
    };
  }
}
