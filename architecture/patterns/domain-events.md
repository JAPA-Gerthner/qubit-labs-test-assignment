# Domain Events

> **When to use**: Decoupling components, implementing event-driven architecture, tracking state changes in aggregates.

## Core Concept

Domain events represent something meaningful that happened in the domain. They decouple components and enable reactive architectures.

---

## Event Definition

```typescript
// domain/events/DomainEvent.ts
export interface DomainEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly version: number;
}

export abstract class BaseDomainEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID();
  readonly occurredAt = new Date();
  abstract readonly eventType: string;
  abstract readonly aggregateId: string;
  abstract readonly aggregateType: string;
  readonly version = 1;
}
```

### Concrete Events

```typescript
// domain/events/UserEvents.ts
export class UserCreated extends BaseDomainEvent {
  readonly eventType = 'UserCreated';
  readonly aggregateType = 'User';

  constructor(
    readonly aggregateId: string,
    readonly email: Email,
    readonly name: string
  ) {
    super();
  }
}

export class UserEmailChanged extends BaseDomainEvent {
  readonly eventType = 'UserEmailChanged';
  readonly aggregateType = 'User';

  constructor(
    readonly aggregateId: string,
    readonly oldEmail: Email,
    readonly newEmail: Email
  ) {
    super();
  }
}
```

---

## Aggregate Root Pattern

Entities collect domain events and release them after persistence:

```typescript
// domain/entities/AggregateRoot.ts
export abstract class AggregateRoot {
  private _domainEvents: DomainEvent[] = [];

  get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  clearDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }
}
```

### Entity Using AggregateRoot

```typescript
// domain/entities/User.ts
export class User extends AggregateRoot {
  private constructor(
    public readonly id: UserId,
    private _email: Email,
    private _name: string
  ) {
    super();
  }

  static create(email: Email, name: string): Result<User, ValidationError> {
    if (name.length < 2) {
      return err(new ValidationError('name', 'must be at least 2 characters'));
    }

    const user = new User(createUserId(crypto.randomUUID()), email, name);
    user.addDomainEvent(new UserCreated(user.id, email, name));
    return ok(user);
  }

  changeEmail(newEmail: Email): Result<void, BusinessRuleViolationError> {
    if (this._email === newEmail) {
      return err(new BusinessRuleViolationError('Email is already set to this value'));
    }

    const oldEmail = this._email;
    this._email = newEmail;
    this.addDomainEvent(new UserEmailChanged(this.id, oldEmail, newEmail));
    return ok(undefined);
  }

  get email(): Email { return this._email; }
  get name(): string { return this._name; }
}
```

---

## Event Bus

```typescript
// application/EventBus.ts
type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void>;

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler);

    // Return unsubscribe function
    return () => this.handlers.get(eventType)?.delete(handler as EventHandler);
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType);
    if (!handlers) return;

    await Promise.all(
      Array.from(handlers).map(handler => handler(event))
    );
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
```

---

## Publishing Events in Use Cases

```typescript
// application/commands/CreateUserUseCase.ts
export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(data: CreateUserData): Promise<Result<UserId, DomainError>> {
    const userResult = User.create(
      createEmail(data.email),
      data.name
    );

    if (userResult.isErr()) return userResult;

    const user = userResult.value;
    const saveResult = await this.userRepository.save(user);

    if (saveResult.isErr()) return saveResult;

    // Publish domain events AFTER successful persistence
    await this.eventBus.publishAll(user.clearDomainEvents());

    return ok(user.id);
  }
}
```

---

## Event Handlers

```typescript
// application/handlers/SendWelcomeEmailHandler.ts
export class SendWelcomeEmailHandler {
  constructor(private readonly emailService: EmailService) {}

  async handle(event: UserCreated): Promise<void> {
    await this.emailService.send({
      to: event.email.toString(),
      subject: 'Welcome!',
      template: 'welcome',
      data: { name: event.name },
    });
  }
}

// Wiring up handlers
eventBus.subscribe('UserCreated', handler.handle.bind(handler));
```

---

## Event Naming Conventions

| Pattern | Example | When to Use |
|---------|---------|-------------|
| Past tense | `UserCreated` | Something happened |
| Entity + Action | `OrderShipped` | Domain action completed |
| Specific | `UserEmailChanged` | Property-level changes |
| Aggregate-scoped | `OrderLineAdded` | Child entity changes |

---

## Best Practices

1. **Events are immutable** — Never modify an event after creation
2. **Events are facts** — They represent something that happened, not commands
3. **Publish after persistence** — Only publish after successful save
4. **Handlers should be idempotent** — Same event processed twice = same result
5. **Keep events small** — Include only necessary data
6. **Version your events** — Support schema evolution
