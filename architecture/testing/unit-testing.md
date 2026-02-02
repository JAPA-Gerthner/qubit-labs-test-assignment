# Unit Testing

> **When to use**: Testing domain logic, value objects, pure functions, and isolated components.

## Core Principle

Unit tests verify isolated behavior. Dependencies are mocked or stubbed.

---

## Testing Value Objects

```typescript
// domain/value-objects/__tests__/Money.spec.ts
import { describe, it, expect } from 'vitest';
import { Money, Currency } from '../Money';

describe('Money', () => {
  describe('create', () => {
    it('should create money with valid amount', () => {
      const result = Money.create(100, Currency.USD);

      expect(result.isOk()).toBe(true);
      expect(result.value.format()).toBe('$100.00');
    });

    it('should reject negative amounts', () => {
      const result = Money.create(-50, Currency.USD);

      expect(result.isErr()).toBe(true);
      expect(result.error.field).toBe('amount');
      expect(result.error.reason).toBe('cannot be negative');
    });

    it('should round to 2 decimal places', () => {
      const result = Money.create(10.999, Currency.USD);

      expect(result.value.format()).toBe('$11.00');
    });

    it('should handle zero amount', () => {
      const result = Money.create(0, Currency.USD);

      expect(result.isOk()).toBe(true);
      expect(result.value.format()).toBe('$0.00');
    });
  });

  describe('add', () => {
    it('should add same currencies', () => {
      const a = Money.create(10, Currency.USD).value;
      const b = Money.create(20, Currency.USD).value;

      const result = a.add(b);

      expect(result.isOk()).toBe(true);
      expect(result.value.format()).toBe('$30.00');
    });

    it('should reject different currencies', () => {
      const usd = Money.create(10, Currency.USD).value;
      const eur = Money.create(10, Currency.EUR).value;

      const result = usd.add(eur);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(CurrencyMismatchError);
    });
  });

  describe('equals', () => {
    it('should return true for same amount and currency', () => {
      const a = Money.create(100, Currency.USD).value;
      const b = Money.create(100, Currency.USD).value;

      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different amounts', () => {
      const a = Money.create(100, Currency.USD).value;
      const b = Money.create(200, Currency.USD).value;

      expect(a.equals(b)).toBe(false);
    });
  });
});
```

---

## Testing Domain Entities

```typescript
// domain/entities/__tests__/User.spec.ts
import { describe, it, expect } from 'vitest';
import { User } from '../User';
import { Email } from '../../value-objects/Email';

describe('User', () => {
  const validEmail = Email.create('test@example.com').value;

  describe('create', () => {
    it('should create user with valid data', () => {
      const result = User.create(validEmail, 'John Doe');

      expect(result.isOk()).toBe(true);
      expect(result.value.email).toEqual(validEmail);
      expect(result.value.name).toBe('John Doe');
    });

    it('should reject name shorter than 2 characters', () => {
      const result = User.create(validEmail, 'J');

      expect(result.isErr()).toBe(true);
      expect(result.error.reason).toContain('at least 2 characters');
    });

    it('should emit UserCreated event', () => {
      const result = User.create(validEmail, 'John Doe');
      const events = result.value.domainEvents;

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('UserCreated');
    });
  });

  describe('changeEmail', () => {
    it('should update email and emit event', () => {
      const user = User.create(validEmail, 'John Doe').value;
      const newEmail = Email.create('new@example.com').value;

      const result = user.changeEmail(newEmail);

      expect(result.isOk()).toBe(true);
      expect(user.email).toEqual(newEmail);

      const events = user.domainEvents;
      expect(events).toHaveLength(2); // Created + EmailChanged
      expect(events[1].eventType).toBe('UserEmailChanged');
    });

    it('should reject same email', () => {
      const user = User.create(validEmail, 'John Doe').value;

      const result = user.changeEmail(validEmail);

      expect(result.isErr()).toBe(true);
      expect(result.error.rule).toContain('already set');
    });
  });
});
```

---

## Testing Pure Functions

```typescript
// shared/utils/__tests__/array.spec.ts
import { describe, it, expect } from 'vitest';
import { groupBy, unique, partition } from '../array';

describe('array utilities', () => {
  describe('groupBy', () => {
    it('should group items by key', () => {
      const items = [
        { type: 'a', value: 1 },
        { type: 'b', value: 2 },
        { type: 'a', value: 3 },
      ];

      const result = groupBy(items, item => item.type);

      expect(result.get('a')).toHaveLength(2);
      expect(result.get('b')).toHaveLength(1);
    });

    it('should handle empty array', () => {
      const result = groupBy([], item => item);

      expect(result.size).toBe(0);
    });
  });

  describe('unique', () => {
    it('should remove duplicates', () => {
      const result = unique([1, 2, 2, 3, 1]);

      expect(result).toEqual([1, 2, 3]);
    });

    it('should use custom key function', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 1 }];

      const result = unique(items, item => item.id);

      expect(result).toHaveLength(2);
    });
  });
});
```

---

## Test Organization

```
src/
├── domain/
│   ├── entities/
│   │   ├── User.ts
│   │   └── __tests__/
│   │       └── User.spec.ts
│   └── value-objects/
│       ├── Money.ts
│       └── __tests__/
│           └── Money.spec.ts
├── application/
│   └── commands/
│       ├── CreateUserCommand.ts
│       └── __tests__/
│           └── CreateUserCommand.spec.ts
└── shared/
    └── utils/
        ├── array.ts
        └── __tests__/
            └── array.spec.ts
```

---

## Test Patterns

### Arrange-Act-Assert

```typescript
it('should calculate discount', () => {
  // Arrange
  const cart = new Cart();
  cart.addItem(product, 2);
  const discount = new PercentageDiscount(10);

  // Act
  const total = cart.calculateTotal(discount);

  // Assert
  expect(total.format()).toBe('$90.00');
});
```

### Test Data Builders

```typescript
// test/builders/UserBuilder.ts
export class UserBuilder {
  private email = Email.create('test@example.com').value;
  private name = 'Test User';

  withEmail(email: string): this {
    this.email = Email.create(email).value;
    return this;
  }

  withName(name: string): this {
    this.name = name;
    return this;
  }

  build(): User {
    return User.create(this.email, this.name).value;
  }
}

// Usage
const user = new UserBuilder()
  .withEmail('custom@example.com')
  .withName('Custom Name')
  .build();
```

### Test Fixtures

```typescript
// test/fixtures/users.ts
export const testUsers = {
  admin: () => new UserBuilder().withRole('admin').build(),
  regular: () => new UserBuilder().withRole('user').build(),
  inactive: () => new UserBuilder().withActive(false).build(),
};

// Usage
it('should allow admin to delete users', () => {
  const admin = testUsers.admin();
  const target = testUsers.regular();

  const result = deleteUser(admin, target);

  expect(result.isOk()).toBe(true);
});
```

---

## Naming Conventions

```typescript
describe('ClassName', () => {
  describe('methodName', () => {
    it('should [expected behavior] when [condition]', () => {});
    it('should throw [error] when [invalid input]', () => {});
    it('should return [value] for [edge case]', () => {});
  });
});
```

Examples:
- `should create user with valid data`
- `should reject negative amounts`
- `should emit UserCreated event`
- `should throw ValidationError when email is invalid`
