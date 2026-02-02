import { Result, ok, err } from '@/shared/Result';
import { ValidationError } from '@/domain/errors/ValidationError';

/**
 * Regular expression for validating RGB color format: rgb(r,g,b)
 * Values must be 0-255
 */
const RGB_REGEX = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i;

/**
 * Regular expression for validating hex color format: #rrggbb or #rgb
 */
const HEX_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Value object representing a horse's color.
 * Accepts RGB format rgb(r,g,b) or hex format #rrggbb/#rgb.
 * Internally normalizes to hex format.
 */
export class HorseColor {
  private constructor(private readonly _value: string) {
    Object.freeze(this);
  }

  /**
   * Creates a HorseColor from a color string.
   * Validates that the value is a valid RGB or hex color.
   *
   * @param value - The color in rgb(r,g,b) or #rrggbb/#rgb format
   * @returns Ok<HorseColor> if valid, Err<ValidationError> if invalid
   */
  static create(value: string): Result<HorseColor, ValidationError> {
    const trimmed = value.trim();

    // Try RGB format
    const rgbMatch = trimmed.match(RGB_REGEX);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch;
      const rNum = parseInt(r, 10);
      const gNum = parseInt(g, 10);
      const bNum = parseInt(b, 10);

      if (rNum > 255 || gNum > 255 || bNum > 255) {
        return err(
          new ValidationError('color', 'RGB values must be between 0 and 255')
        );
      }

      // Normalize to hex
      const hex = `#${rNum.toString(16).padStart(2, '0')}${gNum.toString(16).padStart(2, '0')}${bNum.toString(16).padStart(2, '0')}`;
      return ok(new HorseColor(hex.toLowerCase()));
    }

    // Try hex format
    const hexMatch = trimmed.match(HEX_REGEX);
    if (hexMatch) {
      let hex = hexMatch[1];
      // Expand shorthand #rgb to #rrggbb
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      return ok(new HorseColor(`#${hex.toLowerCase()}`));
    }

    return err(
      new ValidationError(
        'color',
        'must be in rgb(r,g,b) or #rrggbb/#rgb format'
      )
    );
  }

  /**
   * Creates a HorseColor without validation.
   * Use only when reconstituting from trusted sources.
   * Assumes value is already in normalized hex format.
   */
  static reconstitute(value: string): HorseColor {
    return new HorseColor(value);
  }

  /**
   * The color value in normalized hex format (#rrggbb).
   */
  get value(): string {
    return this._value;
  }

  /**
   * Returns the color as an RGB object.
   */
  get rgb(): { r: number; g: number; b: number } {
    const hex = this._value.slice(1);
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }

  /**
   * Returns the color in rgb(r,g,b) format.
   */
  get rgbString(): string {
    const { r, g, b } = this.rgb;
    return `rgb(${r},${g},${b})`;
  }

  /**
   * Checks equality with another HorseColor.
   */
  equals(other: HorseColor): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  toJSON(): string {
    return this._value;
  }
}
