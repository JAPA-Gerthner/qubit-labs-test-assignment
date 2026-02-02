import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaseDomainEvent, DomainEvent } from '../DomainEvent';

class TestEvent extends BaseDomainEvent {
  readonly eventType = 'TestEvent' as const;
  readonly aggregateType = 'TestAggregate' as const;

  constructor(
    aggregateId: string,
    readonly testData: string
  ) {
    super(aggregateId);
    this.freeze();
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      testData: this.testData,
    };
  }
}

describe('DomainEvent', () => {
  describe('BaseDomainEvent', () => {
    const mockUUID = '550e8400-e29b-41d4-a716-446655440000';
    const mockDate = new Date('2024-01-15T12:00:00.000Z');

    beforeEach(() => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValue(mockUUID);
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it('should auto-generate eventId', () => {
      const event = new TestEvent('aggregate-1', 'data');
      expect(event.eventId).toBe(mockUUID);
    });

    it('should auto-generate occurredAt timestamp', () => {
      const event = new TestEvent('aggregate-1', 'data');
      expect(event.occurredAt).toEqual(mockDate);
    });

    it('should store aggregateId', () => {
      const event = new TestEvent('aggregate-123', 'data');
      expect(event.aggregateId).toBe('aggregate-123');
    });

    it('should have correct eventType', () => {
      const event = new TestEvent('aggregate-1', 'data');
      expect(event.eventType).toBe('TestEvent');
    });

    it('should have correct aggregateType', () => {
      const event = new TestEvent('aggregate-1', 'data');
      expect(event.aggregateType).toBe('TestAggregate');
    });

    it('should be frozen (immutable)', () => {
      const event = new TestEvent('aggregate-1', 'data');
      expect(Object.isFrozen(event)).toBe(true);
    });

    describe('toJSON', () => {
      it('should serialize base properties', () => {
        const event = new TestEvent('aggregate-1', 'data');
        const json = event.toJSON();

        expect(json).toEqual({
          eventId: mockUUID,
          eventType: 'TestEvent',
          occurredAt: mockDate.toISOString(),
          aggregateId: 'aggregate-1',
          aggregateType: 'TestAggregate',
          testData: 'data',
        });
      });

      it('should include custom properties from subclass', () => {
        const event = new TestEvent('aggregate-1', 'custom-data');
        const json = event.toJSON();

        expect(json.testData).toBe('custom-data');
      });
    });
  });
});
