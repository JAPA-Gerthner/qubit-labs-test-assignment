# Error Handling & Boundaries

> **When to use**: Global error catching, error boundaries in UI, error reporting, recovery strategies, user-facing error display.

## Core Principle

Errors should be caught at well-defined boundaries, logged for debugging, and presented to users in a helpful way. Never let errors silently fail or crash the entire application.

---

## Error Hierarchy

```typescript
// domain/errors/BaseError.ts
export abstract class BaseError extends Error {
  abstract readonly code: string;
  abstract readonly isOperational: boolean;  // Expected vs unexpected
  readonly timestamp = new Date();
  readonly id = crypto.randomUUID();

  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      code: this.code,
      name: this.name,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      cause: this.cause?.message,
    };
  }
}

// Operational errors - expected, handled gracefully
export abstract class OperationalError extends BaseError {
  readonly isOperational = true;
  abstract readonly httpStatus: number;
  abstract readonly userMessage: string;  // Safe to show to users
}

// Programming errors - bugs, should crash/restart
export abstract class ProgrammerError extends BaseError {
  readonly isOperational = false;
}
```

### Concrete Error Types

```typescript
// domain/errors/OperationalErrors.ts
export class ValidationError extends OperationalError {
  readonly code = 'VALIDATION_ERROR';
  readonly httpStatus = 400;

  constructor(
    public readonly field: string,
    public readonly reason: string
  ) {
    super(`Validation failed for ${field}: ${reason}`);
  }

  get userMessage(): string {
    return `Invalid ${this.field}: ${this.reason}`;
  }
}

export class NotFoundError extends OperationalError {
  readonly code = 'NOT_FOUND';
  readonly httpStatus = 404;

  constructor(
    public readonly entityType: string,
    public readonly entityId: string
  ) {
    super(`${entityType} with id ${entityId} not found`);
  }

  get userMessage(): string {
    return `The requested ${this.entityType.toLowerCase()} could not be found`;
  }
}

export class UnauthorizedError extends OperationalError {
  readonly code = 'UNAUTHORIZED';
  readonly httpStatus = 401;
  readonly userMessage = 'Please log in to continue';

  constructor(message = 'Authentication required') {
    super(message);
  }
}

export class ForbiddenError extends OperationalError {
  readonly code = 'FORBIDDEN';
  readonly httpStatus = 403;
  readonly userMessage = 'You do not have permission to perform this action';

  constructor(message = 'Access denied') {
    super(message);
  }
}

export class ConflictError extends OperationalError {
  readonly code = 'CONFLICT';
  readonly httpStatus = 409;

  constructor(
    public readonly resource: string,
    message: string
  ) {
    super(message);
  }

  get userMessage(): string {
    return `This ${this.resource} already exists or conflicts with another`;
  }
}

export class RateLimitError extends OperationalError {
  readonly code = 'RATE_LIMIT_EXCEEDED';
  readonly httpStatus = 429;
  readonly userMessage = 'Too many requests. Please wait a moment and try again';

  constructor(public readonly retryAfterSeconds?: number) {
    super('Rate limit exceeded');
  }
}

export class NetworkError extends OperationalError {
  readonly code = 'NETWORK_ERROR';
  readonly httpStatus = 503;
  readonly userMessage = 'Unable to connect. Please check your internet connection';

  constructor(cause?: Error) {
    super('Network request failed', cause);
  }
}

export class TimeoutError extends OperationalError {
  readonly code = 'TIMEOUT';
  readonly httpStatus = 504;
  readonly userMessage = 'The request took too long. Please try again';

  constructor(public readonly timeoutMs: number) {
    super(`Operation timed out after ${timeoutMs}ms`);
  }
}
```

---

## Global Error Handler

Framework-agnostic error handling service:

```typescript
// infrastructure/errors/ErrorHandler.ts
export interface ErrorReporter {
  report(error: BaseError, context?: ErrorContext): void;
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  route?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorHandlerConfig {
  reporters: ErrorReporter[];
  onUnhandledError?: (error: Error) => void;
  shouldReportError?: (error: BaseError) => boolean;
}

export class GlobalErrorHandler {
  private context: ErrorContext = {};

  constructor(private config: ErrorHandlerConfig) {}

  setContext(context: Partial<ErrorContext>): void {
    this.context = { ...this.context, ...context };
  }

  clearContext(): void {
    this.context = {};
  }

  handle(error: unknown, additionalContext?: Partial<ErrorContext>): BaseError {
    const normalizedError = this.normalize(error);
    const fullContext = { ...this.context, ...additionalContext };

    // Log locally
    this.logError(normalizedError, fullContext);

    // Report to external services
    if (this.shouldReport(normalizedError)) {
      this.report(normalizedError, fullContext);
    }

    // Handle non-operational errors (bugs)
    if (!normalizedError.isOperational) {
      this.config.onUnhandledError?.(normalizedError);
    }

    return normalizedError;
  }

  private normalize(error: unknown): BaseError {
    if (error instanceof BaseError) {
      return error;
    }

    if (error instanceof Error) {
      return new UnknownError(error.message, error);
    }

    return new UnknownError(String(error));
  }

  private shouldReport(error: BaseError): boolean {
    if (this.config.shouldReportError) {
      return this.config.shouldReportError(error);
    }
    // Default: report all non-operational errors
    return !error.isOperational;
  }

  private logError(error: BaseError, context: ErrorContext): void {
    const logData = {
      ...error.toJSON(),
      context,
    };

    if (error.isOperational) {
      console.warn('[OperationalError]', logData);
    } else {
      console.error('[ProgrammerError]', logData);
    }
  }

  private report(error: BaseError, context: ErrorContext): void {
    this.config.reporters.forEach(reporter => {
      try {
        reporter.report(error, context);
      } catch (e) {
        console.error('Error reporter failed:', e);
      }
    });
  }
}

// Unknown/unexpected error wrapper
class UnknownError extends ProgrammerError {
  readonly code = 'UNKNOWN_ERROR';

  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}
```

---

## Error Reporters

```typescript
// infrastructure/errors/reporters/SentryReporter.ts
export class SentryReporter implements ErrorReporter {
  report(error: BaseError, context?: ErrorContext): void {
    Sentry.withScope(scope => {
      scope.setTag('error_code', error.code);
      scope.setTag('is_operational', String(error.isOperational));

      if (context?.userId) scope.setUser({ id: context.userId });
      if (context?.route) scope.setTag('route', context.route);
      if (context?.metadata) scope.setExtras(context.metadata);

      Sentry.captureException(error);
    });
  }
}

// infrastructure/errors/reporters/ConsoleReporter.ts
export class ConsoleReporter implements ErrorReporter {
  report(error: BaseError, context?: ErrorContext): void {
    console.group(`[${error.code}] ${error.message}`);
    console.error('Error:', error);
    console.info('Context:', context);
    console.groupEnd();
  }
}

// infrastructure/errors/reporters/HttpReporter.ts
export class HttpReporter implements ErrorReporter {
  constructor(private endpoint: string) {}

  report(error: BaseError, context?: ErrorContext): void {
    fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error.toJSON(),
        context,
      }),
    }).catch(() => {
      // Silently fail - don't cause more errors
    });
  }
}
```

---

## Error Boundary State (Framework-Agnostic)

```typescript
// shared/state/ErrorBoundaryState.ts
export interface ErrorBoundaryValue {
  error: BaseError | null;
  hasError: boolean;
  errorCount: number;
}

export class ErrorBoundaryState {
  private state: Observable<ErrorBoundaryValue>;
  private errorHandler: GlobalErrorHandler;

  constructor(errorHandler: GlobalErrorHandler) {
    this.errorHandler = errorHandler;
    this.state = new Observable({
      error: null,
      hasError: false,
      errorCount: 0,
    });
  }

  get value(): ErrorBoundaryValue {
    return this.state.get();
  }

  subscribe(listener: (value: ErrorBoundaryValue) => void): () => void {
    return this.state.subscribe(listener);
  }

  catch(error: unknown, context?: Partial<ErrorContext>): BaseError {
    const normalizedError = this.errorHandler.handle(error, context);

    this.state.update(s => ({
      error: normalizedError,
      hasError: true,
      errorCount: s.errorCount + 1,
    }));

    return normalizedError;
  }

  reset(): void {
    this.state.set({
      error: null,
      hasError: false,
      errorCount: this.value.errorCount,
    });
  }

  // For retry logic
  get canRetry(): boolean {
    const error = this.value.error;
    return error !== null && error.isOperational;
  }
}
```

---

## Framework Adapters

### React Error Boundary

```typescript
// adapters/react/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback: (error: BaseError, reset: () => void) => ReactNode;
  onError?: (error: BaseError) => void;
  errorHandler: GlobalErrorHandler;
}

interface State {
  error: BaseError | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error: error as BaseError };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const normalizedError = this.props.errorHandler.handle(error, {
      metadata: { componentStack: errorInfo.componentStack },
    });
    this.props.onError?.(normalizedError);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      return this.props.fallback(this.state.error, this.reset);
    }
    return this.props.children;
  }
}

// Hook for async error handling
export function useErrorHandler() {
  const errorHandler = useContext(ErrorHandlerContext);
  const [error, setError] = useState<BaseError | null>(null);

  const handleError = useCallback((e: unknown, context?: ErrorContext) => {
    const normalized = errorHandler.handle(e, context);
    setError(normalized);
    return normalized;
  }, [errorHandler]);

  const clearError = useCallback(() => setError(null), []);

  return { error, handleError, clearError };
}
```

### Vue Error Boundary

```typescript
// adapters/vue/ErrorBoundary.vue
<script setup lang="ts">
import { ref, onErrorCaptured, provide } from 'vue';

const props = defineProps<{
  errorHandler: GlobalErrorHandler;
}>();

const error = ref<BaseError | null>(null);

onErrorCaptured((err, instance, info) => {
  const normalized = props.errorHandler.handle(err, {
    metadata: { component: instance?.$options.name, info },
  });
  error.value = normalized;
  return false; // Prevent propagation
});

function reset() {
  error.value = null;
}

provide('errorBoundary', { error, reset });
</script>

<template>
  <slot v-if="!error" />
  <slot v-else name="fallback" :error="error" :reset="reset" />
</template>
```

```typescript
// adapters/vue/useErrorHandler.ts
export function useErrorHandler() {
  const errorHandler = inject<GlobalErrorHandler>('errorHandler')!;
  const error = ref<BaseError | null>(null);

  function handleError(e: unknown, context?: ErrorContext): BaseError {
    const normalized = errorHandler.handle(e, context);
    error.value = normalized;
    return normalized;
  }

  function clearError(): void {
    error.value = null;
  }

  return { error: readonly(error), handleError, clearError };
}
```

### Angular Error Handler

```typescript
// adapters/angular/global-error-handler.ts
import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { GlobalErrorHandler } from '@/infrastructure/errors/ErrorHandler';

@Injectable()
export class AngularErrorHandler implements ErrorHandler {
  constructor(private injector: Injector) {}

  handleError(error: unknown): void {
    const errorHandler = this.injector.get(GlobalErrorHandler);
    errorHandler.handle(error, {
      metadata: { source: 'angular-error-handler' },
    });
  }
}

// app.module.ts
@NgModule({
  providers: [
    { provide: ErrorHandler, useClass: AngularErrorHandler },
  ],
})
export class AppModule {}
```

---

## Window/Process Error Handlers

```typescript
// infrastructure/errors/setupGlobalHandlers.ts
export function setupGlobalErrorHandlers(errorHandler: GlobalErrorHandler): void {
  // Browser: Uncaught errors
  if (typeof window !== 'undefined') {
    window.onerror = (message, source, lineno, colno, error) => {
      errorHandler.handle(error ?? new Error(String(message)), {
        metadata: { source, lineno, colno },
      });
    };

    // Unhandled promise rejections
    window.onunhandledrejection = (event) => {
      errorHandler.handle(event.reason, {
        metadata: { type: 'unhandledrejection' },
      });
    };
  }

  // Node.js
  if (typeof process !== 'undefined') {
    process.on('uncaughtException', (error) => {
      errorHandler.handle(error, {
        metadata: { type: 'uncaughtException' },
      });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      errorHandler.handle(reason, {
        metadata: { type: 'unhandledRejection' },
      });
    });
  }
}
```

---

## Error Recovery Strategies

```typescript
// infrastructure/errors/recovery.ts
export interface RecoveryStrategy {
  canHandle(error: BaseError): boolean;
  recover(error: BaseError): Promise<void> | void;
}

export class ErrorRecoveryManager {
  private strategies: RecoveryStrategy[] = [];

  register(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy);
  }

  async attemptRecovery(error: BaseError): Promise<boolean> {
    for (const strategy of this.strategies) {
      if (strategy.canHandle(error)) {
        await strategy.recover(error);
        return true;
      }
    }
    return false;
  }
}

// Example strategies
export class AuthRecoveryStrategy implements RecoveryStrategy {
  constructor(private authService: AuthService, private router: Router) {}

  canHandle(error: BaseError): boolean {
    return error instanceof UnauthorizedError;
  }

  recover(): void {
    this.authService.logout();
    this.router.navigate('/login');
  }
}

export class NetworkRecoveryStrategy implements RecoveryStrategy {
  canHandle(error: BaseError): boolean {
    return error instanceof NetworkError;
  }

  recover(): void {
    // Show offline indicator, queue actions for retry
  }
}

export class RateLimitRecoveryStrategy implements RecoveryStrategy {
  canHandle(error: BaseError): boolean {
    return error instanceof RateLimitError;
  }

  async recover(error: BaseError): Promise<void> {
    const rateLimitError = error as RateLimitError;
    if (rateLimitError.retryAfterSeconds) {
      await sleep(rateLimitError.retryAfterSeconds * 1000);
    }
  }
}
```

---

## User-Facing Error Display

```typescript
// shared/errors/ErrorDisplay.ts
export interface ErrorDisplayConfig {
  title: string;
  message: string;
  action?: {
    label: string;
    handler: () => void;
  };
  severity: 'info' | 'warning' | 'error';
}

export function getErrorDisplay(error: BaseError): ErrorDisplayConfig {
  // Use user-friendly message for operational errors
  if (error.isOperational && error instanceof OperationalError) {
    return {
      title: getErrorTitle(error),
      message: error.userMessage,
      action: getErrorAction(error),
      severity: 'warning',
    };
  }

  // Generic message for unexpected errors
  return {
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again later.',
    action: {
      label: 'Refresh',
      handler: () => window.location.reload(),
    },
    severity: 'error',
  };
}

function getErrorTitle(error: OperationalError): string {
  switch (error.code) {
    case 'VALIDATION_ERROR': return 'Invalid Input';
    case 'NOT_FOUND': return 'Not Found';
    case 'UNAUTHORIZED': return 'Login Required';
    case 'FORBIDDEN': return 'Access Denied';
    case 'NETWORK_ERROR': return 'Connection Problem';
    case 'TIMEOUT': return 'Request Timeout';
    case 'RATE_LIMIT_EXCEEDED': return 'Please Slow Down';
    default: return 'Error';
  }
}

function getErrorAction(error: OperationalError): ErrorDisplayConfig['action'] | undefined {
  switch (error.code) {
    case 'UNAUTHORIZED':
      return { label: 'Log In', handler: () => router.navigate('/login') };
    case 'NETWORK_ERROR':
      return { label: 'Retry', handler: () => window.location.reload() };
    default:
      return undefined;
  }
}
```

---

## Setup Example

```typescript
// main.ts
const errorHandler = new GlobalErrorHandler({
  reporters: [
    new ConsoleReporter(),
    new SentryReporter(),
  ],
  onUnhandledError: (error) => {
    // Critical error - show full-page error screen
    showCriticalErrorScreen(error);
  },
  shouldReportError: (error) => {
    // Don't report validation errors to Sentry
    return error.code !== 'VALIDATION_ERROR';
  },
});

const recoveryManager = new ErrorRecoveryManager();
recoveryManager.register(new AuthRecoveryStrategy(authService, router));
recoveryManager.register(new NetworkRecoveryStrategy());

setupGlobalErrorHandlers(errorHandler);

// Provide to app
app.provide('errorHandler', errorHandler);
app.provide('recoveryManager', recoveryManager);
```

---

## Summary

| Layer | Responsibility |
|-------|----------------|
| **Error Types** | Structured hierarchy with codes and user messages |
| **GlobalErrorHandler** | Normalize, log, report errors |
| **ErrorReporters** | Send to Sentry, console, HTTP endpoint |
| **ErrorBoundary** | Catch errors in component tree |
| **RecoveryStrategies** | Automatic recovery for known errors |
| **ErrorDisplay** | User-friendly messages and actions |
