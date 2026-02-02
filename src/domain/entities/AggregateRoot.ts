import { DomainEvent } from '@/domain/events/DomainEvent';

/**
 * Abstract base class for aggregate roots.
 * An aggregate root is the entry point to an aggregate - a cluster of
 * domain objects that can be treated as a single unit.
 *
 * The aggregate root:
 * - Has a unique identity
 * - Manages domain events raised by the aggregate
 * - Enforces invariants across the aggregate
 *
 * @template TId - The type of the aggregate's identifier
 */
export abstract class AggregateRoot<TId> {
  private readonly _domainEvents: DomainEvent[] = [];

  /**
   * Creates an AggregateRoot instance.
   * @param _id - The unique identifier of this aggregate
   */
  protected constructor(protected readonly _id: TId) {}

  /**
   * The unique identifier of this aggregate.
   */
  get id(): TId {
    return this._id;
  }

  /**
   * Returns a readonly view of the domain events raised by this aggregate.
   * Use this to inspect events without modifying them.
   */
  get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }

  /**
   * Adds a domain event to be published.
   * Call this method from within the aggregate when something significant happens.
   *
   * @param event - The domain event to add
   */
  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  /**
   * Clears and returns all domain events.
   * Typically called by infrastructure after events have been published.
   *
   * @returns The domain events that were pending
   */
  clearDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents.length = 0;
    return events;
  }

  /**
   * Checks if this aggregate has any pending domain events.
   */
  hasDomainEvents(): boolean {
    return this._domainEvents.length > 0;
  }
}
