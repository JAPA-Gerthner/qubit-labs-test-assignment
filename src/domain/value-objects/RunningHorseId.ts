import { Brand, createIdFactory, isValidUUIDAny } from '@/shared/types/branded';

/**
 * Branded type for RunningHorse identifiers.
 * Represents a horse participating in a specific race.
 */
export type RunningHorseId = Brand<string, 'RunningHorseId'>;

/**
 * Creates a RunningHorseId from a string.
 * Validates that the string is a valid UUID.
 *
 * @throws Error if the id is not a valid UUID
 */
export const createRunningHorseId = createIdFactory('RunningHorseId', isValidUUIDAny);

/**
 * Creates a RunningHorseId without validation.
 * Use only when reconstituting from trusted sources (e.g., database).
 */
export const unsafeCreateRunningHorseId = (id: string): RunningHorseId => id as RunningHorseId;
