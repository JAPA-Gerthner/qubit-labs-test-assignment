import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus } from '../EventBus';
import { BaseDomainEvent, DomainEvent } from '@/domain/events/DomainEvent';

// Test events
class TestEventA extends BaseDomainEvent {
  readonly eventType = 'TestEventA' as const;
  readonly aggregateType = 'TestAggregate' as const;

  constructor(aggregateId: string, readonly data: string) {
    super(aggregateId);
    this.freeze();
  }
}

class TestEventB extends BaseDomainEvent {
  readonly eventType = 'TestEventB' as const;
  readonly aggregateType = 'TestAggregate' as const;

  constructor(aggregateId: string) {
    super(aggregateId);
    this.freeze();
  }
}

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('subscribe', () => {
    it('should subscribe to specific event type', async () => {
      const handler = vi.fn();
      eventBus.subscribe('TestEventA', handler);

      const event = new TestEventA('agg-1', 'data');
      await eventBus.publish(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should not call handler for different event type', async () => {
      const handler = vi.fn();
      eventBus.subscribe('TestEventA', handler);

      const event = new TestEventB('agg-1');
      await eventBus.publish(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should return unsubscribe function', async () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.subscribe('TestEventA', handler);

      unsubscribe();

      const event = new TestEventA('agg-1', 'data');
      await eventBus.publish(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow multiple handlers for same event type', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.subscribe('TestEventA', handler1);
      eventBus.subscribe('TestEventA', handler2);

      const event = new TestEventA('agg-1', 'data');
      await eventBus.publish(event);

      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
    });
  });

  describe('subscribeAll', () => {
    it('should receive all event types', async () => {
      const handler = vi.fn();
      eventBus.subscribeAll(handler);

      const eventA = new TestEventA('agg-1', 'data');
      const eventB = new TestEventB('agg-1');

      await eventBus.publish(eventA);
      await eventBus.publish(eventB);

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledWith(eventA);
      expect(handler).toHaveBeenCalledWith(eventB);
    });

    it('should return unsubscribe function', async () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.subscribeAll(handler);

      unsubscribe();

      await eventBus.publish(new TestEventA('agg-1', 'data'));

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('publish', () => {
    it('should call both type-specific and all handlers', async () => {
      const typeHandler = vi.fn();
      const allHandler = vi.fn();

      eventBus.subscribe('TestEventA', typeHandler);
      eventBus.subscribeAll(allHandler);

      const event = new TestEventA('agg-1', 'data');
      await eventBus.publish(event);

      expect(typeHandler).toHaveBeenCalledWith(event);
      expect(allHandler).toHaveBeenCalledWith(event);
    });

    it('should await async handlers', async () => {
      const order: number[] = [];

      eventBus.subscribe('TestEventA', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        order.push(1);
      });

      eventBus.subscribe('TestEventA', async () => {
        order.push(2);
      });

      await eventBus.publish(new TestEventA('agg-1', 'data'));

      expect(order).toEqual([1, 2]);
    });
  });

  describe('publishAll', () => {
    it('should publish events in order', async () => {
      const events: DomainEvent[] = [];
      eventBus.subscribeAll((e) => events.push(e));

      const event1 = new TestEventA('agg-1', 'first');
      const event2 = new TestEventB('agg-1');
      const event3 = new TestEventA('agg-1', 'third');

      await eventBus.publishAll([event1, event2, event3]);

      expect(events).toEqual([event1, event2, event3]);
    });
  });

  describe('hasSubscribers', () => {
    it('should return false when no subscribers', () => {
      expect(eventBus.hasSubscribers('TestEventA')).toBe(false);
    });

    it('should return true when type-specific subscriber exists', () => {
      eventBus.subscribe('TestEventA', vi.fn());
      expect(eventBus.hasSubscribers('TestEventA')).toBe(true);
    });

    it('should return true when all-events subscriber exists', () => {
      eventBus.subscribeAll(vi.fn());
      expect(eventBus.hasSubscribers('TestEventA')).toBe(true);
    });

    it('should return false after unsubscribing', () => {
      const unsub = eventBus.subscribe('TestEventA', vi.fn());
      unsub();
      expect(eventBus.hasSubscribers('TestEventA')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all subscriptions', async () => {
      const handler = vi.fn();
      eventBus.subscribe('TestEventA', handler);
      eventBus.subscribeAll(handler);

      eventBus.clear();

      await eventBus.publish(new TestEventA('agg-1', 'data'));
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
