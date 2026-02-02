// Branded ID types
export { HorseId, createHorseId, unsafeCreateHorseId } from './HorseId';
export { RaceId, createRaceId, unsafeCreateRaceId } from './RaceId';
export {
  RunningHorseId,
  createRunningHorseId,
  unsafeCreateRunningHorseId,
} from './RunningHorseId';

// Simple value objects
export { Condition } from './Condition';
export { Distance, VALID_DISTANCES, ValidDistance } from './Distance';
export { HorseColor } from './HorseColor';
export { HorseName } from './HorseName';

// Composite value objects
export { Horse, HorseProps } from './Horse';
