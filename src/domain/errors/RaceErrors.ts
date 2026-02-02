import { OperationalError } from '@/shared/errors';
import { RaceId } from '@/domain/value-objects/RaceId';
import { RunningHorseId } from '@/domain/value-objects/RunningHorseId';

/**
 * Error thrown when attempting to perform an action on a finished race.
 */
export class RaceAlreadyFinishedError extends OperationalError {
  readonly code = 'RACE_ALREADY_FINISHED' as const;
  readonly httpStatus = 400;

  constructor(readonly raceId: RaceId) {
    super(`Race ${raceId} has already finished`);
  }

  get userMessage(): string {
    return 'This race has already finished.';
  }
}

/**
 * Error thrown when attempting to perform an action that requires a started race.
 */
export class RaceNotStartedError extends OperationalError {
  readonly code = 'RACE_NOT_STARTED' as const;
  readonly httpStatus = 400;

  constructor(readonly raceId: RaceId) {
    super(`Race ${raceId} has not started yet`);
  }

  get userMessage(): string {
    return 'The race has not started yet.';
  }
}

/**
 * Error thrown when attempting to move a horse that has already finished.
 */
export class HorseAlreadyFinishedError extends OperationalError {
  readonly code = 'HORSE_ALREADY_FINISHED' as const;
  readonly httpStatus = 400;

  constructor(readonly horseId: RunningHorseId) {
    super(`Horse ${horseId} has already finished the race`);
  }

  get userMessage(): string {
    return 'This horse has already finished the race.';
  }
}

/**
 * Error thrown when a race is not found at the specified index.
 */
export class RaceNotFoundError extends OperationalError {
  readonly code = 'RACE_NOT_FOUND' as const;
  readonly httpStatus = 404;

  constructor(readonly index: number) {
    super(`Race not found at index ${index}`);
  }

  get userMessage(): string {
    return `Race at position ${this.index + 1} not found.`;
  }
}

/**
 * Error thrown when trying to create a race with no horses.
 */
export class NoHorsesError extends OperationalError {
  readonly code = 'NO_HORSES' as const;
  readonly httpStatus = 400;

  constructor() {
    super('Cannot create a race with no horses');
  }

  get userMessage(): string {
    return 'A race must have at least one horse.';
  }
}

/**
 * Union type of all race-related errors.
 */
export type RaceError =
  | RaceAlreadyFinishedError
  | RaceNotStartedError
  | HorseAlreadyFinishedError
  | RaceNotFoundError
  | NoHorsesError;
