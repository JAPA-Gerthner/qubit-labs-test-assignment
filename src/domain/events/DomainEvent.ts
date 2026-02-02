/**
 * Interface representing a domain event.
 * Domain events capture something that happened in the domain
 * that domain experts care about.
 */
export interface DomainEvent {
  /**
   * Unique identifier for this event instance.
   */
  readonly eventId: string;

  /**
   * The type of event (e.g., 'RaceStarted', 'HorseFinished').
   */
  readonly eventType: string;

  /**
   * When the event occurred.
   */
  readonly occurredAt: Date;

  /**
   * The ID of the aggregate that raised this event.
   */
  readonly aggregateId: string;

  /**
   * The type of aggregate that raised this event.
   */
  readonly aggregateType: string;
}

/**
 * Abstract base class for domain events.
 * Provides common functionality like auto-generated eventId and timestamp.
 */
export abstract class BaseDomainEvent implements DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;

  /**
   * Subclasses must define the event type.
   */
  abstract readonly eventType: string;

  /**
   * Subclasses must define the aggregate type.
   */
  abstract readonly aggregateType: string;

  constructor(readonly aggregateId: string) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
    // Note: Object.freeze must be called by concrete subclasses AFTER
    // their own properties are initialized, since base constructor
    // runs before subclass field initializers.
  }

  /**
   * Freezes the event to make it immutable.
   * Call this at the end of concrete subclass constructors.
   */
  protected freeze(): void {
    Object.freeze(this);
  }

  /**
   * Serializes the event to a plain object.
   */
  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
    };
  }
}
