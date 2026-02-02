# Integration Testing

> **When to use**: Testing use cases with mocked dependencies, verifying component interactions, testing repositories against real databases.

## Core Principle

Integration tests verify that components work together correctly. Use real implementations where practical, mock external systems.

---

## Testing Use Cases

```typescript
// application/__tests__/CreateUserUseCase.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { CreateUserUseCase } from '../commands/CreateUserUseCase';
import { MockUserRepository } from '@/test/mocks/MockUserRepository';
import { MockEventBus } from '@/test/mocks/MockEventBus';
import { UserCreated } from '@/domain/events/UserEvents';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let userRepository: MockUserRepository;
  let eventBus: MockEventBus;

  beforeEach(() => {
    userRepository = new MockUserRepository();
    eventBus = new MockEventBus();
    useCase = new CreateUserUseCase(userRepository, eventBus);
  });

  it('should create user and publish event', async () => {
    const result = await useCase.execute({
      email: 'test@example.com',
      name: 'John Doe',
    });

    expect(result.isOk()).toBe(true);
    expect(userRepository.savedUsers).toHaveLength(1);
    expect(eventBus.publishedEvents).toHaveLength(1);
    expect(eventBus.publishedEvents[0]).toBeInstanceOf(UserCreated);
  });

  it('should not publish event if save fails', async () => {
    userRepository.shouldFail = true;

    const result = await useCase.execute({
      email: 'test@example.com',
      name: 'John Doe',
    });

    expect(result.isErr()).toBe(true);
    expect(eventBus.publishedEvents).toHaveLength(0);
  });

  it('should reject duplicate email', async () => {
    // First user
    await useCase.execute({ email: 'test@example.com', name: 'First' });

    // Second user with same email
    userRepository.duplicateEmailCheck = true;
    const result = await useCase.execute({
      email: 'test@example.com',
      name: 'Second',
    });

    expect(result.isErr()).toBe(true);
    expect(result.error.code).toBe('DUPLICATE_EMAIL');
  });
});
```

---

## Mock Implementations

```typescript
// test/mocks/MockUserRepository.ts
export class MockUserRepository implements UserRepository {
  savedUsers: User[] = [];
  shouldFail = false;
  duplicateEmailCheck = false;

  async findById(id: UserId): Promise<Result<User, EntityNotFoundError>> {
    const user = this.savedUsers.find(u => u.id === id);
    if (!user) return err(new EntityNotFoundError('User', id));
    return ok(user);
  }

  async findByEmail(email: Email): Promise<User | null> {
    return this.savedUsers.find(u => u.email.equals(email)) ?? null;
  }

  async save(user: User): Promise<Result<void, PersistenceError>> {
    if (this.shouldFail) {
      return err(new PersistenceError('Mock failure'));
    }

    if (this.duplicateEmailCheck) {
      const existing = await this.findByEmail(user.email);
      if (existing && existing.id !== user.id) {
        return err(new DuplicateEmailError(user.email));
      }
    }

    const index = this.savedUsers.findIndex(u => u.id === user.id);
    if (index >= 0) {
      this.savedUsers[index] = user;
    } else {
      this.savedUsers.push(user);
    }

    return ok(undefined);
  }

  async delete(id: UserId): Promise<Result<void, EntityNotFoundError>> {
    const index = this.savedUsers.findIndex(u => u.id === id);
    if (index < 0) return err(new EntityNotFoundError('User', id));
    this.savedUsers.splice(index, 1);
    return ok(undefined);
  }

  // Test helpers
  reset(): void {
    this.savedUsers = [];
    this.shouldFail = false;
    this.duplicateEmailCheck = false;
  }

  seed(users: User[]): void {
    this.savedUsers = [...users];
  }
}
```

```typescript
// test/mocks/MockEventBus.ts
export class MockEventBus implements EventBus {
  publishedEvents: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.publishedEvents.push(event);
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    this.publishedEvents.push(...events);
  }

  // Test helpers
  reset(): void {
    this.publishedEvents = [];
  }

  getEventsOfType<T extends DomainEvent>(type: string): T[] {
    return this.publishedEvents.filter(e => e.eventType === type) as T[];
  }
}
```

---

## Testing Event Handlers

```typescript
// application/__tests__/SendWelcomeEmailHandler.spec.ts
describe('SendWelcomeEmailHandler', () => {
  let handler: SendWelcomeEmailHandler;
  let emailService: MockEmailService;

  beforeEach(() => {
    emailService = new MockEmailService();
    handler = new SendWelcomeEmailHandler(emailService);
  });

  it('should send welcome email on UserCreated', async () => {
    const event = new UserCreated('user-123', 'test@example.com', 'John');

    await handler.handle(event);

    expect(emailService.sentEmails).toHaveLength(1);
    expect(emailService.sentEmails[0]).toMatchObject({
      to: 'test@example.com',
      subject: 'Welcome!',
      template: 'welcome',
    });
  });

  it('should include user name in email data', async () => {
    const event = new UserCreated('user-123', 'test@example.com', 'Jane');

    await handler.handle(event);

    expect(emailService.sentEmails[0].data.name).toBe('Jane');
  });
});
```

---

## Testing with Real Databases

For repository integration tests:

```typescript
// infrastructure/__tests__/SqlUserRepository.integration.spec.ts
describe('SqlUserRepository', () => {
  let repository: SqlUserRepository;
  let db: Database;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    repository = new SqlUserRepository(db);
    await db.exec('DELETE FROM users');
  });

  it('should persist and retrieve user', async () => {
    const user = new UserBuilder().build();

    await repository.save(user);
    const result = await repository.findById(user.id);

    expect(result.isOk()).toBe(true);
    expect(result.value.email.equals(user.email)).toBe(true);
  });

  it('should return not found for missing user', async () => {
    const result = await repository.findById(createUserId('non-existent'));

    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(EntityNotFoundError);
  });

  it('should handle concurrent updates', async () => {
    const user = new UserBuilder().build();
    await repository.save(user);

    // Simulate concurrent updates
    const [result1, result2] = await Promise.all([
      repository.updateName(user.id, 'Name 1'),
      repository.updateName(user.id, 'Name 2'),
    ]);

    // One should succeed, one should fail with concurrency error
    const results = [result1, result2];
    expect(results.filter(r => r.isOk())).toHaveLength(1);
    expect(results.filter(r => r.isErr())).toHaveLength(1);
  });
});
```

---

## API Integration Tests

```typescript
// api/__tests__/UserController.integration.spec.ts
import { createTestApp } from '@/test/setup';
import request from 'supertest';

describe('UserController', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createTestApp();
  });

  describe('POST /api/users', () => {
    it('should create user and return 201', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ email: 'test@example.com', name: 'John' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe('test@example.com');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ email: 'invalid', name: 'John' });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return 404 for non-existent user', async () => {
      const response = await request(app).get('/api/users/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('ENTITY_NOT_FOUND');
    });
  });
});
```

---

## Test Setup Utilities

```typescript
// test/setup.ts
import { createDIContainer } from '@/infrastructure/di/container';
import { testConfig } from './config';

export async function createTestContainer() {
  const container = createDIContainer(testConfig);

  // Override with mocks
  container.register({
    emailService: asClass(MockEmailService).singleton(),
    paymentGateway: asClass(MockPaymentGateway).singleton(),
  });

  return container;
}

export async function createTestApp() {
  const container = await createTestContainer();
  return createApp(container);
}

export function createTestDatabase() {
  return createDatabase({
    ...testConfig.database,
    database: `test_${Date.now()}`, // Isolated test DB
  });
}
```

---

## Best Practices

| Practice | Reason |
|----------|--------|
| Isolate test databases | Prevent test interference |
| Reset state in beforeEach | Ensure test independence |
| Use factories/builders | Consistent test data creation |
| Mock external services | Avoid network calls in tests |
| Test error paths | Verify failure handling |
| Keep tests fast | Slow tests get skipped |
