# Horse Racing Game

![Vue](https://img.shields.io/badge/Vue-3.4-4FC08D?logo=vue.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript)
[![Deploy](https://github.com/JAPA-Gerthner/qubit-labs-test-test-assignment/actions/workflows/deploy.yml/badge.svg)](https://github.com/JAPA-Gerthner/qubit-labs-test-test-assignment/actions/workflows/deploy.yml)
[![Coverage Status](https://coveralls.io/repos/github/JAPA-Gerthner/qubit-labs-test-test-assignment/badge.svg?branch=master)](https://coveralls.io/github/JAPA-Gerthner/qubit-labs-test-test-assignment?branch=master)
![License](https://img.shields.io/badge/License-MIT-yellow)

An interactive horse racing simulation game built with Vue 3, TypeScript, and Vuex.

## Live Demo

https://japa-gerthner.github.io/qubit-labs-test-test-assignment/

## Features

- Generate 20 horses with random names, conditions, and colors
- 6 race rounds with varying distances (1200m - 2200m)
- 10 random horses per round
- Start/Pause race controls
- Animated horse movement
- Real-time results tracking

## Architecture

The project follows a clean architecture approach with separation of concerns:

```
src/
├── classes/           # Domain layer (pure business logic)
│   ├── Horse.class.ts        # Horse entity with name, condition, color
│   ├── RunningHorse.class.ts # Horse in a race with position tracking
│   ├── Race.class.ts         # Race logic, turn processing, results
│   └── Game.class.ts        # Game factory for generating horses/races
├── components/        # Presentation layer (Vue components)
│   ├── HeaderBar.vue        # Controls (Generate/Start/Pause)
│   ├── HorseList.vue        # List of all 20 horses
│   ├── RaceTrack.vue        # Animated race visualization
│   └── ResultsPanel.vue     # Race results by lap
└── store/             # Application layer (Vuex state management)
    └── index.ts             # Actions, mutations, timer management
```

## Tech Stack

- Vue 3 + TypeScript
- Vuex 4 for state management
- Vite for build tooling
- Tailwind CSS for styling
- Vitest for unit testing
- Playwright for E2E testing

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run test:unit    # Run unit tests
npm run test:e2e     # Run E2E tests
npm run test:coverage # Run tests with coverage
```
