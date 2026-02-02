import { Result, ok, err } from '@/shared/Result';
import { ValidationError } from '@/domain/errors/ValidationError';

/**
 * Value object representing a horse's condition (fitness level).
 * Valid range: 1-100 (integer)
 *
 * Higher condition = faster horse (more distance per turn).
 */
export class Condition {
  private constructor(private readonly _value: number) {
    Object.freeze(this);
  }

  /**
   * Creates a Condition from a number.
   * Validates that the value is an integer between 1 and 100.
   *
   * @param value - The condition value (1-100)
   * @returns Ok<Condition> if valid, Err<ValidationError> if invalid
   */
  static create(value: number): Result<Condition, ValidationError> {
    if (!Number.isInteger(value)) {
      return err(new ValidationError('condition', 'must be an integer'));
    }

    if (value < 1) {
      return err(new ValidationError('condition', 'must be at least 1'));
    }

    if (value > 100) {
      return err(new ValidationError('condition', 'must be at most 100'));
    }

    return ok(new Condition(value));
  }

  /**
   * Creates a Condition without validation.
   * Use only when reconstituting from trusted sources.
   */
  static reconstitute(value: number): Condition {
    return new Condition(value);
  }

  /**
   * The numeric condition value (1-100).
   */
  get value(): number {
    return this._value;
  }

  /**
   * Checks equality with another Condition.
   */
  equals(other: Condition): boolean {
    return this._value === other._value;
  }

  /**
   * Returns true if this condition is better than the other.
   */
  isBetterThan(other: Condition): boolean {
    return this._value > other._value;
  }

  /**
   * Returns a descriptive label for the condition.
   */
  get label(): string {
    if (this._value >= 90) return 'Excellent';
    if (this._value >= 70) return 'Good';
    if (this._value >= 50) return 'Average';
    if (this._value >= 30) return 'Poor';
    return 'Very Poor';
  }

  toString(): string {
    return String(this._value);
  }

  toJSON(): number {
    return this._value;
  }
}
