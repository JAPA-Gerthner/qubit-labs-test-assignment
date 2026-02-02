# Layered Architecture

> **When to use**: Reference when explaining system organization, onboarding developers, or deciding where code belongs.

## Overview

Clean layered architecture separates concerns and keeps business logic framework-agnostic:

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│              UI Components, Views, Templates                 │
│         (React, Vue, Angular, Svelte, etc.)                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
│         State Management, Use Cases, Orchestration           │
│      (Redux, Vuex, Pinia, NgRx, MobX, Zustand, etc.)        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      DOMAIN LAYER                            │
│          Entities, Business Logic, Domain Services           │
│                Pure TypeScript/JavaScript                    │
│                   No framework dependencies                  │
└─────────────────────────────────────────────────────────────┘
```

## Layer Responsibilities

### Presentation Layer
- UI components and templates
- User input handling
- Display formatting
- Framework-specific code lives here

### Application Layer
- Use case orchestration
- State management
- Transaction boundaries
- Coordinates domain objects

### Domain Layer
- Business entities and rules
- Value objects
- Domain services (stateless)
- **Zero framework imports**

## Dependency Rule

Dependencies point **inward** only:
- Presentation → Application → Domain
- Domain knows nothing about outer layers
- Application knows nothing about Presentation

## Domain Layer Philosophy

Prefer **classes and decorators** to describe domain models:

```typescript
class User {
  @IsUUID()
  id: string;

  @IsEmail()
  email: string;

  @MinLength(2)
  @MaxLength(50)
  name: string;

  @Min(0)
  @Max(100)
  score: number;

  isActive(): boolean {
    return this.score > 0;
  }
}
```

### Benefits

- **Self-documenting**: Decorators describe validation rules and data shape
- **Encapsulation**: Methods live with the data they operate on
- **Type safety**: Full TypeScript support with IDE autocompletion
- **Testable**: Pure logic with no framework dependencies
- **Reusable**: Same domain classes work across frontend, backend, and shared libraries

## Backend Integration

For transforming API responses into domain classes, use **class-transformer** and **class-validator**:

```typescript
// API response (plain object)
const response = await fetch('/api/users/1');
const data = await response.json();

// Transform to domain class
const user = plainToInstance(User, data);

// Validate
const errors = await validate(user);
if (errors.length > 0) {
  throw new ValidationError(errors);
}

// Now we have a fully typed, validated domain object
console.log(user.isActive()); // Methods are available
```

### Data Flow

```
Backend API Response (JSON)
           ↓
    plainToInstance()
           ↓
  Domain Class Instance
           ↓
      validate()
           ↓
  Validated Domain Object
           ↓
   Application Layer
           ↓
   Presentation Layer
```
