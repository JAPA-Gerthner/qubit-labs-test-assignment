import { describe, it, expect } from 'vitest';
import { Brand, createIdFactory, isValidUUID, isValidUUIDAny } from '../types/branded';

describe('Branded Types', () => {
  describe('createIdFactory', () => {
    it('should create a branded ID without validation', () => {
      type TestId = Brand<string, 'TestId'>;
      const createTestId = createIdFactory('TestId');

      const id: TestId = createTestId('abc123');

      expect(id).toBe('abc123');
    });

    it('should create a branded ID with passing validation', () => {
      type NumericId = Brand<string, 'NumericId'>;
      const createNumericId = createIdFactory('NumericId', (id) => /^\d+$/.test(id));

      const id: NumericId = createNumericId('12345');

      expect(id).toBe('12345');
    });

    it('should throw error when validation fails', () => {
      type NumericId = Brand<string, 'NumericId'>;
      const createNumericId = createIdFactory('NumericId', (id) => /^\d+$/.test(id));

      expect(() => createNumericId('abc')).toThrow('Invalid NumericId: abc');
    });

    it('should include brand name in error message', () => {
      const createUserId = createIdFactory('UserId', () => false);

      expect(() => createUserId('test')).toThrow('Invalid UserId: test');
    });

    it('should create unique types that are not interchangeable at compile time', () => {
      // This test verifies the type system works as expected
      // The actual runtime values are interchangeable, but TypeScript prevents assignment
      type UserId = Brand<string, 'UserId'>;
      type OrderId = Brand<string, 'OrderId'>;

      const createUserId = createIdFactory('UserId');
      const createOrderId = createIdFactory('OrderId');

      const userId: UserId = createUserId('user-1');
      const orderId: OrderId = createOrderId('order-1');

      // Both should work as strings
      expect(userId.length).toBeGreaterThan(0);
      expect(orderId.length).toBeGreaterThan(0);

      // But they have different brands (verified by type system, not runtime)
      expect(typeof userId).toBe('string');
      expect(typeof orderId).toBe('string');
    });
  });

  describe('isValidUUID', () => {
    it('should return true for valid UUID v4', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
      expect(isValidUUID('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      expect(isValidUUID('')).toBe(false);
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false); // Too short
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000-extra')).toBe(false); // Too long
      expect(isValidUUID('550e8400e29b41d4a716446655440000')).toBe(false); // Missing dashes
      expect(isValidUUID('gggggggg-gggg-gggg-gggg-gggggggggggg')).toBe(false); // Invalid hex
    });

    it('should work with createIdFactory as validator', () => {
      type UUIDId = Brand<string, 'UUIDId'>;
      const createUUIDId = createIdFactory('UUIDId', isValidUUID);

      expect(() => createUUIDId('550e8400-e29b-41d4-a716-446655440000')).not.toThrow();
      expect(() => createUUIDId('not-valid')).toThrow();
    });
  });

  describe('isValidUUIDAny', () => {
    it('should return true for any valid UUID format', () => {
      // v1
      expect(isValidUUIDAny('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
      // v4
      expect(isValidUUIDAny('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      // v5
      expect(isValidUUIDAny('886313e1-3b8a-5372-9b90-0c9aee199e5d')).toBe(true);
    });

    it('should be more lenient than isValidUUID', () => {
      // Some UUIDs that might not pass strict v4 validation
      const uuid = '00000000-0000-0000-0000-000000000000';
      expect(isValidUUIDAny(uuid)).toBe(true);
    });

    it('should return false for invalid strings', () => {
      expect(isValidUUIDAny('')).toBe(false);
      expect(isValidUUIDAny('hello')).toBe(false);
      expect(isValidUUIDAny('123')).toBe(false);
    });
  });

  describe('Brand type behavior', () => {
    it('should allow assignment to base type', () => {
      type UserId = Brand<string, 'UserId'>;
      const createUserId = createIdFactory('UserId');

      const userId: UserId = createUserId('user-123');
      const asString: string = userId; // Should compile

      expect(asString).toBe('user-123');
    });

    it('should work with string methods', () => {
      type UserId = Brand<string, 'UserId'>;
      const createUserId = createIdFactory('UserId');

      const userId = createUserId('USER-123');

      expect(userId.toLowerCase()).toBe('user-123');
      expect(userId.includes('USER')).toBe(true);
      expect(userId.split('-')).toEqual(['USER', '123']);
    });

    it('should work with typeof check', () => {
      type UserId = Brand<string, 'UserId'>;
      const createUserId = createIdFactory('UserId');

      const userId = createUserId('test');

      expect(typeof userId).toBe('string');
    });

    it('should serialize to JSON as string', () => {
      type UserId = Brand<string, 'UserId'>;
      const createUserId = createIdFactory('UserId');

      const userId = createUserId('user-456');
      const json = JSON.stringify({ id: userId });

      expect(json).toBe('{"id":"user-456"}');
    });
  });
});
