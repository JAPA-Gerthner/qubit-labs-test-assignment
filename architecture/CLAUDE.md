# Architecture Instructions

> **Usage**: These are mandatory rules for all code generation. For detailed patterns, load files from `architecture/` as needed.

---

## Layer Structure

```
presentation/  → UI components, framework code (Vue/React/Angular)
application/   → Use cases, ports (interfaces), orchestration
domain/        → Entities, value objects, domain services (PURE TypeScript)
infrastructure/→ Adapters, repositories, external services
shared/        → Result type, utilities, branded types
```

**Rules:**
- Domain layer has ZERO framework imports
- Dependencies point inward: Presentation → Application → Domain
- Domain knows nothing about outer layers

---

## Type Safety

**NEVER use:**
- `any` type
- `@ts-ignore`
- `@ts-nocheck`
- Non-null assertion without check (`user!.name`)
- Type assertion to silence errors (`as User`)

**ALWAYS use:**
- Branded types for IDs
- Explicit return types on public functions
- `readonly` for immutable properties
- Discriminated unions for state machines
- `as const` for literal arrays

```typescript
// Branded type template
declare const brand: unique symbol;
type Brand<T, B extends string> = T & { [brand]: B };

type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;

function createUserId(id: string): UserId {
  if (!isValidUUID(id)) throw new InvalidIdError(id);
  return id as UserId;
}
```

---

## Error Handling

**NEVER throw exceptions for expected failures.**

Use `Result<T, E>` for all fallible operations:

```typescript
type Result<T, E> = Ok<T> | Err<E>;

// Return Result, don't throw
function divide(a: number, b: number): Result<number, DivisionError> {
  if (b === 0) return err(new DivisionError());
  return ok(a / b);
}
```

**Error hierarchy:**

```typescript
// Base error with required fields
abstract class BaseError extends Error {
  abstract readonly code: string;
  abstract readonly isOperational: boolean;
  readonly timestamp = new Date();
  readonly id = crypto.randomUUID();
}

// Expected errors (user input, not found, auth) — handle gracefully
abstract class OperationalError extends BaseError {
  readonly isOperational = true;
  abstract readonly httpStatus: number;
  abstract readonly userMessage: string;  // Safe to display
}

// Bugs — log, alert, crash if needed
abstract class ProgrammerError extends BaseError {
  readonly isOperational = false;
}
```

**Common error types:**

| Error | Code | HTTP | When |
|-------|------|------|------|
| `ValidationError` | VALIDATION_ERROR | 400 | Invalid input |
| `NotFoundError` | NOT_FOUND | 404 | Entity missing |
| `UnauthorizedError` | UNAUTHORIZED | 401 | Not logged in |
| `ForbiddenError` | FORBIDDEN | 403 | No permission |
| `ConflictError` | CONFLICT | 409 | Duplicate/conflict |
| `NetworkError` | NETWORK_ERROR | 503 | Connection failed |
| `TimeoutError` | TIMEOUT | 504 | Request too slow |

---

## Value Objects

Immutable objects defined by their attributes. Use for: Money, Email, DateRange, Address, Coordinates.

```typescript
class Email {
  private constructor(private readonly value: string) {
    Object.freeze(this);
  }

  static create(email: string): Result<Email, ValidationError> {
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalized)) {
      return err(new ValidationError('email', 'invalid format'));
    }
    return ok(new Email(normalized));
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
```

**Rules:**
- Private constructor + static factory
- Validate in factory, return Result
- `Object.freeze(this)` in constructor
- Implement `equals()` method
- Never mutate — return new instances

---

## Entities & Aggregates

Entities have identity. Aggregates collect domain events.

```typescript
abstract class AggregateRoot {
  private _domainEvents: DomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  clearDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }
}

class User extends AggregateRoot {
  private constructor(
    public readonly id: UserId,
    private _email: Email,
    private _name: string
  ) {
    super();
  }

  static create(email: Email, name: string): Result<User, ValidationError> {
    if (name.length < 2) {
      return err(new ValidationError('name', 'too short'));
    }
    const user = new User(createUserId(crypto.randomUUID()), email, name);
    user.addDomainEvent(new UserCreated(user.id, email, name));
    return ok(user);
  }
}
```

**Rules:**
- Extend `AggregateRoot`
- Emit events in domain methods
- Publish events AFTER successful persistence
- Events are immutable facts (past tense: `UserCreated`)

---

## Dependency Injection

Define ports (interfaces) in application layer, implement adapters in infrastructure.

```typescript
// application/ports/output/UserRepository.ts (PORT)
interface UserRepository {
  findById(id: UserId): Promise<Result<User, NotFoundError>>;
  save(user: User): Promise<Result<void, PersistenceError>>;
}

// infrastructure/adapters/InMemoryUserRepository.ts (ADAPTER)
class InMemoryUserRepository implements UserRepository {
  private users = new Map<string, User>();

  async findById(id: UserId): Promise<Result<User, NotFoundError>> {
    const user = this.users.get(id);
    return user ? ok(user) : err(new NotFoundError('User', id));
  }

  async save(user: User): Promise<Result<void, PersistenceError>> {
    this.users.set(user.id, user);
    return ok(undefined);
  }
}
```

**Rules:**
- Constructor injection, NEVER service locator
- Depend on abstractions (interfaces), not implementations
- Register in DI container at composition root

---

## Use Cases (Commands/Queries)

```typescript
// Command — changes state, returns Result
class CreateUserCommand {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(data: CreateUserData): Promise<Result<UserId, DomainError>> {
    const userResult = User.create(Email.create(data.email).value, data.name);
    if (userResult.isErr()) return userResult;

    const user = userResult.value;
    const saveResult = await this.userRepository.save(user);
    if (saveResult.isErr()) return saveResult;

    await this.eventBus.publishAll(user.clearDomainEvents());
    return ok(user.id);
  }
}

// Query — read only, returns DTO
class GetUserQuery {
  constructor(private readonly readStore: UserReadStore) {}

  async execute(query: { userId: UserId }): Promise<Result<UserDTO, NotFoundError>> {
    return this.readStore.findById(query.userId);
  }
}
```

---

## API Layer

Transform between DTOs and domain objects. Never expose domain objects directly.

```typescript
// DTO
interface CreateUserRequestDTO {
  email: string;
  name: string;
}

interface UserResponseDTO {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

// Mapper
class UserMapper {
  static toDomain(dto: CreateUserRequestDTO): Result<CreateUserData, ValidationError> {
    const emailResult = Email.create(dto.email);
    if (emailResult.isErr()) return emailResult;
    return ok({ email: emailResult.value, name: dto.name });
  }

  static toDTO(user: User): UserResponseDTO {
    return {
      id: user.id,
      email: user.email.toString(),
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
```

---

## Async Resilience

**Retry with backoff:**
```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  config: { maxAttempts: number; baseDelayMs: number }
): Promise<T> {
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === config.maxAttempts) throw error;
      const delay = config.baseDelayMs * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 0.3 * delay;
      await sleep(delay + jitter);
    }
  }
  throw new Error('Unreachable');
}
```

**Timeout wrapper:**
```typescript
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new TimeoutError(ms)), ms)
  );
  return Promise.race([promise, timeout]);
}
```

**Always combine for external calls:**
```typescript
const result = await withRetry(
  () => withTimeout(fetch(url), 5000),
  { maxAttempts: 3, baseDelayMs: 1000 }
);
```

---

## Configuration

Validate with Zod at startup, fail fast:

```typescript
const ConfigSchema = z.object({
  env: z.enum(['development', 'staging', 'production']),
  api: z.object({
    baseUrl: z.string().url(),
    timeout: z.number().min(1000).default(10000),
  }),
  features: z.object({
    enableAnalytics: z.boolean().default(false),
  }),
});

type AppConfig = z.infer<typeof ConfigSchema>;

function loadConfig(): AppConfig {
  const result = ConfigSchema.safeParse(rawConfig);
  if (!result.success) {
    console.error(result.error.format());
    throw new ConfigurationError(result.error);
  }
  return Object.freeze(result.data);
}
```

---

## Testing

**Unit tests** — domain logic, value objects:
```typescript
describe('Money', () => {
  it('should reject negative amounts', () => {
    const result = Money.create(-50, Currency.USD);
    expect(result.isErr()).toBe(true);
    expect(result.error.field).toBe('amount');
  });
});
```

**Integration tests** — use cases with mocks:
```typescript
describe('CreateUserCommand', () => {
  let useCase: CreateUserCommand;
  let userRepository: MockUserRepository;
  let eventBus: MockEventBus;

  beforeEach(() => {
    userRepository = new MockUserRepository();
    eventBus = new MockEventBus();
    useCase = new CreateUserCommand(userRepository, eventBus);
  });

  it('should create user and publish event', async () => {
    const result = await useCase.execute({ email: 'test@example.com', name: 'John' });
    expect(result.isOk()).toBe(true);
    expect(eventBus.publishedEvents).toHaveLength(1);
  });
});
```

**Test naming:** `should [behavior] when [condition]`

---

## File Naming

| Type | Pattern | Example |
|------|---------|---------|
| Entity | PascalCase | `User.ts` |
| Value Object | PascalCase | `Money.ts` |
| Use Case | PascalCase + Command/Query | `CreateUserCommand.ts` |
| Port | PascalCase + purpose | `UserRepository.ts` |
| Adapter | PascalCase + implementation | `SqlUserRepository.ts` |
| Test | *.spec.ts | `User.spec.ts` |
| DTO | PascalCase + DTO | `UserDTO.ts` |

---

## Quick Reference: Load When Needed

| Task | Load File |
|------|-----------|
| Value objects, entities | `core/value-objects.md` |
| Result pattern details | `core/result-pattern.md` |
| Full type safety patterns | `core/type-safety.md` |
| DI container setup | `patterns/dependency-injection.md` |
| Domain events, EventBus | `patterns/domain-events.md` |
| CQRS, projections | `patterns/cqrs.md` |
| API DTOs, mappers | `infrastructure/api-layer.md` |
| Error boundaries, recovery | `infrastructure/error-handling.md` |
| Logging, tracing, metrics | `infrastructure/observability.md` |
| Retry, circuit breaker, saga | `infrastructure/async-patterns.md` |
| Feature flags, Zod config | `infrastructure/configuration.md` |
| Vue composables | `frontend/composables.md` |
| Unit test patterns | `testing/unit-testing.md` |
| Integration test patterns | `testing/integration-testing.md` |
| Property-based testing | `testing/property-testing.md` |
| Folder structure | `project-structure.md` |

---

## Anti-Patterns — NEVER Do

```typescript
// BAD: any type
function process(data: any) { }

// BAD: throwing for expected failures
function getUser(id: string): User {
  const user = db.find(id);
  if (!user) throw new Error('Not found');  // NO!
  return user;
}

// BAD: service locator
class OrderService {
  process() {
    const repo = container.resolve('userRepository');  // NO!
  }
}

// BAD: domain with framework imports
import { Injectable } from '@angular/core';  // NO! Not in domain layer

// BAD: mutable value object
class Money {
  amount: number;  // NO! Should be readonly + frozen
  add(other: Money) {
    this.amount += other.amount;  // NO! Return new instance
  }
}

// BAD: exposing domain objects as API response
app.get('/users/:id', (req, res) => {
  const user = await userRepo.findById(req.params.id);
  res.json(user);  // NO! Use DTO mapper
});
```
