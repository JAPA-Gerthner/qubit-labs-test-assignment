import { DomainEvent } from '@/domain/events/DomainEvent';
import { EventPublisher } from '@/application/ports/output/EventPublisher';

/**
 * Mock event publisher for testing.
 * Captures all published events for assertions.
 */
export class MockEventPublisher implements EventPublisher {
  private readonly _events: DomainEvent[] = [];

  /**
   * Publishes a single event (captures it for testing).
   */
  async publish(event: DomainEvent): Promise<void> {
    this._events.push(event);
  }

  /**
   * Publishes multiple events (captures them for testing).
   */
  async publishAll(events: DomainEvent[]): Promise<void> {
    this._events.push(...events);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Testing utilities
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Returns all captured events.
   */
  get events(): ReadonlyArray<DomainEvent> {
    return this._events;
  }

  /**
   * Returns events of a specific type.
   */
  getEventsOfType<T extends DomainEvent>(eventType: string): T[] {
    return this._events.filter((e) => e.eventType === eventType) as T[];
  }

  /**
   * Returns true if any event of the given type was published.
   */
  hasEventOfType(eventType: string): boolean {
    return this._events.some((e) => e.eventType === eventType);
  }

  /**
   * Returns the count of events of a specific type.
   */
  countEventsOfType(eventType: string): number {
    return this._events.filter((e) => e.eventType === eventType).length;
  }

  /**
   * Returns the most recent event, or undefined if none.
   */
  getLastEvent(): DomainEvent | undefined {
    return this._events[this._events.length - 1];
  }

  /**
   * Clears all captured events.
   */
  clear(): void {
    this._events.length = 0;
  }
}
