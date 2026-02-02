import { DomainEvent } from '@/domain/events/DomainEvent';

/**
 * Handler function for domain events.
 */
export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => void | Promise<void>;

/**
 * Port interface for publishing domain events.
 * Implementations might publish to an event bus, message queue, or other systems.
 */
export interface EventPublisher {
  /**
   * Publishes a single domain event.
   *
   * @param event - The domain event to publish
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * Publishes multiple domain events in order.
   *
   * @param events - The domain events to publish
   */
  publishAll(events: DomainEvent[]): Promise<void>;
}

/**
 * Port interface for subscribing to domain events.
 * Typically implemented alongside EventPublisher.
 */
export interface EventSubscriber {
  /**
   * Subscribes to events of a specific type.
   *
   * @param eventType - The event type to subscribe to
   * @param handler - The handler to call when events of this type are published
   * @returns Unsubscribe function to remove the subscription
   */
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): () => void;

  /**
   * Subscribes to all events regardless of type.
   *
   * @param handler - The handler to call for all events
   * @returns Unsubscribe function to remove the subscription
   */
  subscribeAll(handler: EventHandler): () => void;
}
