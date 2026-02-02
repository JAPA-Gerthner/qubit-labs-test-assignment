# Horse Racing Game

![Vue](https://img.shields.io/badge/Vue-3.4-4FC08D?logo=vue.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript)
[![Deploy](https://github.com/JAPA-Gerthner/qubit-labs-test-test-assignment/actions/workflows/deploy.yml/badge.svg)](https://github.com/JAPA-Gerthner/qubit-labs-test-test-assignment/actions/workflows/deploy.yml)
[![Coverage Status](https://coveralls.io/repos/github/JAPA-Gerthner/qubit-labs-test-test-assignment/badge.svg?branch=master)](https://coveralls.io/github/JAPA-Gerthner/qubit-labs-test-test-assignment?branch=master)
![License](https://img.shields.io/badge/License-MIT-yellow)

An interactive horse racing simulation built with Vue 3 and TypeScript, following enterprise architecture patterns.

## Live Demo

https://japa-gerthner.github.io/qubit-labs-test-test-assignment/

## Features

- Generate 20 horses with random names, conditions, and colors
- 6 race rounds with varying distances (1200m - 2200m)
- 10 random horses per round
- Start/Pause race controls
- Animated horse movement with colored glow effects
- Real-time results tracking
- Mobile responsive design

## Architecture

The project follows **Clean Architecture** with strict layer separation:

```
src/
├── domain/                 # Pure business logic (no framework imports)
│   ├── entities/           # Race, RunningHorse, AggregateRoot
│   ├── value-objects/      # Horse, Distance, Condition, HorseColor
│   ├── events/             # RaceStarted, RaceFinished, HorseFinished
│   └── errors/             # Domain-specific errors
│
├── application/            # Use cases & orchestration
│   ├── commands/           # GenerateProgramCommand, StartRaceCommand, PauseRaceCommand
│   ├── ports/output/       # Timer, GameStateStore, EventPublisher interfaces
│   └── EventBus.ts         # Domain event publishing
│
├── infrastructure/         # Framework implementations
│   ├── adapters/           # BrowserTimer (implements Timer port)
│   └── di/                 # Dependency injection container
│
├── presentation/           # Vue UI layer
│   ├── components/         # HeaderBar, HorseList, RaceTrack, ResultsPanel
│   ├── composables/        # useDependencies, useContainer
│   └── store/              # Pinia store with GameStateStore adapter
│
└── shared/                 # Cross-cutting concerns
    ├── Result.ts           # Result<T, E> for error handling
    ├── types/branded.ts    # Branded types (HorseId, RaceId, TimerId)
    └── errors/             # BaseError, OperationalError, ProgrammerError
```

### Key Patterns

- **Branded Types** - Type-safe IDs prevent mixing different entity types
- **Result Pattern** - Explicit error handling without exceptions
- **Value Objects** - Immutable domain primitives with validation
- **Domain Events** - Decouple side effects from business logic
- **Dependency Injection** - Ports/adapters for testability
- **Command Pattern** - Encapsulated use cases

See [`architecture/`](./architecture/) for detailed documentation.

## Tech Stack

- **Vue 3** + Composition API
- **TypeScript** with strict mode
- **Pinia** for state management
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Vitest** for unit testing (342 tests)
- **Playwright** for E2E testing

## Scripts

```bash
npm run dev           # Start dev server
npm run build         # Build for production
npm run test:unit     # Run unit tests
npm run test:coverage # Run tests with coverage
npm run test:e2e      # Run E2E tests
npm run type-check    # TypeScript type checking
```

## License

MIT
