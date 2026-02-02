/**
 * Branded types for type-safe identifiers.
 * Prevents accidentally passing HorseId where RaceId is expected.
 */

declare const brand: unique symbol;

/**
 * Creates a branded type that is assignable from T but not interchangeable
 * with other branded types of the same base type.
 *
 * @example
 * type UserId = Brand<string, 'UserId'>;
 * type OrderId = Brand<string, 'OrderId'>;
 *
 * const userId: UserId = 'abc' as UserId;
 * const orderId: OrderId = userId; // Error: Type 'UserId' is not assignable to 'OrderId'
 */
export type Brand<T, TBrand extends string> = T & { readonly [brand]: TBrand };

/**
 * Creates a factory function for branded IDs with optional validation.
 *
 * @param brandName - Name of the brand (for error messages)
 * @param validator - Optional validation function
 * @returns Factory function that creates branded IDs
 *
 * @example
 * const createUserId = createIdFactory('UserId', isValidUUID);
 * const userId = createUserId('550e8400-e29b-41d4-a716-446655440000');
 */
export function createIdFactory<TBrand extends string>(
  brandName: TBrand,
  validator?: (id: string) => boolean
): (id: string) => Brand<string, TBrand> {
  return (id: string): Brand<string, TBrand> => {
    if (validator && !validator(id)) {
      throw new Error(`Invalid ${brandName}: ${id}`);
    }
    return id as Brand<string, TBrand>;
  };
}

/**
 * Validates that a string is a valid UUID v4.
 */
export const isValidUUID = (id: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

/**
 * Validates that a string is a valid UUID (any version).
 */
export const isValidUUIDAny = (id: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/**
 * Type guard to check if a value is a branded type.
 * Note: At runtime, branded types are just their base type.
 * This is mainly useful for documentation purposes.
 */
export function isBranded<T, B extends string>(
  value: unknown,
  validator: (v: unknown) => v is T
): value is Brand<T, B> {
  return validator(value);
}
