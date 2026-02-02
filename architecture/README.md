# Architecture Reference

> **Skill Usage**: This folder contains modular architecture patterns. Load specific files based on the task at hand.

## Quick Reference

| Topic | File | Load When |
|-------|------|-----------|
| Layered structure | `core/layered-architecture.md` | Explaining system organization |
| Branded types | `core/type-safety.md` | Creating type-safe IDs, strict typing |
| Error handling | `core/result-pattern.md` | Implementing fallible operations |
| Immutable values | `core/value-objects.md` | Creating Money, DateRange, etc. |
| Dependency injection | `patterns/dependency-injection.md` | Wiring dependencies, ports/adapters |
| Domain events | `patterns/domain-events.md` | Event-driven architecture, EventBus |
| CQRS | `patterns/cqrs.md` | Separating reads from writes |
| API mapping | `infrastructure/api-layer.md` | DTOs, anti-corruption layer |
| Observability | `infrastructure/observability.md` | Logging, tracing, metrics |
| Async resilience | `infrastructure/async-patterns.md` | Retry, saga, circuit breaker |
| Error handling | `infrastructure/error-handling.md` | Boundaries, recovery, reporting |
| Security | `infrastructure/security.md` | Auth, XSS, CSRF, injection prevention |
| Configuration | `infrastructure/configuration.md` | Typed config, Zod schemas |
| Vue composables | `frontend/composables.md` | Reusable UI logic |
| Unit testing | `testing/unit-testing.md` | Domain and value object tests |
| Integration testing | `testing/integration-testing.md` | Use case tests with mocks |
| Property testing | `testing/property-testing.md` | fast-check patterns |
| Folder layout | `project-structure.md` | Organizing files and folders |

---

## Core Philosophy

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│              UI Components, Views, Templates                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
│         State Management, Use Cases, Orchestration           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      DOMAIN LAYER                            │
│          Entities, Business Logic, Domain Services           │
│                   No framework dependencies                  │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Framework-agnostic domain** — Business logic survives framework migrations
2. **Rich domain models** — Classes with behavior, not just data bags
3. **Validation at boundaries** — Validate data when it enters the system
4. **Single source of truth** — Domain classes define shape and rules
5. **Explicit error handling** — Result types over exceptions

---

## When to Use This Architecture

**Good fit:**
- Medium to large applications
- Complex business logic
- Teams with OOP background
- Projects requiring strict validation
- Shared code between frontend and backend

**May be overkill for:**
- Simple CRUD apps
- Small prototypes
- Projects with minimal business logic

---

## Architecture Decision Template

When documenting significant decisions, use this format:

```markdown
## ADR: [Decision Title]

**Status**: Proposed | Accepted | Deprecated

**Context**: What problem are we solving?

**Decision**: What did we decide?

**Consequences**:
- Positive: [benefits]
- Negative: [tradeoffs]
```
