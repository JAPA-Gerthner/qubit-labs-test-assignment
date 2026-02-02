# Value Objects

> **When to use**: Creating immutable domain concepts like Money, DateRange, Email. Encapsulating validation and behavior with data.

## Core Concept

Value objects are immutable objects defined by their attributes, not identity. Two value objects with the same attributes are considered equal.

---

## Money Value Object

```typescript
// domain/value-objects/Money.ts
export class Money {
  private constructor(
    private readonly amount: number,
    private readonly currency: Currency
  ) {
    Object.freeze(this);
  }

  static create(amount: number, currency: Currency): Result<Money, ValidationError> {
    if (amount < 0) {
      return err(new ValidationError('amount', 'cannot be negative'));
    }
    if (!Number.isFinite(amount)) {
      return err(new ValidationError('amount', 'must be finite'));
    }
    return ok(new Money(Math.round(amount * 100) / 100, currency));
  }

  static zero(currency: Currency = Currency.USD): Money {
    return new Money(0, currency);
  }

  add(other: Money): Result<Money, CurrencyMismatchError> {
    if (!this.currency.equals(other.currency)) {
      return err(new CurrencyMismatchError(this.currency, other.currency));
    }
    return ok(new Money(this.amount + other.amount, this.currency));
  }

  multiply(factor: number): Money {
    return new Money(this.amount * factor, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency.equals(other.currency);
  }

  format(): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency.code,
    }).format(this.amount);
  }
}
```

---

## DateRange Value Object

```typescript
// domain/value-objects/DateRange.ts
export class DateRange {
  private constructor(
    readonly start: Date,
    readonly end: Date
  ) {
    Object.freeze(this);
  }

  static create(start: Date, end: Date): Result<DateRange, ValidationError> {
    if (end < start) {
      return err(new ValidationError('dateRange', 'end must be after start'));
    }
    return ok(new DateRange(start, end));
  }

  contains(date: Date): boolean {
    return date >= this.start && date <= this.end;
  }

  overlaps(other: DateRange): boolean {
    return this.start <= other.end && this.end >= other.start;
  }

  get durationInDays(): number {
    return Math.ceil(
      (this.end.getTime() - this.start.getTime()) / (1000 * 60 * 60 * 24)
    );
  }
}
```

---

## Email Value Object

```typescript
// domain/value-objects/Email.ts
export class Email {
  private constructor(private readonly value: string) {
    Object.freeze(this);
  }

  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  static create(email: string): Result<Email, ValidationError> {
    const normalized = email.trim().toLowerCase();

    if (!Email.EMAIL_REGEX.test(normalized)) {
      return err(new ValidationError('email', 'invalid email format'));
    }

    return ok(new Email(normalized));
  }

  get domain(): string {
    return this.value.split('@')[1];
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
```

---

## Value Object Patterns

### Private Constructor + Factory

```typescript
class Percentage {
  private constructor(private readonly value: number) {
    Object.freeze(this);
  }

  static create(value: number): Result<Percentage, ValidationError> {
    if (value < 0 || value > 100) {
      return err(new ValidationError('percentage', 'must be between 0 and 100'));
    }
    return ok(new Percentage(value));
  }

  // Alternative factory for trusted internal use
  static fromDecimal(decimal: number): Percentage {
    return new Percentage(decimal * 100);
  }
}
```

### Immutability with Object.freeze

```typescript
class Address {
  private constructor(
    readonly street: string,
    readonly city: string,
    readonly country: string,
    readonly postalCode: string
  ) {
    Object.freeze(this);
  }

  // Returns new instance instead of mutating
  withCity(city: string): Address {
    return new Address(this.street, city, this.country, this.postalCode);
  }
}
```

### Equality by Value

```typescript
class Coordinate {
  constructor(readonly lat: number, readonly lng: number) {
    Object.freeze(this);
  }

  equals(other: Coordinate): boolean {
    return this.lat === other.lat && this.lng === other.lng;
  }

  // For use in Sets/Maps
  hashCode(): string {
    return `${this.lat},${this.lng}`;
  }
}
```

---

## Value Objects vs Entities

| Aspect | Value Object | Entity |
|--------|--------------|--------|
| Identity | Defined by attributes | Has unique ID |
| Equality | Compare all attributes | Compare only ID |
| Mutability | Immutable | Can change over time |
| Example | Money, Email, DateRange | User, Order, Product |

---

## When to Create a Value Object

Create a value object when:
- The concept has no meaningful identity
- Equality is determined by all attributes
- The object should be immutable
- Validation rules should be encapsulated
- Behavior is associated with the data

Common candidates:
- Money/Currency
- Date ranges
- Email addresses
- Phone numbers
- Addresses
- Coordinates
- Percentages
- Measurements (Distance, Weight, Volume)
