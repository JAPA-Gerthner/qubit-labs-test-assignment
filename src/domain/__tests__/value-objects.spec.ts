import { describe, it, expect } from 'vitest';
import {
  Condition,
  Distance,
  VALID_DISTANCES,
  HorseColor,
  HorseName,
  Horse,
  createHorseId,
  createRaceId,
  createRunningHorseId,
  unsafeCreateHorseId,
  unsafeCreateRaceId,
  unsafeCreateRunningHorseId,
} from '../value-objects';
import { ValidationError } from '../errors/ValidationError';

describe('Domain Value Objects', () => {
  describe('Branded ID Types', () => {
    const validUUID = '550e8400-e29b-41d4-a716-446655440000';
    const invalidUUID = 'not-a-uuid';

    describe('HorseId', () => {
      it('should create valid HorseId from UUID', () => {
        const id = createHorseId(validUUID);
        expect(id).toBe(validUUID);
      });

      it('should throw for invalid UUID', () => {
        expect(() => createHorseId(invalidUUID)).toThrow('HorseId');
      });

      it('should create unsafe HorseId without validation', () => {
        const id = unsafeCreateHorseId(invalidUUID);
        expect(id).toBe(invalidUUID);
      });
    });

    describe('RaceId', () => {
      it('should create valid RaceId from UUID', () => {
        const id = createRaceId(validUUID);
        expect(id).toBe(validUUID);
      });

      it('should throw for invalid UUID', () => {
        expect(() => createRaceId(invalidUUID)).toThrow('RaceId');
      });

      it('should create unsafe RaceId without validation', () => {
        const id = unsafeCreateRaceId(invalidUUID);
        expect(id).toBe(invalidUUID);
      });
    });

    describe('RunningHorseId', () => {
      it('should create valid RunningHorseId from UUID', () => {
        const id = createRunningHorseId(validUUID);
        expect(id).toBe(validUUID);
      });

      it('should throw for invalid UUID', () => {
        expect(() => createRunningHorseId(invalidUUID)).toThrow('RunningHorseId');
      });

      it('should create unsafe RunningHorseId without validation', () => {
        const id = unsafeCreateRunningHorseId(invalidUUID);
        expect(id).toBe(invalidUUID);
      });
    });
  });

  describe('Condition', () => {
    describe('create', () => {
      it('should create valid condition at minimum value', () => {
        const result = Condition.create(1);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap().value).toBe(1);
      });

      it('should create valid condition at maximum value', () => {
        const result = Condition.create(100);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap().value).toBe(100);
      });

      it('should create valid condition at mid-range', () => {
        const result = Condition.create(50);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap().value).toBe(50);
      });

      it('should reject non-integer values', () => {
        const result = Condition.create(50.5);
        expect(result.isErr()).toBe(true);
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.field).toBe('condition');
      });

      it('should reject values below minimum', () => {
        const result = Condition.create(0);
        expect(result.isErr()).toBe(true);
        expect(result.error).toBeInstanceOf(ValidationError);
      });

      it('should reject values above maximum', () => {
        const result = Condition.create(101);
        expect(result.isErr()).toBe(true);
        expect(result.error).toBeInstanceOf(ValidationError);
      });

      it('should reject negative values', () => {
        const result = Condition.create(-5);
        expect(result.isErr()).toBe(true);
      });
    });

    describe('reconstitute', () => {
      it('should create without validation', () => {
        const condition = Condition.reconstitute(150);
        expect(condition.value).toBe(150);
      });
    });

    describe('methods', () => {
      it('should check equality', () => {
        const a = Condition.reconstitute(50);
        const b = Condition.reconstitute(50);
        const c = Condition.reconstitute(60);

        expect(a.equals(b)).toBe(true);
        expect(a.equals(c)).toBe(false);
      });

      it('should compare with isBetterThan', () => {
        const high = Condition.reconstitute(80);
        const low = Condition.reconstitute(40);

        expect(high.isBetterThan(low)).toBe(true);
        expect(low.isBetterThan(high)).toBe(false);
      });

      it('should return correct labels', () => {
        expect(Condition.reconstitute(95).label).toBe('Excellent');
        expect(Condition.reconstitute(75).label).toBe('Good');
        expect(Condition.reconstitute(55).label).toBe('Average');
        expect(Condition.reconstitute(35).label).toBe('Poor');
        expect(Condition.reconstitute(15).label).toBe('Very Poor');
      });

      it('should convert to string and JSON', () => {
        const condition = Condition.reconstitute(75);
        expect(condition.toString()).toBe('75');
        expect(condition.toJSON()).toBe(75);
      });
    });
  });

  describe('Distance', () => {
    describe('create', () => {
      it.each(VALID_DISTANCES)('should create valid distance %d', (meters) => {
        const result = Distance.create(meters);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap().value).toBe(meters);
      });

      it('should reject invalid distance', () => {
        const result = Distance.create(1500);
        expect(result.isErr()).toBe(true);
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.field).toBe('distance');
      });

      it('should reject negative distance', () => {
        const result = Distance.create(-1200);
        expect(result.isErr()).toBe(true);
      });
    });

    describe('static getters', () => {
      it('should return shortest distance', () => {
        expect(Distance.shortest.value).toBe(1200);
      });

      it('should return longest distance', () => {
        expect(Distance.longest.value).toBe(2200);
      });
    });

    describe('methods', () => {
      it('should return meters and kilometers', () => {
        const distance = Distance.reconstitute(1600);
        expect(distance.meters).toBe(1600);
        expect(distance.kilometers).toBe(1.6);
      });

      it('should check equality', () => {
        const a = Distance.reconstitute(1600);
        const b = Distance.reconstitute(1600);
        const c = Distance.reconstitute(2000);

        expect(a.equals(b)).toBe(true);
        expect(a.equals(c)).toBe(false);
      });

      it('should compare distances', () => {
        const short = Distance.reconstitute(1200);
        const long = Distance.reconstitute(2200);

        expect(long.isLongerThan(short)).toBe(true);
        expect(short.isShorterThan(long)).toBe(true);
        expect(short.isLongerThan(long)).toBe(false);
      });

      it('should return correct labels', () => {
        expect(Distance.reconstitute(1200).label).toBe('Sprint');
        expect(Distance.reconstitute(1400).label).toBe('Sprint');
        expect(Distance.reconstitute(1600).label).toBe('Middle Distance');
        expect(Distance.reconstitute(1800).label).toBe('Middle Distance');
        expect(Distance.reconstitute(2000).label).toBe('Long Distance');
        expect(Distance.reconstitute(2200).label).toBe('Long Distance');
      });

      it('should convert to string and JSON', () => {
        const distance = Distance.reconstitute(1600);
        expect(distance.toString()).toBe('1600m');
        expect(distance.toJSON()).toBe(1600);
      });
    });
  });

  describe('HorseColor', () => {
    describe('create with hex format', () => {
      it('should accept 6-digit hex color', () => {
        const result = HorseColor.create('#ff5500');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap().value).toBe('#ff5500');
      });

      it('should accept 3-digit hex color and expand it', () => {
        const result = HorseColor.create('#f50');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap().value).toBe('#ff5500');
      });

      it('should normalize to lowercase', () => {
        const result = HorseColor.create('#FF5500');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap().value).toBe('#ff5500');
      });

      it('should trim whitespace', () => {
        const result = HorseColor.create('  #ff5500  ');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap().value).toBe('#ff5500');
      });
    });

    describe('create with RGB format', () => {
      it('should accept valid RGB color', () => {
        const result = HorseColor.create('rgb(255, 85, 0)');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap().value).toBe('#ff5500');
      });

      it('should accept RGB without spaces', () => {
        const result = HorseColor.create('rgb(255,85,0)');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap().value).toBe('#ff5500');
      });

      it('should reject RGB values over 255', () => {
        const result = HorseColor.create('rgb(256, 0, 0)');
        expect(result.isErr()).toBe(true);
        expect(result.error).toBeInstanceOf(ValidationError);
      });
    });

    describe('invalid colors', () => {
      it('should reject invalid format', () => {
        const result = HorseColor.create('red');
        expect(result.isErr()).toBe(true);
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.field).toBe('color');
      });

      it('should reject invalid hex', () => {
        const result = HorseColor.create('#gggggg');
        expect(result.isErr()).toBe(true);
      });
    });

    describe('methods', () => {
      it('should return RGB object', () => {
        const color = HorseColor.reconstitute('#ff5500');
        expect(color.rgb).toEqual({ r: 255, g: 85, b: 0 });
      });

      it('should return RGB string', () => {
        const color = HorseColor.reconstitute('#ff5500');
        expect(color.rgbString).toBe('rgb(255,85,0)');
      });

      it('should check equality', () => {
        const a = HorseColor.reconstitute('#ff5500');
        const b = HorseColor.reconstitute('#ff5500');
        const c = HorseColor.reconstitute('#00ff00');

        expect(a.equals(b)).toBe(true);
        expect(a.equals(c)).toBe(false);
      });

      it('should convert to string and JSON', () => {
        const color = HorseColor.reconstitute('#ff5500');
        expect(color.toString()).toBe('#ff5500');
        expect(color.toJSON()).toBe('#ff5500');
      });
    });
  });

  describe('HorseName', () => {
    describe('create', () => {
      it('should accept valid name', () => {
        const result = HorseName.create('Thunder Bolt');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap().value).toBe('Thunder Bolt');
      });

      it('should accept name with hyphen', () => {
        const result = HorseName.create('War-Horse');
        expect(result.isOk()).toBe(true);
      });

      it('should accept name with apostrophe', () => {
        const result = HorseName.create("O'Brien");
        expect(result.isOk()).toBe(true);
      });

      it('should accept name with numbers', () => {
        const result = HorseName.create('Spirit 2');
        expect(result.isOk()).toBe(true);
      });

      it('should trim whitespace', () => {
        const result = HorseName.create('  Thunder  ');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap().value).toBe('Thunder');
      });

      it('should reject name too short', () => {
        const result = HorseName.create('A');
        expect(result.isErr()).toBe(true);
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.field).toBe('name');
      });

      it('should reject name too long', () => {
        const result = HorseName.create('A'.repeat(31));
        expect(result.isErr()).toBe(true);
      });

      it('should reject name with invalid characters', () => {
        const result = HorseName.create('Thunder!@#');
        expect(result.isErr()).toBe(true);
      });
    });

    describe('methods', () => {
      it('should return length', () => {
        const name = HorseName.reconstitute('Thunder');
        expect(name.length).toBe(7);
      });

      it('should check equality', () => {
        const a = HorseName.reconstitute('Thunder');
        const b = HorseName.reconstitute('Thunder');
        const c = HorseName.reconstitute('Lightning');

        expect(a.equals(b)).toBe(true);
        expect(a.equals(c)).toBe(false);
      });

      it('should check case-insensitive equality', () => {
        const a = HorseName.reconstitute('Thunder');
        const b = HorseName.reconstitute('THUNDER');

        expect(a.equals(b)).toBe(false);
        expect(a.equalsIgnoreCase(b)).toBe(true);
      });

      it('should convert to string and JSON', () => {
        const name = HorseName.reconstitute('Thunder');
        expect(name.toString()).toBe('Thunder');
        expect(name.toJSON()).toBe('Thunder');
      });
    });
  });

  describe('Horse (composite)', () => {
    const validProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Thunder Bolt',
      color: '#ff5500',
      condition: 85,
    };

    describe('create', () => {
      it('should create valid horse', () => {
        const result = Horse.create(validProps);
        expect(result.isOk()).toBe(true);

        const horse = result.unwrap();
        expect(horse.id).toBe(validProps.id);
        expect(horse.name.value).toBe(validProps.name);
        expect(horse.color.value).toBe(validProps.color);
        expect(horse.condition.value).toBe(validProps.condition);
      });

      it('should reject invalid id', () => {
        const result = Horse.create({ ...validProps, id: 'invalid' });
        expect(result.isErr()).toBe(true);
        expect(result.error.field).toBe('id');
      });

      it('should reject invalid name', () => {
        const result = Horse.create({ ...validProps, name: 'X' });
        expect(result.isErr()).toBe(true);
        expect(result.error.field).toBe('name');
      });

      it('should reject invalid color', () => {
        const result = Horse.create({ ...validProps, color: 'invalid' });
        expect(result.isErr()).toBe(true);
        expect(result.error.field).toBe('color');
      });

      it('should reject invalid condition', () => {
        const result = Horse.create({ ...validProps, condition: 150 });
        expect(result.isErr()).toBe(true);
        expect(result.error.field).toBe('condition');
      });
    });

    describe('reconstitute', () => {
      it('should create from value objects', () => {
        const id = createHorseId(validProps.id);
        const name = HorseName.reconstitute(validProps.name);
        const color = HorseColor.reconstitute(validProps.color);
        const condition = Condition.reconstitute(validProps.condition);

        const horse = Horse.reconstitute(id, name, color, condition);
        expect(horse.id).toBe(id);
        expect(horse.name).toBe(name);
      });
    });

    describe('methods', () => {
      it('should create new horse with updated condition', () => {
        const horse = Horse.create(validProps).unwrap();
        const newCondition = Condition.reconstitute(95);
        const updated = horse.withCondition(newCondition);

        expect(updated.condition.value).toBe(95);
        expect(horse.condition.value).toBe(85); // Original unchanged
        expect(updated.id).toBe(horse.id);
        expect(updated.name.equals(horse.name)).toBe(true);
      });

      it('should check equality by ID', () => {
        const horse1 = Horse.create(validProps).unwrap();
        const horse2 = Horse.create(validProps).unwrap();
        const horse3 = Horse.create({
          ...validProps,
          id: '550e8400-e29b-41d4-a716-446655440001',
        }).unwrap();

        expect(horse1.equals(horse2)).toBe(true);
        expect(horse1.equals(horse3)).toBe(false);
      });

      it('should check deep equality', () => {
        const horse1 = Horse.create(validProps).unwrap();
        const horse2 = Horse.create(validProps).unwrap();
        const horse3 = Horse.create({ ...validProps, condition: 90 }).unwrap();

        expect(horse1.deepEquals(horse2)).toBe(true);
        expect(horse1.deepEquals(horse3)).toBe(false);
      });

      it('should convert to string', () => {
        const horse = Horse.create(validProps).unwrap();
        expect(horse.toString()).toBe('Thunder Bolt (Good)');
      });

      it('should convert to JSON', () => {
        const horse = Horse.create(validProps).unwrap();
        expect(horse.toJSON()).toEqual(validProps);
      });
    });
  });
});
