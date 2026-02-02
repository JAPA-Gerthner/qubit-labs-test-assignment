/**
 * Result type for explicit error handling.
 * Use instead of throwing exceptions for expected failures.
 */

export type Result<T, E = Error> = Ok<T> | Err<E>;

/**
 * Represents a successful result containing a value.
 */
export class Ok<T> {
  readonly _tag = 'Ok' as const;

  constructor(readonly value: T) {}

  isOk(): this is Ok<T> {
    return true;
  }

  isErr(): this is Err<never> {
    return false;
  }

  map<U>(fn: (value: T) => U): Result<U, never> {
    return new Ok(fn(this.value));
  }

  flatMap<U, E>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this.value);
  }

  mapErr<F>(_fn: (error: never) => F): Result<T, F> {
    return this as unknown as Result<T, F>;
  }

  unwrap(): T {
    return this.value;
  }

  unwrapOr(_defaultValue: T): T {
    return this.value;
  }

  unwrapOrElse(_fn: (error: never) => T): T {
    return this.value;
  }

  match<U>(handlers: { ok: (value: T) => U; err: (error: never) => U }): U {
    return handlers.ok(this.value);
  }

  tap(fn: (value: T) => void): this {
    fn(this.value);
    return this;
  }
}

/**
 * Represents a failed result containing an error.
 */
export class Err<E> {
  readonly _tag = 'Err' as const;

  constructor(readonly error: E) {}

  isOk(): this is Ok<never> {
    return false;
  }

  isErr(): this is Err<E> {
    return true;
  }

  map<U>(_fn: (value: never) => U): Result<U, E> {
    return this as unknown as Err<E>;
  }

  flatMap<U, E2>(_fn: (value: never) => Result<U, E2>): Result<U, E | E2> {
    return this as unknown as Err<E>;
  }

  mapErr<F>(fn: (error: E) => F): Result<never, F> {
    return new Err(fn(this.error));
  }

  unwrap(): never {
    throw this.error;
  }

  unwrapOr<T>(defaultValue: T): T {
    return defaultValue;
  }

  unwrapOrElse<T>(fn: (error: E) => T): T {
    return fn(this.error);
  }

  match<U>(handlers: { ok: (value: never) => U; err: (error: E) => U }): U {
    return handlers.err(this.error);
  }

  tap(_fn: (value: never) => void): this {
    return this;
  }
}

// Factory functions
export const ok = <T>(value: T): Ok<T> => new Ok(value);
export const err = <E>(error: E): Err<E> => new Err(error);

/**
 * Combines an array of Results into a Result of array.
 * Returns the first Err encountered, or Ok with all values.
 */
export function combine<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];

  for (const result of results) {
    if (result.isErr()) {
      return result as unknown as Err<E>;
    }
    values.push(result.value);
  }

  return ok(values);
}

/**
 * Wraps a function that might throw into a Result.
 */
export function tryCatch<T, E = Error>(
  fn: () => T,
  onError: (error: unknown) => E = (e) => e as E
): Result<T, E> {
  try {
    return ok(fn());
  } catch (error) {
    return err(onError(error));
  }
}

/**
 * Wraps an async function that might throw into a Promise<Result>.
 */
export async function tryCatchAsync<T, E = Error>(
  fn: () => Promise<T>,
  onError: (error: unknown) => E = (e) => e as E
): Promise<Result<T, E>> {
  try {
    return ok(await fn());
  } catch (error) {
    return err(onError(error));
  }
}
