import { Result, ok, err } from '@/shared/Result';
import { ValidationError } from '@/domain/errors/ValidationError';

/**
 * Valid race distances in meters.
 */
export const VALID_DISTANCES = [1200, 1400, 1600, 1800, 2000, 2200] as const;

/**
 * Type representing valid distance values.
 */
export type ValidDistance = (typeof VALID_DISTANCES)[number];

/**
 * Value object representing a race distance.
 * Only allows predefined valid distances.
 */
export class Distance {
  private constructor(private readonly _value: ValidDistance) {
    Object.freeze(this);
  }

  /**
   * Creates a Distance from a number.
   * Validates that the value is one of the predefined distances.
   *
   * @param value - The distance in meters
   * @returns Ok<Distance> if valid, Err<ValidationError> if invalid
   */
  static create(value: number): Result<Distance, ValidationError> {
    if (!VALID_DISTANCES.includes(value as ValidDistance)) {
      return err(
        new ValidationError('distance', `must be one of: ${VALID_DISTANCES.join(', ')} meters`)
      );
    }

    return ok(new Distance(value as ValidDistance));
  }

  /**
   * Creates a Distance without validation.
   * Use only when reconstituting from trusted sources.
   */
  static reconstitute(value: ValidDistance): Distance {
    return new Distance(value);
  }

  /**
   * Returns the shortest valid distance.
   */
  static get shortest(): Distance {
    return new Distance(VALID_DISTANCES[0]);
  }

  /**
   * Returns the longest valid distance.
   */
  static get longest(): Distance {
    return new Distance(VALID_DISTANCES[VALID_DISTANCES.length - 1]);
  }

  /**
   * The distance value in meters.
   */
  get value(): ValidDistance {
    return this._value;
  }

  /**
   * Alias for value - distance in meters.
   */
  get meters(): number {
    return this._value;
  }

  /**
   * Distance in kilometers.
   */
  get kilometers(): number {
    return this._value / 1000;
  }

  /**
   * Checks equality with another Distance.
   */
  equals(other: Distance): boolean {
    return this._value === other._value;
  }

  /**
   * Returns true if this distance is longer than the other.
   */
  isLongerThan(other: Distance): boolean {
    return this._value > other._value;
  }

  /**
   * Returns true if this distance is shorter than the other.
   */
  isShorterThan(other: Distance): boolean {
    return this._value < other._value;
  }

  /**
   * Returns a descriptive label for the distance.
   */
  get label(): string {
    if (this._value <= 1400) return 'Sprint';
    if (this._value <= 1800) return 'Middle Distance';
    return 'Long Distance';
  }

  toString(): string {
    return `${this._value}m`;
  }

  toJSON(): number {
    return this._value;
  }
}
