import { Result, ok, err } from '@/shared/Result';
import { Horse } from '@/domain/value-objects/Horse';
import {
  RunningHorseId,
  createRunningHorseId,
} from '@/domain/value-objects/RunningHorseId';
import { HorseAlreadyFinishedError } from '@/domain/errors/RaceErrors';

/**
 * Entity representing a horse participating in a race.
 * Tracks position and finish status during the race.
 */
export class RunningHorse {
  private _position: number = 0;
  private _isFinished: boolean = false;

  private constructor(
    private readonly _id: RunningHorseId,
    private readonly _horse: Horse
  ) {}

  /**
   * Creates a new RunningHorse for a race.
   *
   * @param horse - The horse value object with attributes
   * @param id - Optional RunningHorseId (auto-generated if not provided)
   */
  static create(horse: Horse, id?: RunningHorseId): RunningHorse {
    const runningHorseId = id ?? createRunningHorseId(crypto.randomUUID());
    return new RunningHorse(runningHorseId, horse);
  }

  /**
   * Creates a RunningHorse without generating a new ID.
   * Use when reconstituting from persistence.
   */
  static reconstitute(
    id: RunningHorseId,
    horse: Horse,
    position: number,
    isFinished: boolean
  ): RunningHorse {
    const runningHorse = new RunningHorse(id, horse);
    runningHorse._position = position;
    runningHorse._isFinished = isFinished;
    return runningHorse;
  }

  /**
   * The unique identifier of this running horse.
   */
  get id(): RunningHorseId {
    return this._id;
  }

  /**
   * The underlying horse data.
   */
  get horse(): Horse {
    return this._horse;
  }

  /**
   * Current position on the track (meters from start).
   */
  get position(): number {
    return this._position;
  }

  /**
   * Whether this horse has crossed the finish line.
   */
  get isFinished(): boolean {
    return this._isFinished;
  }

  /**
   * Convenience getter for the horse's name.
   */
  get name(): string {
    return this._horse.name.value;
  }

  /**
   * Convenience getter for the horse's condition.
   */
  get condition(): number {
    return this._horse.condition.value;
  }

  /**
   * Convenience getter for the horse's color.
   */
  get color(): string {
    return this._horse.color.value;
  }

  /**
   * Moves the horse forward for one turn.
   * Movement is random based on condition: 1 to condition meters.
   *
   * @param raceLength - The total race distance in meters
   * @returns Ok with distance moved, or Err if horse already finished
   */
  run(raceLength: number): Result<number, HorseAlreadyFinishedError> {
    if (this._isFinished) {
      return err(new HorseAlreadyFinishedError(this._id));
    }

    // Movement formula: random value from 1 to condition
    const movement = Math.floor(Math.random() * this.condition) + 1;
    const newPosition = this._position + movement;

    // Cap at race length when crossing finish line
    if (newPosition >= raceLength) {
      this._position = raceLength;
      this._isFinished = true;
    } else {
      this._position = newPosition;
    }

    return ok(movement);
  }

  /**
   * Calculates the progress as a percentage of the race distance.
   */
  getProgress(raceLength: number): number {
    return Math.min((this._position / raceLength) * 100, 100);
  }

  /**
   * Checks equality by ID.
   */
  equals(other: RunningHorse): boolean {
    return this._id === other._id;
  }

  toString(): string {
    return `${this.name} at ${this._position}m${this._isFinished ? ' (finished)' : ''}`;
  }

  toJSON(): {
    id: string;
    horse: ReturnType<Horse['toJSON']>;
    position: number;
    isFinished: boolean;
  } {
    return {
      id: this._id,
      horse: this._horse.toJSON(),
      position: this._position,
      isFinished: this._isFinished,
    };
  }
}
