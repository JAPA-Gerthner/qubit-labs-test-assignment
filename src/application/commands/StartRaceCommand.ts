import { Result, ok, err } from '@/shared/Result';
import { RaceNotFoundError, RaceError } from '@/domain/errors/RaceErrors';
import { Timer, TimerId } from '@/application/ports/output/Timer';
import { GameStateStore } from '@/application/ports/output/GameStateStore';
import { EventPublisher } from '@/application/ports/output/EventPublisher';

/**
 * Default interval between race turns in milliseconds.
 */
const DEFAULT_TICK_INTERVAL_MS = 500;

/**
 * Command to start and run a race simulation.
 * Manages the race loop, updating state and publishing events.
 */
export class StartRaceCommand {
  private intervalId: TimerId | null = null;

  constructor(
    private readonly timer: Timer,
    private readonly stateStore: GameStateStore,
    private readonly eventPublisher: EventPublisher,
    private readonly tickIntervalMs: number = DEFAULT_TICK_INTERVAL_MS
  ) {}

  /**
   * Starts the current race.
   * Sets up an interval to execute race turns until the race finishes.
   *
   * @returns Ok if race started, Err if no current race exists
   */
  async execute(): Promise<Result<void, RaceNotFoundError>> {
    // Guard: already running
    if (this.stateStore.isRunning()) {
      return ok(undefined);
    }

    // Get current race
    const race = this.stateStore.getCurrentRace();
    if (!race) {
      return err(new RaceNotFoundError(this.stateStore.getCurrentRaceIndex()));
    }

    // Start the race if not already started
    const startResult = race.start();
    if (startResult.isErr()) {
      // Race already finished - try to advance
      return this.handleRaceComplete();
    }

    // Publish start events
    const startEvents = race.clearDomainEvents();
    await this.eventPublisher.publishAll(startEvents);

    // Set running state
    this.stateStore.setIsRunning(true);

    // Set up race loop
    this.intervalId = this.timer.setInterval(() => {
      this.executeTurn();
    }, this.tickIntervalMs);

    return ok(undefined);
  }

  /**
   * Executes a single turn of the race.
   * Called by the interval timer.
   */
  private async executeTurn(): Promise<void> {
    const race = this.stateStore.getCurrentRace();
    if (!race) {
      this.stop();
      return;
    }

    // Execute turn
    const turnResult = race.turn();
    if (turnResult.isErr()) {
      // Race error (finished or not started)
      await this.handleRaceComplete();
      return;
    }

    // Increment tick counter
    this.stateStore.incrementTick();

    // Publish turn events
    const events = race.clearDomainEvents();
    await this.eventPublisher.publishAll(events);

    // Check if race finished
    if (race.isFinished) {
      await this.handleRaceComplete();
    }
  }

  /**
   * Handles race completion.
   * Stops the timer and either advances to the next race or stops running.
   */
  private async handleRaceComplete(): Promise<Result<void, RaceNotFoundError>> {
    this.clearInterval();
    this.stateStore.setIsRunning(false);

    // Try to advance to next race
    const hasNextRace = this.stateStore.advanceToNextRace();
    if (hasNextRace) {
      // Start next race
      this.stateStore.resetTick();
      return this.execute();
    }

    // All races complete
    return ok(undefined);
  }

  /**
   * Stops the race simulation.
   * Does not advance to the next race.
   */
  stop(): void {
    this.clearInterval();
    this.stateStore.setIsRunning(false);
  }

  /**
   * Clears the interval timer if one exists.
   */
  private clearInterval(): void {
    if (this.intervalId !== null) {
      this.timer.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Returns true if the race simulation is currently running.
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }
}
