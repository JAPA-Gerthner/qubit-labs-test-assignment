import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AggregateRoot } from '../AggregateRoot';
import { BaseDomainEvent, DomainEvent } from '@/domain/events/DomainEvent';

// Test event for the aggregate
class TestEvent extends BaseDomainEvent {
  readonly eventType = 'TestEvent' as const;
  readonly aggregateType = 'TestAggregate' as const;

  constructor(aggregateId: string) {
    super(aggregateId);
    this.freeze();
  }
}

// Concrete implementation for testing
class TestAggregate extends AggregateRoot<string> {
  constructor(id: string) {
    super(id);
  }

  // Expose protected method for testing
  raiseEvent(event: DomainEvent): void {
    this.addDomainEvent(event);
  }
}

describe('AggregateRoot', () => {
  const mockUUID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(mockUUID);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should store the id', () => {
      const aggregate = new TestAggregate('test-id-123');
      expect(aggregate.id).toBe('test-id-123');
    });

    it('should initialize with empty domain events', () => {
      const aggregate = new TestAggregate('test-id');
      expect(aggregate.domainEvents).toEqual([]);
    });
  });

  describe('addDomainEvent', () => {
    it('should add event to domain events array', () => {
      const aggregate = new TestAggregate('test-id');
      const event = new TestEvent('test-id');

      aggregate.raiseEvent(event);

      expect(aggregate.domainEvents).toHaveLength(1);
      expect(aggregate.domainEvents[0]).toBe(event);
    });

    it('should accumulate multiple events', () => {
      const aggregate = new TestAggregate('test-id');
      const event1 = new TestEvent('test-id');
      const event2 = new TestEvent('test-id');
      const event3 = new TestEvent('test-id');

      aggregate.raiseEvent(event1);
      aggregate.raiseEvent(event2);
      aggregate.raiseEvent(event3);

      expect(aggregate.domainEvents).toHaveLength(3);
    });
  });

  describe('domainEvents getter', () => {
    it('should return readonly array', () => {
      const aggregate = new TestAggregate('test-id');
      const events = aggregate.domainEvents;

      // ReadonlyArray doesn't have push method
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBe(0);
    });
  });

  describe('clearDomainEvents', () => {
    it('should return all events', () => {
      const aggregate = new TestAggregate('test-id');
      const event1 = new TestEvent('test-id');
      const event2 = new TestEvent('test-id');

      aggregate.raiseEvent(event1);
      aggregate.raiseEvent(event2);

      const cleared = aggregate.clearDomainEvents();

      expect(cleared).toHaveLength(2);
      expect(cleared[0]).toBe(event1);
      expect(cleared[1]).toBe(event2);
    });

    it('should clear the internal array', () => {
      const aggregate = new TestAggregate('test-id');
      const event = new TestEvent('test-id');

      aggregate.raiseEvent(event);
      aggregate.clearDomainEvents();

      expect(aggregate.domainEvents).toHaveLength(0);
    });

    it('should return empty array when no events', () => {
      const aggregate = new TestAggregate('test-id');
      const cleared = aggregate.clearDomainEvents();

      expect(cleared).toEqual([]);
    });
  });

  describe('hasDomainEvents', () => {
    it('should return false when no events', () => {
      const aggregate = new TestAggregate('test-id');
      expect(aggregate.hasDomainEvents()).toBe(false);
    });

    it('should return true when events exist', () => {
      const aggregate = new TestAggregate('test-id');
      aggregate.raiseEvent(new TestEvent('test-id'));
      expect(aggregate.hasDomainEvents()).toBe(true);
    });

    it('should return false after clearing events', () => {
      const aggregate = new TestAggregate('test-id');
      aggregate.raiseEvent(new TestEvent('test-id'));
      aggregate.clearDomainEvents();
      expect(aggregate.hasDomainEvents()).toBe(false);
    });
  });
});
