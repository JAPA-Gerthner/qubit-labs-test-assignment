import { Horse } from '@/domain/value-objects/Horse';
import { Race } from '@/domain/entities/Race';

/**
 * Port interface for game state storage.
 * Abstracts the state management (could be Vuex, Pinia, or in-memory for testing).
 */
export interface GameStateStore {
  // ─────────────────────────────────────────────────────────────────────────────
  // Getters
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Gets all horses in the game.
   */
  getHorses(): readonly Horse[];

  /**
   * Gets all races in the current program.
   */
  getRaces(): readonly Race[];

  /**
   * Gets the index of the currently active race (0-based).
   */
  getCurrentRaceIndex(): number;

  /**
   * Gets the current race, or undefined if no races or index out of bounds.
   */
  getCurrentRace(): Race | undefined;

  /**
   * Returns true if the race simulation is currently running.
   */
  isRunning(): boolean;

  /**
   * Gets the current tick/animation frame count.
   */
  getTick(): number;

  // ─────────────────────────────────────────────────────────────────────────────
  // Setters
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Sets all horses for the game.
   */
  setHorses(horses: Horse[]): void;

  /**
   * Sets all races for the current program.
   */
  setRaces(races: Race[]): void;

  /**
   * Sets the current race index.
   */
  setCurrentRaceIndex(index: number): void;

  /**
   * Sets the running state.
   */
  setIsRunning(running: boolean): void;

  /**
   * Increments the tick counter and returns the new value.
   */
  incrementTick(): number;

  /**
   * Resets the tick counter to 0.
   */
  resetTick(): void;

  // ─────────────────────────────────────────────────────────────────────────────
  // Convenience Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Advances to the next race.
   * Returns true if there was a next race, false if already at the last race.
   */
  advanceToNextRace(): boolean;

  /**
   * Resets the game state to initial values.
   */
  reset(): void;
}
