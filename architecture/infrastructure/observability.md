# Observability

> **When to use**: Implementing logging, tracing, metrics collection, debugging production issues, monitoring application health.

## Three Pillars of Observability

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    Logs     │    │   Traces    │    │   Metrics   │
│             │    │             │    │             │
│  What       │    │  Request    │    │  Aggregate  │
│  happened   │    │  flow       │    │  trends     │
└─────────────┘    └─────────────┘    └─────────────┘
```

---

## Structured Logging

### Logger Interface (Port)

```typescript
// application/ports/output/Logger.ts
export interface LogContext {
  [key: string]: string | number | boolean | undefined;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;

  child(context: LogContext): Logger;
  withCorrelationId(id: string): Logger;
}
```

### Implementation

```typescript
// infrastructure/logging/ConsoleLogger.ts
export class ConsoleLogger implements Logger {
  constructor(private readonly baseContext: LogContext = {}) {}

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log('error', message, {
      ...context,
      errorName: error?.name,
      errorMessage: error?.message,
      stack: error?.stack,
    });
  }

  child(context: LogContext): Logger {
    return new ConsoleLogger({ ...this.baseContext, ...context });
  }

  withCorrelationId(id: string): Logger {
    return this.child({ correlationId: id });
  }

  private log(level: string, message: string, context?: LogContext): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.baseContext,
      ...context,
    };

    console[level as 'log'](JSON.stringify(entry));
  }
}
```

### Usage Patterns

```typescript
// Create scoped logger for a request
const requestLogger = logger
  .withCorrelationId(request.id)
  .child({ userId: user.id, action: 'createOrder' });

requestLogger.info('Processing order', { itemCount: items.length });

try {
  const result = await processOrder(items);
  requestLogger.info('Order completed', { orderId: result.id });
} catch (error) {
  requestLogger.error('Order failed', error, { step: 'payment' });
}
```

---

## Tracing

### Span Context

```typescript
// application/ports/output/Tracer.ts
export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

export interface Span {
  readonly context: SpanContext;
  setTag(key: string, value: string | number | boolean): void;
  log(data: Record<string, unknown>): void;
  finish(): void;
}

export interface Tracer {
  startSpan(operationName: string, parent?: SpanContext): Span;
  inject(context: SpanContext, carrier: Record<string, string>): void;
  extract(carrier: Record<string, string>): SpanContext | null;
}
```

### Traced Operations

```typescript
// Decorator for tracing
function traced(operationName: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const span = tracer.startSpan(operationName);
      try {
        const result = await originalMethod.apply(this, args);
        span.setTag('success', true);
        return result;
      } catch (error) {
        span.setTag('error', true);
        span.log({ error: error.message });
        throw error;
      } finally {
        span.finish();
      }
    };

    return descriptor;
  };
}

// Usage
class OrderService {
  @traced('OrderService.createOrder')
  async createOrder(data: CreateOrderData): Promise<Order> {
    // Implementation
  }
}
```

---

## Metrics

### Metric Types

```typescript
// application/ports/output/Metrics.ts
export interface Counter {
  inc(labels?: Record<string, string>): void;
  inc(value: number, labels?: Record<string, string>): void;
}

export interface Gauge {
  set(value: number, labels?: Record<string, string>): void;
  inc(labels?: Record<string, string>): void;
  dec(labels?: Record<string, string>): void;
}

export interface Histogram {
  observe(value: number, labels?: Record<string, string>): void;
  startTimer(labels?: Record<string, string>): () => void;
}

export interface MetricsRegistry {
  counter(name: string, help: string, labelNames?: string[]): Counter;
  gauge(name: string, help: string, labelNames?: string[]): Gauge;
  histogram(name: string, help: string, buckets?: number[], labelNames?: string[]): Histogram;
}
```

### Common Metrics

```typescript
// infrastructure/metrics/AppMetrics.ts
export function createAppMetrics(registry: MetricsRegistry) {
  return {
    // Request metrics
    httpRequestsTotal: registry.counter(
      'http_requests_total',
      'Total HTTP requests',
      ['method', 'path', 'status']
    ),

    httpRequestDuration: registry.histogram(
      'http_request_duration_seconds',
      'HTTP request duration',
      [0.01, 0.05, 0.1, 0.5, 1, 5],
      ['method', 'path']
    ),

    // Business metrics
    ordersCreated: registry.counter(
      'orders_created_total',
      'Total orders created',
      ['status']
    ),

    activeUsers: registry.gauge(
      'active_users',
      'Currently active users'
    ),

    // System metrics
    eventQueueSize: registry.gauge(
      'event_queue_size',
      'Number of events in queue',
      ['eventType']
    ),
  };
}

// Usage
const timer = metrics.httpRequestDuration.startTimer({ method: 'POST', path: '/orders' });
try {
  await handleRequest();
  metrics.httpRequestsTotal.inc({ method: 'POST', path: '/orders', status: '200' });
} finally {
  timer();
}
```

---

## Health Checks

```typescript
// application/ports/output/HealthCheck.ts
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, ComponentHealth>;
  timestamp: string;
}

export interface ComponentHealth {
  status: 'healthy' | 'unhealthy';
  message?: string;
  latencyMs?: number;
}

export interface HealthChecker {
  check(): Promise<HealthStatus>;
  registerCheck(name: string, check: () => Promise<ComponentHealth>): void;
}
```

### Implementation

```typescript
// infrastructure/health/HealthService.ts
export class HealthService implements HealthChecker {
  private checks = new Map<string, () => Promise<ComponentHealth>>();

  registerCheck(name: string, check: () => Promise<ComponentHealth>): void {
    this.checks.set(name, check);
  }

  async check(): Promise<HealthStatus> {
    const results: Record<string, ComponentHealth> = {};

    await Promise.all(
      Array.from(this.checks.entries()).map(async ([name, check]) => {
        const start = Date.now();
        try {
          results[name] = await check();
          results[name].latencyMs = Date.now() - start;
        } catch (error) {
          results[name] = {
            status: 'unhealthy',
            message: error.message,
            latencyMs: Date.now() - start,
          };
        }
      })
    );

    const hasUnhealthy = Object.values(results).some(r => r.status === 'unhealthy');

    return {
      status: hasUnhealthy ? 'unhealthy' : 'healthy',
      checks: results,
      timestamp: new Date().toISOString(),
    };
  }
}

// Register checks
healthService.registerCheck('database', async () => {
  await db.query('SELECT 1');
  return { status: 'healthy' };
});

healthService.registerCheck('redis', async () => {
  await redis.ping();
  return { status: 'healthy' };
});
```

---

## Correlation IDs

Track requests across services:

```typescript
// middleware/correlationId.ts
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const correlationId = req.headers['x-correlation-id'] as string
    ?? crypto.randomUUID();

  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  // Set on async context for logging
  asyncLocalStorage.run({ correlationId }, () => next());
}

// Access anywhere in the request
export function getCorrelationId(): string | undefined {
  return asyncLocalStorage.getStore()?.correlationId;
}
```

---

## Best Practices

| Category | Practice |
|----------|----------|
| **Logging** | Always use structured JSON logs |
| **Logging** | Include correlation IDs in every log |
| **Logging** | Log at boundaries (entry/exit of services) |
| **Tracing** | Trace across service boundaries |
| **Tracing** | Include user context in spans |
| **Metrics** | Use histograms for latencies, not averages |
| **Metrics** | Add business metrics, not just technical |
| **Health** | Check dependencies, not just app liveness |
