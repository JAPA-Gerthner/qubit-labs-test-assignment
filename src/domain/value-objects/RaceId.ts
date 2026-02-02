import { Brand, createIdFactory, isValidUUIDAny } from '@/shared/types/branded';

/**
 * Branded type for Race identifiers.
 * Prevents accidentally using a HorseId where RaceId is expected.
 */
export type RaceId = Brand<string, 'RaceId'>;

/**
 * Creates a RaceId from a string.
 * Validates that the string is a valid UUID.
 *
 * @throws Error if the id is not a valid UUID
 */
export const createRaceId = createIdFactory('RaceId', isValidUUIDAny);

/**
 * Creates a RaceId without validation.
 * Use only when reconstituting from trusted sources (e.g., database).
 */
export const unsafeCreateRaceId = (id: string): RaceId => id as RaceId;
