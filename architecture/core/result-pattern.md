# Result Pattern for Error Handling

> **When to use**: Implementing operations that can fail, replacing try/catch with explicit error handling, composing fallible operations.

## Core Principle

Never throw exceptions for expected failures. Use Result types for explicit error handling.

---

## Result Type Implementation

```typescript
// shared/Result.ts
export type Result<T, E = Error> = Ok<T> | Err<E>;

export class Ok<T> {
  readonly _tag = 'Ok';
  constructor(readonly value: T) {}

  isOk(): this is Ok<T> { return true; }
  isErr(): this is Err<never> { return false; }

  map<U>(fn: (value: T) => U): Result<U, never> {
    return new Ok(fn(this.value));
  }

  flatMap<U, E>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this.value);
  }

  unwrapOr(_defaultValue: T): T {
    return this.value;
  }

  match<U>(handlers: { ok: (value: T) => U; err: (error: never) => U }): U {
    return handlers.ok(this.value);
  }
}

export class Err<E> {
  readonly _tag = 'Err';
  constructor(readonly error: E) {}

  isOk(): this is Ok<never> { return false; }
  isErr(): this is Err<E> { return true; }

  map<U>(_fn: (value: never) => U): Result<U, E> {
    return this as unknown as Err<E>;
  }

  flatMap<U, E2>(_fn: (value: never) => Result<U, E2>): Result<U, E | E2> {
    return this as unknown as Err<E>;
  }

  unwrapOr<T>(defaultValue: T): T {
    return defaultValue;
  }

  match<U>(handlers: { ok: (value: never) => U; err: (error: E) => U }): U {
    return handlers.err(this.error);
  }
}

// Factory functions
export const ok = <T>(value: T): Ok<T> => new Ok(value);
export const err = <E>(error: E): Err<E> => new Err(error);
```

---

## Basic Usage

```typescript
function divide(a: number, b: number): Result<number, DivisionByZeroError> {
  if (b === 0) return err(new DivisionByZeroError());
  return ok(a / b);
}

const result = divide(10, 2);

if (result.isOk()) {
  console.log(result.value); // 5
} else {
  console.error(result.error);
}
```

---

## Composing Results

### Chaining with map and flatMap

```typescript
const result = divide(10, 2)
  .map(n => n * 2)           // Ok(10)
  .flatMap(n => divide(n, 2)); // Ok(5)

result.match({
  ok: value => console.log(`Result: ${value}`),
  err: error => console.error(`Error: ${error.message}`),
});
```

### Early Return Pattern

```typescript
function processOrder(orderId: string): Result<Receipt, OrderError> {
  const orderResult = findOrder(orderId);
  if (orderResult.isErr()) return orderResult;

  const paymentResult = processPayment(orderResult.value);
  if (paymentResult.isErr()) return paymentResult;

  const receiptResult = generateReceipt(paymentResult.value);
  return receiptResult;
}
```

---

## Domain-Specific Errors

```typescript
// domain/errors/DomainErrors.ts
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
}

export class EntityNotFoundError extends DomainError {
  readonly code = 'ENTITY_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(
    public readonly entityType: string,
    public readonly entityId: string
  ) {
    super(`${entityType} with id ${entityId} not found`);
  }
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly httpStatus = 400;

  constructor(
    public readonly field: string,
    public readonly reason: string
  ) {
    super(`Validation failed for ${field}: ${reason}`);
  }
}

export class BusinessRuleViolationError extends DomainError {
  readonly code = 'BUSINESS_RULE_VIOLATION';
  readonly httpStatus = 422;

  constructor(public readonly rule: string) {
    super(`Business rule violated: ${rule}`);
  }
}
```

---

## Async Result (Extension)

For Promise-based operations:

```typescript
class ResultAsync<T, E> {
  constructor(private readonly promise: Promise<Result<T, E>>) {}

  static fromPromise<T, E>(
    promise: Promise<T>,
    onError: (e: unknown) => E
  ): ResultAsync<T, E> {
    return new ResultAsync(
      promise
        .then(value => ok(value))
        .catch(e => err(onError(e)))
    );
  }

  async map<U>(fn: (t: T) => U): Promise<Result<U, E>> {
    const result = await this.promise;
    return result.map(fn);
  }

  async flatMap<U>(fn: (t: T) => ResultAsync<U, E>): Promise<Result<U, E>> {
    const result = await this.promise;
    if (result.isErr()) return result;
    return fn(result.value).promise;
  }

  async unwrap(): Promise<Result<T, E>> {
    return this.promise;
  }
}
```

---

## When to Use Result vs Exceptions

| Scenario | Use Result | Use Exception |
|----------|------------|---------------|
| User not found | ✓ | |
| Invalid input | ✓ | |
| Business rule violation | ✓ | |
| Network timeout | ✓ | |
| Programming error (bug) | | ✓ |
| Out of memory | | ✓ |
| Assertion failure | | ✓ |

**Rule of thumb**: If the caller should handle it, use Result. If it's a bug, throw.
