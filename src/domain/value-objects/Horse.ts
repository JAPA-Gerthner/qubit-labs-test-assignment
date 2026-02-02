import { Result, ok, err, combine } from '@/shared/Result';
import { ValidationError } from '@/domain/errors/ValidationError';
import { HorseId, createHorseId } from './HorseId';
import { HorseName } from './HorseName';
import { HorseColor } from './HorseColor';
import { Condition } from './Condition';

/**
 * Props for creating a Horse value object.
 */
export interface HorseProps {
  id: string;
  name: string;
  color: string;
  condition: number;
}

/**
 * Composite value object representing a horse with all its attributes.
 * Combines HorseId, HorseName, HorseColor, and Condition.
 */
export class Horse {
  private constructor(
    private readonly _id: HorseId,
    private readonly _name: HorseName,
    private readonly _color: HorseColor,
    private readonly _condition: Condition
  ) {
    Object.freeze(this);
  }

  /**
   * Creates a Horse from raw props.
   * Validates all component value objects.
   *
   * @param props - The raw horse properties
   * @returns Ok<Horse> if all valid, Err<ValidationError> with first error if invalid
   */
  static create(props: HorseProps): Result<Horse, ValidationError> {
    // Validate ID
    let id: HorseId;
    try {
      id = createHorseId(props.id);
    } catch (e) {
      return err(new ValidationError('id', 'must be a valid UUID'));
    }

    // Validate all value objects
    const nameResult = HorseName.create(props.name);
    const colorResult = HorseColor.create(props.color);
    const conditionResult = Condition.create(props.condition);

    // Combine results - returns first error if any
    const combined = combine([nameResult, colorResult, conditionResult]);
    if (!combined.isOk()) {
      return err(combined.error);
    }

    const [name, color, condition] = combined.value;
    return ok(new Horse(id, name, color, condition));
  }

  /**
   * Creates a Horse without validation.
   * Use only when reconstituting from trusted sources.
   */
  static reconstitute(
    id: HorseId,
    name: HorseName,
    color: HorseColor,
    condition: Condition
  ): Horse {
    return new Horse(id, name, color, condition);
  }

  /**
   * The horse's unique identifier.
   */
  get id(): HorseId {
    return this._id;
  }

  /**
   * The horse's name.
   */
  get name(): HorseName {
    return this._name;
  }

  /**
   * The horse's color.
   */
  get color(): HorseColor {
    return this._color;
  }

  /**
   * The horse's current condition.
   */
  get condition(): Condition {
    return this._condition;
  }

  /**
   * Creates a new Horse with updated condition.
   * Returns a new immutable instance.
   */
  withCondition(newCondition: Condition): Horse {
    return new Horse(this._id, this._name, this._color, newCondition);
  }

  /**
   * Checks equality with another Horse (by ID).
   */
  equals(other: Horse): boolean {
    return this._id === other._id;
  }

  /**
   * Checks if all properties are equal.
   */
  deepEquals(other: Horse): boolean {
    return (
      this._id === other._id &&
      this._name.equals(other._name) &&
      this._color.equals(other._color) &&
      this._condition.equals(other._condition)
    );
  }

  toString(): string {
    return `${this._name.value} (${this._condition.label})`;
  }

  toJSON(): HorseProps {
    return {
      id: this._id,
      name: this._name.value,
      color: this._color.value,
      condition: this._condition.value,
    };
  }
}
