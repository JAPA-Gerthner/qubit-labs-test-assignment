# Project Structure

> **When to use**: Setting up a new project, understanding where code belongs, organizing files consistently.

## Recommended Structure

```
src/
├── domain/                      # Pure business logic - NO framework imports
│   ├── entities/
│   │   ├── User.ts
│   │   ├── Order.ts
│   │   ├── AggregateRoot.ts
│   │   └── __tests__/
│   │       └── User.spec.ts
│   ├── value-objects/
│   │   ├── Money.ts
│   │   ├── Email.ts
│   │   ├── UserId.ts
│   │   ├── DateRange.ts
│   │   └── __tests__/
│   ├── events/
│   │   ├── DomainEvent.ts
│   │   ├── UserEvents.ts
│   │   └── OrderEvents.ts
│   ├── errors/
│   │   ├── DomainError.ts
│   │   └── index.ts
│   └── services/
│       └── PricingService.ts    # Domain services (stateless)
│
├── application/                 # Use cases & orchestration
│   ├── commands/                # Write operations
│   │   ├── CreateUserCommand.ts
│   │   ├── PlaceOrderCommand.ts
│   │   └── __tests__/
│   ├── queries/                 # Read operations
│   │   ├── GetUserQuery.ts
│   │   ├── ListOrdersQuery.ts
│   │   └── __tests__/
│   ├── ports/                   # Interfaces for external dependencies
│   │   ├── input/               # Driven ports (how app is used)
│   │   │   └── UserService.ts
│   │   └── output/              # Driving ports (what app uses)
│   │       ├── UserRepository.ts
│   │       ├── EventPublisher.ts
│   │       ├── PaymentGateway.ts
│   │       └── Logger.ts
│   └── EventBus.ts
│
├── infrastructure/              # Framework-specific implementations
│   ├── adapters/                # Port implementations
│   │   ├── persistence/
│   │   │   ├── InMemoryUserRepository.ts
│   │   │   ├── SqlUserRepository.ts
│   │   │   └── ApiUserRepository.ts
│   │   ├── messaging/
│   │   │   └── WebSocketEventPublisher.ts
│   │   └── external/
│   │       └── StripePaymentGateway.ts
│   ├── di/
│   │   └── container.ts
│   ├── http/
│   │   └── HttpClient.ts
│   └── logging/
│       └── ConsoleLogger.ts
│
├── presentation/                # UI Layer (Vue/React/etc)
│   ├── components/
│   │   ├── common/              # Reusable UI components
│   │   │   ├── Button.vue
│   │   │   ├── Modal.vue
│   │   │   └── Input.vue
│   │   └── features/            # Feature-specific components
│   │       ├── user/
│   │       │   ├── UserCard.vue
│   │       │   └── UserForm.vue
│   │       └── order/
│   │           ├── OrderList.vue
│   │           └── OrderDetails.vue
│   ├── composables/             # Vue composition functions
│   │   ├── useAsync.ts
│   │   ├── useDebounce.ts
│   │   ├── usePagination.ts
│   │   └── useUser.ts
│   ├── pages/                   # Route-level components
│   │   ├── HomePage.vue
│   │   ├── UserPage.vue
│   │   └── OrderPage.vue
│   ├── layouts/
│   │   ├── MainLayout.vue
│   │   └── AuthLayout.vue
│   └── store/                   # UI state only (Pinia)
│       ├── ui.store.ts
│       └── auth.store.ts
│
├── shared/                      # Cross-cutting concerns
│   ├── types/
│   │   ├── branded.ts
│   │   └── utils.ts
│   ├── Result.ts
│   └── utils/
│       ├── array.ts
│       └── string.ts
│
├── config/
│   ├── schema.ts
│   ├── loader.ts
│   └── index.ts
│
├── api/                         # API layer (if separate from presentation)
│   ├── dto/
│   │   ├── UserDTO.ts
│   │   └── ErrorDTO.ts
│   ├── mappers/
│   │   ├── UserMapper.ts
│   │   └── ErrorMapper.ts
│   └── controllers/
│       └── UserController.ts
│
├── test/                        # Test utilities
│   ├── mocks/
│   │   ├── MockUserRepository.ts
│   │   └── MockEventBus.ts
│   ├── builders/
│   │   └── UserBuilder.ts
│   ├── fixtures/
│   │   └── users.ts
│   ├── arbitraries/
│   │   └── domain.ts
│   └── setup.ts
│
└── main.ts                      # Composition root
```

---

## Layer Rules

### What Goes Where

| Code Type | Layer | Example |
|-----------|-------|---------|
| Business rules | Domain | `User.canPlaceOrder()` |
| Validation logic | Domain | `Email.create()` |
| Use case orchestration | Application | `CreateUserUseCase` |
| Interface definitions | Application/Ports | `UserRepository` |
| Database queries | Infrastructure | `SqlUserRepository` |
| API clients | Infrastructure | `StripePaymentGateway` |
| UI components | Presentation | `UserCard.vue` |
| Reactive state | Presentation | `useUser()` composable |
| Route definitions | Presentation | `router.ts` |
| Shared utilities | Shared | `Result<T,E>` |
| Configuration | Config | `AppConfig` |

---

## Dependency Rules

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation                          │
│              (Can import from all layers)                │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                   Infrastructure                         │
│         (Implements Application interfaces)              │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                    Application                           │
│            (Uses Domain, defines ports)                  │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                      Domain                              │
│        (Pure TypeScript, no external imports)            │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                      Shared                              │
│           (Utilities, types, Result)                     │
└─────────────────────────────────────────────────────────┘
```

**Import Rules:**
- Domain → Shared only
- Application → Domain, Shared
- Infrastructure → Application, Domain, Shared
- Presentation → All layers
- Shared → Nothing (leaf)

---

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Entity | PascalCase | `User.ts` |
| Value Object | PascalCase | `Money.ts` |
| Use Case | PascalCase + UseCase | `CreateUserUseCase.ts` |
| Repository | PascalCase + Repository | `UserRepository.ts` |
| Adapter | PascalCase + Impl | `SqlUserRepository.ts` |
| Component | PascalCase | `UserCard.vue` |
| Composable | camelCase with use | `useAsync.ts` |
| Test | *.spec.ts or *.test.ts | `User.spec.ts` |
| DTO | PascalCase + DTO | `UserDTO.ts` |
| Mapper | PascalCase + Mapper | `UserMapper.ts` |

---

## Index Files

Use index files for clean imports:

```typescript
// domain/index.ts
export * from './entities/User';
export * from './entities/Order';
export * from './value-objects/Money';
export * from './value-objects/Email';
export * from './events/UserEvents';
export * from './errors';

// Usage
import { User, Email, Money, UserCreated } from '@/domain';
```

---

## Path Aliases

Configure path aliases for cleaner imports:

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@domain/*": ["src/domain/*"],
      "@application/*": ["src/application/*"],
      "@infrastructure/*": ["src/infrastructure/*"],
      "@presentation/*": ["src/presentation/*"],
      "@shared/*": ["src/shared/*"],
      "@test/*": ["src/test/*"]
    }
  }
}

// vite.config.ts
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@domain': path.resolve(__dirname, './src/domain'),
      '@application': path.resolve(__dirname, './src/application'),
      // ... etc
    },
  },
});
```

---

## Co-location Patterns

### Tests Next to Source

```
domain/
├── entities/
│   ├── User.ts
│   └── __tests__/
│       └── User.spec.ts
```

### Feature-Based Organization (Alternative)

For larger apps, organize by feature instead of layer:

```
src/
├── features/
│   ├── users/
│   │   ├── domain/
│   │   │   ├── User.ts
│   │   │   └── UserEvents.ts
│   │   ├── application/
│   │   │   └── CreateUserUseCase.ts
│   │   ├── infrastructure/
│   │   │   └── UserRepository.ts
│   │   └── presentation/
│   │       ├── UserCard.vue
│   │       └── useUser.ts
│   └── orders/
│       ├── domain/
│       ├── application/
│       ├── infrastructure/
│       └── presentation/
├── shared/
└── config/
```

---

## Monorepo Structure

For shared code between frontend and backend:

```
packages/
├── domain/                  # Shared domain logic
│   ├── src/
│   │   ├── entities/
│   │   ├── value-objects/
│   │   └── events/
│   └── package.json
├── shared/                  # Shared utilities
│   ├── src/
│   │   ├── Result.ts
│   │   └── types/
│   └── package.json
├── frontend/                # Vue/React app
│   ├── src/
│   └── package.json
└── backend/                 # Node.js API
    ├── src/
    └── package.json
```
