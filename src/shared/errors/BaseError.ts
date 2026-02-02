/**
 * Base error class for all application errors.
 * Provides consistent error structure with identification and serialization.
 */
export abstract class BaseError extends Error {
  /**
   * Machine-readable error code (e.g., 'VALIDATION_ERROR', 'NOT_FOUND')
   */
  abstract readonly code: string;

  /**
   * Whether this error is operational (expected) or a programmer error (bug).
   * Operational errors are handled gracefully; programmer errors may crash.
   */
  abstract readonly isOperational: boolean;

  /**
   * Timestamp when the error occurred
   */
  readonly timestamp: Date = new Date();

  /**
   * Unique identifier for this error instance (useful for logging/tracking)
   */
  readonly id: string = crypto.randomUUID();

  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;

    // Maintains proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture stack trace (V8 engines only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serializes the error for logging or API responses.
   * Excludes stack trace for security.
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      code: this.code,
      name: this.name,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      isOperational: this.isOperational,
      ...(this.cause && { cause: this.cause.message }),
    };
  }

  /**
   * Returns a string representation suitable for logging.
   */
  toString(): string {
    return `[${this.code}] ${this.name}: ${this.message}`;
  }
}
