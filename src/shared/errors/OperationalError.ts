import { BaseError } from './BaseError';

/**
 * Operational errors are expected failures that occur during normal operation.
 * Examples: validation failures, not found errors, permission denied.
 *
 * These errors should be handled gracefully and communicated to users.
 */
export abstract class OperationalError extends BaseError {
  readonly isOperational = true as const;

  /**
   * User-friendly message suitable for display in the UI.
   * Should not contain sensitive information.
   */
  abstract readonly userMessage: string;

  /**
   * HTTP status code for API responses (optional).
   */
  readonly httpStatus?: number;

  constructor(message: string, cause?: Error) {
    super(message, cause);
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      userMessage: this.userMessage,
      ...(this.httpStatus && { httpStatus: this.httpStatus }),
    };
  }
}
