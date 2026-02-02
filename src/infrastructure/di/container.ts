import { Timer } from '@/application/ports/output/Timer';
import {
  EventPublisher,
  EventSubscriber,
} from '@/application/ports/output/EventPublisher';
import { GameStateStore } from '@/application/ports/output/GameStateStore';
import { EventBus } from '@/application/EventBus';
import {
  GenerateProgramCommand,
  StartRaceCommand,
  PauseRaceCommand,
} from '@/application/commands';
import { BrowserTimer } from '../adapters/BrowserTimer';

/**
 * Default tick interval for race simulation (in milliseconds).
 */
const DEFAULT_TICK_INTERVAL_MS = 100;

/**
 * Container interface defining all available dependencies.
 * This is the public API for the DI container.
 */
export interface Container {
  // ─────────────────────────────────────────────────────────────────────────────
  // Infrastructure
  // ─────────────────────────────────────────────────────────────────────────────

  /** Timer implementation for scheduled callbacks */
  readonly timer: Timer;

  /** Event bus for publishing and subscribing to domain events */
  readonly eventBus: EventBus;

  /** Event publisher interface (same instance as eventBus) */
  readonly eventPublisher: EventPublisher;

  /** Event subscriber interface (same instance as eventBus) */
  readonly eventSubscriber: EventSubscriber;

  /** State store (injected from presentation layer) */
  readonly stateStore: GameStateStore;

  // ─────────────────────────────────────────────────────────────────────────────
  // Commands
  // ─────────────────────────────────────────────────────────────────────────────

  /** Command to generate a new racing program */
  readonly generateProgramCommand: GenerateProgramCommand;

  /** Command to start/resume race simulation */
  readonly startRaceCommand: StartRaceCommand;

  /** Command to pause race simulation */
  readonly pauseRaceCommand: PauseRaceCommand;
}

/**
 * Configuration options for creating a container.
 */
export interface ContainerConfig {
  /** Tick interval for race simulation in milliseconds (default: 100) */
  tickIntervalMs?: number;

  /** Optional custom timer implementation (for testing) */
  timer?: Timer;

  /** Optional custom event bus (for testing) */
  eventBus?: EventBus;
}

/**
 * Creates a fully configured dependency injection container.
 *
 * The container wires together all application dependencies:
 * - Infrastructure adapters (Timer, EventBus)
 * - Application commands (GenerateProgram, StartRace, PauseRace)
 *
 * The GameStateStore is injected from the presentation layer (e.g., Pinia store)
 * to allow the UI framework to react to state changes.
 *
 * @param stateStore - The state store implementation (usually from Pinia)
 * @param config - Optional configuration for customizing dependencies
 * @returns A fully configured Container
 *
 * @example
 * // In a Vue component or plugin
 * const store = useGameStore();
 * const container = createContainer(store.stateAdapter);
 *
 * // Use commands
 * await container.generateProgramCommand.execute();
 * await container.startRaceCommand.execute();
 */
export function createContainer(
  stateStore: GameStateStore,
  config: ContainerConfig = {}
): Container {
  const { tickIntervalMs = DEFAULT_TICK_INTERVAL_MS } = config;

  // Infrastructure
  const timer = config.timer ?? new BrowserTimer();
  const eventBus = config.eventBus ?? new EventBus();

  // Commands
  const generateProgramCommand = new GenerateProgramCommand(
    stateStore,
    eventBus
  );

  const startRaceCommand = new StartRaceCommand(
    timer,
    stateStore,
    eventBus,
    tickIntervalMs
  );

  const pauseRaceCommand = new PauseRaceCommand(startRaceCommand, stateStore);

  return {
    // Infrastructure
    timer,
    eventBus,
    eventPublisher: eventBus,
    eventSubscriber: eventBus,
    stateStore,

    // Commands
    generateProgramCommand,
    startRaceCommand,
    pauseRaceCommand,
  };
}

/**
 * Type guard to check if an object is a valid Container.
 */
export function isContainer(obj: unknown): obj is Container {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const container = obj as Partial<Container>;
  return (
    container.timer !== undefined &&
    container.eventBus !== undefined &&
    container.stateStore !== undefined &&
    container.generateProgramCommand !== undefined &&
    container.startRaceCommand !== undefined &&
    container.pauseRaceCommand !== undefined
  );
}
