import { Result, ok, err } from '@/shared/Result';
import { AggregateRoot } from './AggregateRoot';
import { RunningHorse } from './RunningHorse';
import { RaceId, createRaceId } from '@/domain/value-objects/RaceId';
import { Distance } from '@/domain/value-objects/Distance';
import { Horse } from '@/domain/value-objects/Horse';
import {
  RaceAlreadyFinishedError,
  RaceNotStartedError,
  NoHorsesError,
  RaceError,
} from '@/domain/errors/RaceErrors';
import {
  RaceStarted,
  TurnCompleted,
  HorseFinished,
  RaceFinished,
  HorsePosition,
  RaceResult,
} from '@/domain/events/RaceEvents';

/**
 * Race Aggregate Root.
 * Manages the state and behavior of a horse race.
 * Emits domain events for significant state changes.
 */
export class Race extends AggregateRoot<RaceId> {
  private readonly _horses: RunningHorse[];
  private readonly _results: RunningHorse[] = [];
  private _isStarted: boolean = false;
  private _turnCount: number = 0;

  private constructor(
    id: RaceId,
    horses: RunningHorse[],
    private readonly _distance: Distance
  ) {
    super(id);
    this._horses = horses;
  }

  /**
   * Creates a new Race with the given horses and distance.
   *
   * @param horses - Array of Horse value objects to participate
   * @param distance - The race distance
   * @param id - Optional RaceId (auto-generated if not provided)
   * @returns Ok<Race> or Err<NoHorsesError> if no horses provided
   */
  static create(
    horses: Horse[],
    distance: Distance,
    id?: RaceId
  ): Result<Race, NoHorsesError> {
    if (horses.length === 0) {
      return err(new NoHorsesError());
    }

    const raceId = id ?? createRaceId(crypto.randomUUID());
    const runningHorses = horses.map((horse) => RunningHorse.create(horse));

    return ok(new Race(raceId, runningHorses, distance));
  }

  /**
   * Creates a Race from existing state.
   * Use when reconstituting from persistence.
   */
  static reconstitute(
    id: RaceId,
    horses: RunningHorse[],
    distance: Distance,
    results: RunningHorse[],
    isStarted: boolean,
    turnCount: number
  ): Race {
    const race = new Race(id, horses, distance);
    race._results.push(...results);
    race._isStarted = isStarted;
    race._turnCount = turnCount;
    return race;
  }

  /**
   * The race distance.
   */
  get distance(): Distance {
    return this._distance;
  }

  /**
   * All horses participating in the race.
   */
  get horses(): ReadonlyArray<RunningHorse> {
    return this._horses;
  }

  /**
   * Horses that have finished, in order of finish.
   */
  get results(): ReadonlyArray<RunningHorse> {
    return this._results;
  }

  /**
   * Whether the race has been started.
   */
  get isStarted(): boolean {
    return this._isStarted;
  }

  /**
   * Whether all horses have finished.
   */
  get isFinished(): boolean {
    return this._results.length === this._horses.length;
  }

  /**
   * Current turn number.
   */
  get turnCount(): number {
    return this._turnCount;
  }

  /**
   * The race length in meters.
   */
  get raceLength(): number {
    return this._distance.meters;
  }

  /**
   * Starts the race.
   * Emits RaceStarted event.
   *
   * @returns Ok if started, Err if already finished
   */
  start(): Result<void, RaceAlreadyFinishedError> {
    if (this.isFinished) {
      return err(new RaceAlreadyFinishedError(this._id));
    }

    if (!this._isStarted) {
      this._isStarted = true;
      this.addDomainEvent(
        new RaceStarted(this._id, this._horses.length, this._distance.value)
      );
    }

    return ok(undefined);
  }

  /**
   * Executes one turn of the race.
   * Moves all unfinished horses and records any that finish.
   * Emits TurnCompleted, HorseFinished, and potentially RaceFinished events.
   *
   * @returns Ok if turn executed, Err if not started or already finished
   */
  turn(): Result<void, RaceError> {
    if (!this._isStarted) {
      return err(new RaceNotStartedError(this._id));
    }

    if (this.isFinished) {
      return err(new RaceAlreadyFinishedError(this._id));
    }

    this._turnCount++;

    // Move all unfinished horses
    const newlyFinished: RunningHorse[] = [];
    for (const horse of this._horses) {
      if (!horse.isFinished) {
        const wasFinishedBefore = horse.isFinished;
        horse.run(this.raceLength);

        // Check if horse just finished
        if (horse.isFinished && !wasFinishedBefore) {
          newlyFinished.push(horse);
        }
      }
    }

    // Sort newly finished by position (higher = finished first in this turn)
    // Then by original order for tiebreaker
    newlyFinished.sort((a, b) => {
      // All newly finished horses have position === raceLength
      // Use horse index as tiebreaker (earlier in array = higher priority)
      const indexA = this._horses.indexOf(a);
      const indexB = this._horses.indexOf(b);
      return indexA - indexB;
    });

    // Add to results and emit events
    for (const horse of newlyFinished) {
      this._results.push(horse);
      const place = this._results.length;

      this.addDomainEvent(
        new HorseFinished(
          this._id,
          horse.id,
          horse.name,
          horse.position,
          place
        )
      );
    }

    // Emit turn completed with all positions
    const positions: HorsePosition[] = this._horses.map((h) => ({
      horseId: h.id,
      horseName: h.name,
      position: h.position,
      isFinished: h.isFinished,
    }));

    this.addDomainEvent(new TurnCompleted(this._id, this._turnCount, positions));

    // Check if race is now finished
    if (this.isFinished) {
      const raceResults: RaceResult[] = this._results.map((h, index) => ({
        place: index + 1,
        horseId: h.id,
        horseName: h.name,
        finishPosition: h.position,
      }));

      this.addDomainEvent(new RaceFinished(this._id, raceResults));
    }

    return ok(undefined);
  }

  /**
   * Gets current positions of all horses, sorted by position descending.
   */
  getLeaderboard(): ReadonlyArray<{
    horse: RunningHorse;
    rank: number;
    progress: number;
  }> {
    const sorted = [...this._horses].sort((a, b) => b.position - a.position);
    return sorted.map((horse, index) => ({
      horse,
      rank: index + 1,
      progress: horse.getProgress(this.raceLength),
    }));
  }

  toString(): string {
    const status = this.isFinished
      ? 'finished'
      : this._isStarted
        ? `turn ${this._turnCount}`
        : 'not started';
    return `Race ${this._id} (${this._distance}): ${status}`;
  }

  toJSON(): {
    id: string;
    distance: number;
    horses: ReturnType<RunningHorse['toJSON']>[];
    results: ReturnType<RunningHorse['toJSON']>[];
    isStarted: boolean;
    isFinished: boolean;
    turnCount: number;
  } {
    return {
      id: this._id,
      distance: this._distance.value,
      horses: this._horses.map((h) => h.toJSON()),
      results: this._results.map((h) => h.toJSON()),
      isStarted: this._isStarted,
      isFinished: this.isFinished,
      turnCount: this._turnCount,
    };
  }
}
