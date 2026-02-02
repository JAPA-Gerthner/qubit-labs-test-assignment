import { Horse } from '@/domain/value-objects/Horse';
import { Race } from '@/domain/entities/Race';
import { GameStateStore } from '@/application/ports/output/GameStateStore';

/**
 * Mock game state store for testing.
 * Implements in-memory state management.
 */
export class MockGameStateStore implements GameStateStore {
  private _horses: Horse[] = [];
  private _races: Race[] = [];
  private _currentRaceIndex: number = 0;
  private _isRunning: boolean = false;
  private _tick: number = 0;

  // ─────────────────────────────────────────────────────────────────────────────
  // Getters
  // ─────────────────────────────────────────────────────────────────────────────

  getHorses(): readonly Horse[] {
    return this._horses;
  }

  getRaces(): readonly Race[] {
    return this._races;
  }

  getCurrentRaceIndex(): number {
    return this._currentRaceIndex;
  }

  getCurrentRace(): Race | undefined {
    return this._races[this._currentRaceIndex];
  }

  isRunning(): boolean {
    return this._isRunning;
  }

  getTick(): number {
    return this._tick;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Setters
  // ─────────────────────────────────────────────────────────────────────────────

  setHorses(horses: Horse[]): void {
    this._horses = [...horses];
  }

  setRaces(races: Race[]): void {
    this._races = [...races];
  }

  setCurrentRaceIndex(index: number): void {
    this._currentRaceIndex = index;
  }

  setIsRunning(running: boolean): void {
    this._isRunning = running;
  }

  incrementTick(): number {
    return ++this._tick;
  }

  resetTick(): void {
    this._tick = 0;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Convenience Methods
  // ─────────────────────────────────────────────────────────────────────────────

  advanceToNextRace(): boolean {
    if (this._currentRaceIndex < this._races.length - 1) {
      this._currentRaceIndex++;
      return true;
    }
    return false;
  }

  reset(): void {
    this._horses = [];
    this._races = [];
    this._currentRaceIndex = 0;
    this._isRunning = false;
    this._tick = 0;
  }
}
