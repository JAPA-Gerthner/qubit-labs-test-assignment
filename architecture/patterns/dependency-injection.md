# Dependency Injection

> **When to use**: Wiring up dependencies, implementing ports/adapters pattern, making code testable with swappable implementations.

## Core Concept

Invert dependencies to make code testable and flexible. Depend on abstractions (interfaces), not concretions.

---

## Port/Adapter Pattern (Hexagonal Architecture)

### Define Ports (Interfaces)

```typescript
// application/ports/output/UserRepository.ts (Port)
export interface UserRepository {
  findById(id: UserId): Promise<Result<User, EntityNotFoundError>>;
  findByEmail(email: Email): Promise<User | null>;
  save(user: User): Promise<Result<void, PersistenceError>>;
  delete(id: UserId): Promise<Result<void, EntityNotFoundError>>;
}

// application/ports/output/EventPublisher.ts
export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
}

// application/ports/output/Timer.ts
export interface Timer {
  setTimeout(callback: () => void, ms: number): TimerId;
  clearTimeout(id: TimerId): void;
  setInterval(callback: () => void, ms: number): TimerId;
  clearInterval(id: TimerId): void;
}
```

### Implement Adapters

```typescript
// infrastructure/adapters/InMemoryUserRepository.ts (Adapter)
export class InMemoryUserRepository implements UserRepository {
  private users = new Map<string, User>();

  async findById(id: UserId): Promise<Result<User, EntityNotFoundError>> {
    const user = this.users.get(id);
    if (!user) return err(new EntityNotFoundError('User', id));
    return ok(user);
  }

  async save(user: User): Promise<Result<void, PersistenceError>> {
    this.users.set(user.id, user);
    return ok(undefined);
  }

  // ... other methods
}

// infrastructure/adapters/ApiUserRepository.ts
export class ApiUserRepository implements UserRepository {
  constructor(private readonly httpClient: HttpClient) {}

  async findById(id: UserId): Promise<Result<User, EntityNotFoundError>> {
    const response = await this.httpClient.get(`/users/${id}`);
    if (response.status === 404) {
      return err(new EntityNotFoundError('User', id));
    }
    return ok(plainToInstance(User, response.data));
  }

  // ... other methods
}
```

---

## DI Container with Awilix

```typescript
// infrastructure/di/container.ts
import { createContainer, asClass, asValue, InjectionMode } from 'awilix';

export interface Dependencies {
  // Ports
  userRepository: UserRepository;
  orderRepository: OrderRepository;
  eventPublisher: EventPublisher;
  timer: Timer;

  // Use Cases
  createUserUseCase: CreateUserUseCase;
  placeOrderUseCase: PlaceOrderUseCase;

  // Config
  config: AppConfig;
}

export function createDIContainer(config: AppConfig) {
  const container = createContainer<Dependencies>({
    injectionMode: InjectionMode.PROXY,
  });

  container.register({
    // Config
    config: asValue(config),

    // Infrastructure (swap implementations easily)
    userRepository: asClass(
      config.useInMemoryDb ? InMemoryUserRepository : ApiUserRepository
    ).singleton(),

    eventPublisher: asClass(
      config.features.enableEventSourcing
        ? KafkaEventPublisher
        : NoOpEventPublisher
    ).singleton(),

    timer: asClass(BrowserTimer).singleton(),

    // Application
    createUserUseCase: asClass(CreateUserUseCase).scoped(),
    placeOrderUseCase: asClass(PlaceOrderUseCase).scoped(),
  });

  return container;
}
```

---

## Framework Integration

### Vue 3 Plugin

```typescript
// plugins/di.ts
import type { Plugin } from 'vue';
import type { AwilixContainer } from 'awilix';

export const diPlugin: Plugin = {
  install(app, container: AwilixContainer<Dependencies>) {
    app.provide('container', container);
  },
};

// main.ts
const container = createDIContainer(config);
app.use(diPlugin, container);
```

### Vue Composable

```typescript
// composables/useDependencies.ts
export function useDependencies() {
  const container = inject<AwilixContainer<Dependencies>>('container');
  if (!container) throw new Error('DI container not provided');
  return container.cradle;
}

// Usage in components
export function useCreateUser() {
  const { createUserUseCase } = useDependencies();

  return {
    execute: (data: CreateUserData) => createUserUseCase.execute(data),
  };
}
```

---

## Testing with Mock Implementations

```typescript
// test/mocks/MockUserRepository.ts
export class MockUserRepository implements UserRepository {
  savedUsers: User[] = [];
  shouldFail = false;

  async findById(id: UserId): Promise<Result<User, EntityNotFoundError>> {
    const user = this.savedUsers.find(u => u.id === id);
    if (!user) return err(new EntityNotFoundError('User', id));
    return ok(user);
  }

  async save(user: User): Promise<Result<void, PersistenceError>> {
    if (this.shouldFail) {
      return err(new PersistenceError('Mock failure'));
    }
    this.savedUsers.push(user);
    return ok(undefined);
  }
}

// In tests
const userRepository = new MockUserRepository();
const useCase = new CreateUserUseCase(userRepository, mockEventBus);
```

---

## Scoping Strategies

| Scope | Lifetime | Use For |
|-------|----------|---------|
| `singleton()` | App lifetime | Stateless services, HTTP clients |
| `scoped()` | Request/transaction | Use cases, unit of work |
| `transient()` | New each time | Stateful objects |

---

## Anti-Patterns

```typescript
// ✗ BAD: Direct instantiation
class OrderService {
  private userRepo = new ApiUserRepository(); // Hard dependency
}

// ✓ GOOD: Constructor injection
class OrderService {
  constructor(private readonly userRepo: UserRepository) {}
}

// ✗ BAD: Service locator inside methods
class OrderService {
  process() {
    const repo = container.resolve('userRepository'); // Hidden dependency
  }
}

// ✓ GOOD: Inject at construction time
class OrderService {
  constructor(private readonly userRepo: UserRepository) {}

  process() {
    this.userRepo.findById(...);
  }
}
```
