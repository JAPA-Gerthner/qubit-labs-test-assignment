// Value Objects
export {
  HorseId,
  createHorseId,
  unsafeCreateHorseId,
  RaceId,
  createRaceId,
  unsafeCreateRaceId,
  RunningHorseId,
  createRunningHorseId,
  unsafeCreateRunningHorseId,
  Condition,
  Distance,
  VALID_DISTANCES,
  ValidDistance,
  HorseColor,
  HorseName,
  Horse,
  HorseProps,
} from './value-objects';

// Entities
export { AggregateRoot, RunningHorse, Race } from './entities';

// Events
export {
  DomainEvent,
  BaseDomainEvent,
  RaceStarted,
  TurnCompleted,
  HorseFinished,
  RaceFinished,
  RaceEvent,
  HorsePosition,
  RaceResult,
} from './events';

// Errors
export {
  ValidationError,
  ValidationErrors,
  RaceAlreadyFinishedError,
  RaceNotStartedError,
  HorseAlreadyFinishedError,
  RaceNotFoundError,
  NoHorsesError,
  RaceError,
} from './errors';
