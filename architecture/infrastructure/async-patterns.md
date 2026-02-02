# Async Patterns & Resilience

> **When to use**: Handling failures gracefully, implementing retries, circuit breakers, sagas for distributed transactions, optimistic updates.

## Core Principle

Assume all external calls can fail. Design for resilience, not just the happy path.

---

## Retry Pattern

### Exponential Backoff with Jitter

```typescript
// infrastructure/resilience/retry.ts
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  shouldRetry?: (error: unknown) => boolean;
}

const defaultConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  shouldRetry: () => true,
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs, shouldRetry } = {
    ...defaultConfig,
    ...config,
  };

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !shouldRetry!(error)) {
        throw error;
      }

      const delay = calculateBackoff(attempt, baseDelayMs, maxDelayMs);
      await sleep(delay);
    }
  }

  throw lastError;
}

function calculateBackoff(attempt: number, baseMs: number, maxMs: number): number {
  const exponentialDelay = baseMs * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
  return Math.min(exponentialDelay + jitter, maxMs);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Usage

```typescript
const user = await withRetry(
  () => apiClient.getUser(userId),
  {
    maxAttempts: 3,
    shouldRetry: (error) => error instanceof NetworkError,
  }
);
```

---

## Circuit Breaker

Prevent cascading failures:

```typescript
// infrastructure/resilience/CircuitBreaker.ts
type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failureThreshold: number;    // Failures before opening
  resetTimeoutMs: number;      // Time before trying again
  halfOpenMaxCalls: number;    // Test calls in half-open
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailureTime?: number;
  private halfOpenCalls = 0;

  constructor(private readonly config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state = 'half-open';
        this.halfOpenCalls = 0;
      } else {
        throw new CircuitOpenError();
      }
    }

    if (this.state === 'half-open' && this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
      throw new CircuitOpenError();
    }

    try {
      if (this.state === 'half-open') {
        this.halfOpenCalls++;
      }

      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.config.halfOpenMaxCalls) {
        this.reset();
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - (this.lastFailureTime ?? 0) >= this.config.resetTimeoutMs;
  }

  private reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.halfOpenCalls = 0;
  }

  get currentState(): CircuitState {
    return this.state;
  }
}
```

---

## Saga Pattern

For distributed transactions with compensation:

```typescript
// application/sagas/Saga.ts
export interface SagaStep<T> {
  name: string;
  execute: (context: T) => Promise<T>;
  compensate: (context: T) => Promise<void>;
}

export class Saga<T> {
  private steps: SagaStep<T>[] = [];
  private completedSteps: SagaStep<T>[] = [];

  addStep(step: SagaStep<T>): this {
    this.steps.push(step);
    return this;
  }

  async execute(initialContext: T): Promise<Result<T, SagaError>> {
    let context = initialContext;

    for (const step of this.steps) {
      try {
        context = await step.execute(context);
        this.completedSteps.push(step);
      } catch (error) {
        await this.compensate(context);
        return err(new SagaError(step.name, error));
      }
    }

    return ok(context);
  }

  private async compensate(context: T): Promise<void> {
    // Compensate in reverse order
    for (const step of this.completedSteps.reverse()) {
      try {
        await step.compensate(context);
      } catch (error) {
        // Log but continue compensating other steps
        console.error(`Compensation failed for ${step.name}`, error);
      }
    }
  }
}
```

### Usage: Order Processing Saga

```typescript
interface OrderContext {
  order: Order;
  paymentId?: string;
  inventoryReserved?: boolean;
  shippingLabel?: string;
}

const orderSaga = new Saga<OrderContext>()
  .addStep({
    name: 'reserveInventory',
    execute: async (ctx) => {
      await inventoryService.reserve(ctx.order.items);
      return { ...ctx, inventoryReserved: true };
    },
    compensate: async (ctx) => {
      if (ctx.inventoryReserved) {
        await inventoryService.release(ctx.order.items);
      }
    },
  })
  .addStep({
    name: 'processPayment',
    execute: async (ctx) => {
      const paymentId = await paymentService.charge(ctx.order.total);
      return { ...ctx, paymentId };
    },
    compensate: async (ctx) => {
      if (ctx.paymentId) {
        await paymentService.refund(ctx.paymentId);
      }
    },
  })
  .addStep({
    name: 'createShipping',
    execute: async (ctx) => {
      const label = await shippingService.createLabel(ctx.order);
      return { ...ctx, shippingLabel: label };
    },
    compensate: async (ctx) => {
      if (ctx.shippingLabel) {
        await shippingService.cancelLabel(ctx.shippingLabel);
      }
    },
  });

// Execute
const result = await orderSaga.execute({ order });
```

---

## Optimistic Updates (Frontend)

Update UI immediately, rollback on failure:

```typescript
// composables/useOptimisticUpdate.ts
export function useOptimisticUpdate<T>(
  currentValue: Ref<T>,
  updateFn: (newValue: T) => Promise<void>
) {
  const isUpdating = ref(false);
  const error = ref<Error | null>(null);

  async function update(newValue: T): Promise<boolean> {
    const previousValue = currentValue.value;
    error.value = null;
    isUpdating.value = true;

    // Optimistic update
    currentValue.value = newValue;

    try {
      await updateFn(newValue);
      return true;
    } catch (e) {
      // Rollback on failure
      currentValue.value = previousValue;
      error.value = e as Error;
      return false;
    } finally {
      isUpdating.value = false;
    }
  }

  return { update, isUpdating, error };
}

// Usage
const { update, isUpdating, error } = useOptimisticUpdate(
  user,
  async (newUser) => await userApi.update(newUser)
);

await update({ ...user.value, name: 'New Name' });
```

---

## Idempotency

Ensure operations can be safely retried:

```typescript
// infrastructure/idempotency/IdempotencyStore.ts
export interface IdempotencyStore {
  get(key: string): Promise<IdempotencyRecord | null>;
  set(key: string, response: unknown, ttlMs: number): Promise<void>;
}

export interface IdempotencyRecord {
  key: string;
  response: unknown;
  createdAt: Date;
}

// Usage in handler
async function handlePayment(
  idempotencyKey: string,
  request: PaymentRequest
): Promise<PaymentResult> {
  // Check if already processed
  const existing = await idempotencyStore.get(idempotencyKey);
  if (existing) {
    return existing.response as PaymentResult;
  }

  // Process payment
  const result = await paymentService.process(request);

  // Store for future retries
  await idempotencyStore.set(idempotencyKey, result, 24 * 60 * 60 * 1000);

  return result;
}
```

---

## Timeout Pattern

```typescript
// infrastructure/resilience/timeout.ts
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  message = 'Operation timed out'
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new TimeoutError(message)), timeoutMs);
  });

  return Promise.race([operation, timeout]);
}

// Usage
const user = await withTimeout(
  apiClient.getUser(userId),
  5000,
  'User fetch timed out'
);
```

---

## Combining Patterns

```typescript
// Retry with circuit breaker and timeout
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  halfOpenMaxCalls: 3,
});

async function fetchWithResilience<T>(url: string): Promise<T> {
  return circuitBreaker.execute(() =>
    withRetry(
      () => withTimeout(fetch(url).then(r => r.json()), 5000),
      { maxAttempts: 3 }
    )
  );
}
```
