# Property-Based Testing

> **When to use**: Testing mathematical properties, invariants, edge cases you might not think of, validating transformations.

## Core Concept

Instead of writing specific test cases, define properties that should always hold. The framework generates hundreds of random inputs to find counterexamples.

---

## Setup with fast-check

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // fast-check integration
  },
});
```

```bash
npm install -D @fast-check/vitest fast-check
```

---

## Basic Property Tests

```typescript
// domain/value-objects/__tests__/Money.property.spec.ts
import { fc, test } from '@fast-check/vitest';
import { Money, Currency } from '../Money';

describe('Money - Property-based tests', () => {
  test.prop([
    fc.float({ min: 0, max: 1000000 }),
    fc.float({ min: 0, max: 1000000 }),
  ])('addition is commutative', (a, b) => {
    const moneyA = Money.create(a, Currency.USD).value;
    const moneyB = Money.create(b, Currency.USD).value;

    const result1 = moneyA.add(moneyB).value;
    const result2 = moneyB.add(moneyA).value;

    return result1.equals(result2);
  });

  test.prop([
    fc.float({ min: 0, max: 1000000 }),
  ])('adding zero is identity', (amount) => {
    const money = Money.create(amount, Currency.USD).value;
    const zero = Money.zero(Currency.USD);

    return money.add(zero).value.equals(money);
  });

  test.prop([
    fc.float({ min: 0, max: 1000000 }),
    fc.float({ min: 0, max: 1000000 }),
    fc.float({ min: 0, max: 1000000 }),
  ])('addition is associative', (a, b, c) => {
    const ma = Money.create(a, Currency.USD).value;
    const mb = Money.create(b, Currency.USD).value;
    const mc = Money.create(c, Currency.USD).value;

    // (a + b) + c == a + (b + c)
    const left = ma.add(mb).value.add(mc).value;
    const right = ma.add(mb.add(mc).value).value;

    return left.equals(right);
  });
});
```

---

## Common Arbitraries

```typescript
// test/arbitraries/domain.ts
import { fc } from '@fast-check/vitest';

// Email arbitrary
export const emailArbitrary = fc
  .tuple(
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'), { minLength: 1, maxLength: 20 }),
    fc.constantFrom('gmail.com', 'example.com', 'test.org')
  )
  .map(([local, domain]) => `${local}@${domain}`);

// UserId arbitrary
export const userIdArbitrary = fc.uuid().map(createUserId);

// Money arbitrary
export const moneyArbitrary = fc
  .tuple(
    fc.float({ min: 0, max: 100000, noNaN: true }),
    fc.constantFrom(Currency.USD, Currency.EUR, Currency.GBP)
  )
  .filter(([amount]) => Number.isFinite(amount))
  .map(([amount, currency]) => Money.create(amount, currency).value);

// DateRange arbitrary
export const dateRangeArbitrary = fc
  .tuple(fc.date(), fc.nat({ max: 365 }))
  .map(([start, days]) => {
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    return DateRange.create(start, end).value;
  });

// User arbitrary
export const userArbitrary = fc
  .tuple(emailArbitrary, fc.string({ minLength: 2, maxLength: 50 }))
  .map(([email, name]) => User.create(Email.create(email).value, name).value);
```

---

## Testing Invariants

```typescript
// domain/__tests__/Order.property.spec.ts
import { fc, test } from '@fast-check/vitest';

describe('Order invariants', () => {
  const orderItemArbitrary = fc.record({
    productId: fc.uuid(),
    quantity: fc.integer({ min: 1, max: 100 }),
    unitPrice: fc.float({ min: 0.01, max: 10000, noNaN: true }),
  });

  test.prop([
    fc.array(orderItemArbitrary, { minLength: 1, maxLength: 20 }),
  ])('total equals sum of item totals', (items) => {
    const order = Order.create(items);

    const expectedTotal = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    // Allow for floating point rounding
    return Math.abs(order.total - expectedTotal) < 0.01;
  });

  test.prop([
    fc.array(orderItemArbitrary, { minLength: 0, maxLength: 20 }),
  ])('item count matches array length', (items) => {
    const order = Order.create(items);
    return order.itemCount === items.length;
  });

  test.prop([
    fc.array(orderItemArbitrary, { minLength: 1, maxLength: 20 }),
  ])('total is never negative', (items) => {
    const order = Order.create(items);
    return order.total >= 0;
  });
});
```

---

## Roundtrip Properties

Verify that encode/decode operations are inverses:

```typescript
// shared/__tests__/serialization.property.spec.ts
describe('Serialization roundtrip', () => {
  test.prop([userArbitrary])('User survives JSON roundtrip', (user) => {
    const json = user.toJSON();
    const restored = User.fromJSON(json);

    return restored.isOk() && restored.value.equals(user);
  });

  test.prop([moneyArbitrary])('Money survives serialization', (money) => {
    const serialized = money.serialize();
    const restored = Money.deserialize(serialized);

    return restored.isOk() && restored.value.equals(money);
  });
});
```

---

## Testing Transformations

```typescript
// domain/__tests__/transformations.property.spec.ts
describe('Discount transformations', () => {
  test.prop([
    fc.float({ min: 0.01, max: 10000, noNaN: true }),
    fc.float({ min: 0, max: 100, noNaN: true }),
  ])('percentage discount never exceeds original', (amount, percent) => {
    const original = Money.create(amount, Currency.USD).value;
    const discount = new PercentageDiscount(percent);

    const discounted = discount.apply(original);

    return discounted.isLessThanOrEqual(original);
  });

  test.prop([
    fc.float({ min: 0.01, max: 10000, noNaN: true }),
  ])('0% discount returns original amount', (amount) => {
    const original = Money.create(amount, Currency.USD).value;
    const noDiscount = new PercentageDiscount(0);

    const result = noDiscount.apply(original);

    return result.equals(original);
  });

  test.prop([
    fc.float({ min: 0.01, max: 10000, noNaN: true }),
  ])('100% discount returns zero', (amount) => {
    const original = Money.create(amount, Currency.USD).value;
    const fullDiscount = new PercentageDiscount(100);

    const result = fullDiscount.apply(original);

    return result.equals(Money.zero(Currency.USD));
  });
});
```

---

## Finding Edge Cases

Property testing excels at finding edge cases:

```typescript
describe('DateRange edge cases', () => {
  test.prop([
    fc.date(),
  ])('single day range has duration of 1', (date) => {
    const range = DateRange.create(date, date).value;
    return range.durationInDays === 1;
  });

  test.prop([
    fc.date({ min: new Date('2000-01-01'), max: new Date('2100-01-01') }),
    fc.date({ min: new Date('2000-01-01'), max: new Date('2100-01-01') }),
  ])('overlaps is symmetric', (date1, date2, date3, date4) => {
    // Ensure valid ranges
    const [start1, end1] = [date1, date2].sort((a, b) => a.getTime() - b.getTime());
    const [start2, end2] = [date3, date4].sort((a, b) => a.getTime() - b.getTime());

    const range1 = DateRange.create(start1, end1).value;
    const range2 = DateRange.create(start2, end2).value;

    return range1.overlaps(range2) === range2.overlaps(range1);
  });
});
```

---

## Model-Based Testing

Compare implementation against a simple model:

```typescript
// data-structures/__tests__/PriorityQueue.property.spec.ts
describe('PriorityQueue model-based testing', () => {
  // Simple array-based model
  class ArrayModel<T> {
    private items: T[] = [];

    push(item: T, priority: number): void {
      this.items.push(item);
      this.items.sort((a, b) => this.getPriority(b) - this.getPriority(a));
    }

    pop(): T | undefined {
      return this.items.shift();
    }

    private priorities = new Map<T, number>();
    private getPriority(item: T): number {
      return this.priorities.get(item) ?? 0;
    }
  }

  test.prop([
    fc.array(fc.tuple(fc.string(), fc.integer({ min: 0, max: 100 }))),
  ])('behaves like array model', (operations) => {
    const queue = new PriorityQueue<string>();
    const model = new ArrayModel<string>();

    for (const [item, priority] of operations) {
      queue.push(item, priority);
      model.push(item, priority);
    }

    while (queue.size > 0) {
      if (queue.pop() !== model.pop()) {
        return false;
      }
    }

    return true;
  });
});
```

---

## Best Practices

| Practice | Reason |
|----------|--------|
| Start with simple properties | Commutativity, identity, invariants |
| Create reusable arbitraries | Consistent domain object generation |
| Test mathematical properties | Addition, multiplication laws |
| Verify roundtrip consistency | Serialize/deserialize, encode/decode |
| Use model-based testing | Compare complex impl to simple model |
| Shrinking helps debugging | Minimal failing case is reported |
