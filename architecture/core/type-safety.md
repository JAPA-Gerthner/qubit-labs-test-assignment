# Type Safety

> **When to use**: Creating type-safe identifiers, enforcing strict typing, preventing ID mixups at compile time.

## Core Principle

Never use `@ts-ignore`, `@ts-nocheck`, or `any` types. These are technical debt markers.

---

## Branded Types for Type-Safe Identifiers

Prevent accidentally passing a `UserId` where an `OrderId` is expected:

```typescript
// shared/types/branded.ts
declare const brand: unique symbol;

type Brand<T, TBrand extends string> = T & { [brand]: TBrand };

export type UserId = Brand<string, 'UserId'>;
export type OrderId = Brand<string, 'OrderId'>;
export type Email = Brand<string, 'Email'>;
```

### Factory Functions with Validation

```typescript
export function createUserId(id: string): UserId {
  if (!isValidUUID(id)) throw new InvalidIdError(id);
  return id as UserId;
}

export function createEmail(email: string): Email {
  if (!isValidEmail(email)) throw new InvalidEmailError(email);
  return email as Email;
}
```

### Compile-Time Safety

```typescript
function getUser(id: UserId): User { /* ... */ }
function getOrder(id: OrderId): Order { /* ... */ }

const userId = createUserId('abc-123');
const orderId = createOrderId('xyz-789');

getUser(userId);  // ✓ OK
getUser(orderId); // ✗ Compile error - cannot assign OrderId to UserId
```

---

## Strict Function Types

### Explicit Return Types

```typescript
// Prefer explicit return types
function calculateTotal(items: CartItem[]): Money {
  return items.reduce((sum, item) => sum.add(item.price), Money.zero());
}
```

### Readonly for Immutability

```typescript
interface Config {
  readonly apiUrl: string;
  readonly features: readonly string[];
}
```

### Const Assertions

```typescript
const DISTANCES = [1200, 1400, 1600, 1800, 2000, 2200] as const;
type Distance = typeof DISTANCES[number]; // 1200 | 1400 | 1600 | ...
```

---

## Common Patterns

### Discriminated Unions

```typescript
type LoadingState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function handleState<T>(state: LoadingState<T>) {
  switch (state.status) {
    case 'idle': return 'Not started';
    case 'loading': return 'Loading...';
    case 'success': return state.data; // TypeScript knows data exists
    case 'error': return state.error.message;
  }
}
```

### Template Literal Types

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ApiRoute = `/api/${string}`;
type Endpoint = `${HttpMethod} ${ApiRoute}`;

const endpoint: Endpoint = 'GET /api/users'; // ✓
const invalid: Endpoint = 'FETCH /api/users'; // ✗
```

### Utility Types

```typescript
// Make all properties optional for updates
type UserUpdate = Partial<User>;

// Make specific properties required
type RequiredUser = Required<Pick<User, 'id' | 'email'>>;

// Omit sensitive fields
type PublicUser = Omit<User, 'password' | 'ssn'>;

// Extract function return type
type UserResponse = ReturnType<typeof fetchUser>;
```

---

## Anti-Patterns to Avoid

```typescript
// ✗ BAD: any type
function process(data: any) { ... }

// ✓ GOOD: generic with constraint
function process<T extends Record<string, unknown>>(data: T) { ... }

// ✗ BAD: type assertion to silence errors
const user = response as User;

// ✓ GOOD: runtime validation
const user = plainToInstance(User, response);
const errors = await validate(user);

// ✗ BAD: non-null assertion without check
const name = user!.name;

// ✓ GOOD: explicit null handling
const name = user?.name ?? 'Unknown';
```
