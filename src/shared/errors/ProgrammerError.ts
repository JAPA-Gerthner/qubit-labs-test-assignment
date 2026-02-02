import { BaseError } from './BaseError';

/**
 * Programmer errors indicate bugs in the code that should be fixed.
 * Examples: null reference, invalid arguments, assertion failures.
 *
 * These errors typically should not occur in production and may
 * warrant logging, alerts, or even process termination.
 */
export abstract class ProgrammerError extends BaseError {
  readonly isOperational = false as const;

  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}

/**
 * Error thrown when code reaches a state that should be impossible.
 * Indicates a logic error or missing case handling.
 */
export class UnreachableError extends ProgrammerError {
  readonly code = 'UNREACHABLE' as const;

  constructor(value: never, message?: string) {
    super(message ?? `Reached unreachable code with value: ${JSON.stringify(value)}`);
  }
}

/**
 * Error thrown when a required value is unexpectedly null or undefined.
 */
export class AssertionError extends ProgrammerError {
  readonly code = 'ASSERTION_FAILED' as const;

  constructor(message: string) {
    super(message);
  }
}

/**
 * Asserts that a condition is true, throwing AssertionError if not.
 */
export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new AssertionError(message);
  }
}

/**
 * Asserts that a value is not null or undefined.
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new AssertionError(message);
  }
}

/**
 * Used in switch statements to ensure exhaustive matching.
 * TypeScript will error if a case is not handled.
 *
 * @example
 * switch (status) {
 *   case 'active': return handleActive();
 *   case 'inactive': return handleInactive();
 *   default: return assertNever(status);
 * }
 */
export function assertNever(value: never): never {
  throw new UnreachableError(value);
}
