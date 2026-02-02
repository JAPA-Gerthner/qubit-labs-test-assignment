import { Brand, createIdFactory, isValidUUIDAny } from '@/shared/types/branded';

/**
 * Branded type for Horse identifiers.
 * Prevents accidentally using a RaceId where HorseId is expected.
 */
export type HorseId = Brand<string, 'HorseId'>;

/**
 * Creates a HorseId from a string.
 * Validates that the string is a valid UUID.
 *
 * @throws Error if the id is not a valid UUID
 */
export const createHorseId = createIdFactory('HorseId', isValidUUIDAny);

/**
 * Creates a HorseId without validation.
 * Use only when reconstituting from trusted sources (e.g., database).
 */
export const unsafeCreateHorseId = (id: string): HorseId => id as HorseId;
