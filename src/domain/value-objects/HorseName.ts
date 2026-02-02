import { Result, ok, err } from '@/shared/Result';
import { ValidationError } from '@/domain/errors/ValidationError';

/**
 * Minimum length for a horse name.
 */
const MIN_LENGTH = 2;

/**
 * Maximum length for a horse name.
 */
const MAX_LENGTH = 30;

/**
 * Regular expression for valid horse name characters.
 * Allows letters, numbers, spaces, hyphens, and apostrophes.
 */
const NAME_PATTERN = /^[a-zA-Z0-9\s\-']+$/;

/**
 * Value object representing a horse's name.
 * Validates length and character constraints.
 */
export class HorseName {
  private constructor(private readonly _value: string) {
    Object.freeze(this);
  }

  /**
   * Creates a HorseName from a string.
   * Validates length and allowed characters.
   *
   * @param value - The horse name
   * @returns Ok<HorseName> if valid, Err<ValidationError> if invalid
   */
  static create(value: string): Result<HorseName, ValidationError> {
    const trimmed = value.trim();

    if (trimmed.length < MIN_LENGTH) {
      return err(
        new ValidationError('name', `must be at least ${MIN_LENGTH} characters`)
      );
    }

    if (trimmed.length > MAX_LENGTH) {
      return err(
        new ValidationError('name', `must be at most ${MAX_LENGTH} characters`)
      );
    }

    if (!NAME_PATTERN.test(trimmed)) {
      return err(
        new ValidationError(
          'name',
          'can only contain letters, numbers, spaces, hyphens, and apostrophes'
        )
      );
    }

    return ok(new HorseName(trimmed));
  }

  /**
   * Creates a HorseName without validation.
   * Use only when reconstituting from trusted sources.
   */
  static reconstitute(value: string): HorseName {
    return new HorseName(value);
  }

  /**
   * The name value.
   */
  get value(): string {
    return this._value;
  }

  /**
   * The length of the name.
   */
  get length(): number {
    return this._value.length;
  }

  /**
   * Checks equality with another HorseName.
   */
  equals(other: HorseName): boolean {
    return this._value === other._value;
  }

  /**
   * Checks equality ignoring case.
   */
  equalsIgnoreCase(other: HorseName): boolean {
    return this._value.toLowerCase() === other._value.toLowerCase();
  }

  toString(): string {
    return this._value;
  }

  toJSON(): string {
    return this._value;
  }
}
