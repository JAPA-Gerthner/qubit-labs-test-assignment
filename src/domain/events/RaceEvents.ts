import { BaseDomainEvent } from './DomainEvent';
import { RaceId } from '@/domain/value-objects/RaceId';
import { RunningHorseId } from '@/domain/value-objects/RunningHorseId';
import { ValidDistance } from '@/domain/value-objects/Distance';

/**
 * Horse position data for events.
 */
export interface HorsePosition {
  readonly horseId: string;
  readonly horseName: string;
  readonly position: number;
  readonly isFinished: boolean;
}

/**
 * Race result data for events.
 */
export interface RaceResult {
  readonly place: number;
  readonly horseId: string;
  readonly horseName: string;
  readonly finishPosition: number;
}

/**
 * Event emitted when a race starts.
 */
export class RaceStarted extends BaseDomainEvent {
  readonly eventType = 'RaceStarted' as const;
  readonly aggregateType = 'Race' as const;

  constructor(
    raceId: RaceId,
    readonly horseCount: number,
    readonly distance: ValidDistance
  ) {
    super(raceId);
    this.freeze();
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      horseCount: this.horseCount,
      distance: this.distance,
    };
  }
}

/**
 * Event emitted after each turn is completed.
 */
export class TurnCompleted extends BaseDomainEvent {
  readonly eventType = 'TurnCompleted' as const;
  readonly aggregateType = 'Race' as const;

  constructor(
    raceId: RaceId,
    readonly turnNumber: number,
    readonly positions: readonly HorsePosition[]
  ) {
    super(raceId);
    this.freeze();
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      turnNumber: this.turnNumber,
      positions: this.positions,
    };
  }
}

/**
 * Event emitted when a horse crosses the finish line.
 */
export class HorseFinished extends BaseDomainEvent {
  readonly eventType = 'HorseFinished' as const;
  readonly aggregateType = 'Race' as const;

  constructor(
    raceId: RaceId,
    readonly horseId: RunningHorseId,
    readonly horseName: string,
    readonly finishPosition: number,
    readonly place: number
  ) {
    super(raceId);
    this.freeze();
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      horseId: this.horseId,
      horseName: this.horseName,
      finishPosition: this.finishPosition,
      place: this.place,
    };
  }
}

/**
 * Event emitted when all horses have finished the race.
 */
export class RaceFinished extends BaseDomainEvent {
  readonly eventType = 'RaceFinished' as const;
  readonly aggregateType = 'Race' as const;

  constructor(
    raceId: RaceId,
    readonly results: readonly RaceResult[]
  ) {
    super(raceId);
    this.freeze();
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      results: this.results,
    };
  }
}

/**
 * Union type of all race-related events.
 */
export type RaceEvent = RaceStarted | TurnCompleted | HorseFinished | RaceFinished;
