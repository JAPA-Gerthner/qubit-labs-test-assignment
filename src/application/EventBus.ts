import { DomainEvent } from '@/domain/events/DomainEvent';
import {
  EventPublisher,
  EventSubscriber,
  EventHandler,
} from './ports/output/EventPublisher';

/**
 * In-memory event bus implementation.
 * Routes domain events to registered handlers.
 */
export class EventBus implements EventPublisher, EventSubscriber {
  private readonly handlers: Map<string, Set<EventHandler>> = new Map();
  private readonly allHandlers: Set<EventHandler> = new Set();

  /**
   * Subscribes to events of a specific type.
   *
   * @param eventType - The event type to subscribe to
   * @param handler - The handler to call when events of this type are published
   * @returns Unsubscribe function
   */
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    const handlerSet = this.handlers.get(eventType)!;
    handlerSet.add(handler as EventHandler);

    // Return unsubscribe function
    return () => {
      handlerSet.delete(handler as EventHandler);
      if (handlerSet.size === 0) {
        this.handlers.delete(eventType);
      }
    };
  }

  /**
   * Subscribes to all events regardless of type.
   *
   * @param handler - The handler to call for all events
   * @returns Unsubscribe function
   */
  subscribeAll(handler: EventHandler): () => void {
    this.allHandlers.add(handler);

    return () => {
      this.allHandlers.delete(handler);
    };
  }

  /**
   * Publishes a single domain event to all subscribed handlers.
   *
   * @param event - The domain event to publish
   */
  async publish(event: DomainEvent): Promise<void> {
    // Call type-specific handlers
    const typeHandlers = this.handlers.get(event.eventType);
    if (typeHandlers) {
      for (const handler of typeHandlers) {
        await handler(event);
      }
    }

    // Call all-event handlers
    for (const handler of this.allHandlers) {
      await handler(event);
    }
  }

  /**
   * Publishes multiple domain events in order.
   *
   * @param events - The domain events to publish
   */
  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * Returns true if there are any subscribers for the given event type.
   */
  hasSubscribers(eventType: string): boolean {
    const typeHandlers = this.handlers.get(eventType);
    return (typeHandlers?.size ?? 0) > 0 || this.allHandlers.size > 0;
  }

  /**
   * Clears all subscriptions.
   */
  clear(): void {
    this.handlers.clear();
    this.allHandlers.clear();
  }
}
