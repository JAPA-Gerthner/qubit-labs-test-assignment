# CQRS - Command Query Responsibility Segregation

> **When to use**: Separating read and write models, optimizing query performance, implementing event sourcing foundations.

## Core Concept

CQRS separates the model for reading data (Query) from the model for updating data (Command). This allows independent optimization of each side.

---

## Architecture Overview

```
                    ┌─────────────────┐
                    │     Client      │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                              ▼
    ┌─────────────────┐            ┌─────────────────┐
    │    Commands     │            │     Queries     │
    │  (Write Side)   │            │   (Read Side)   │
    └────────┬────────┘            └────────┬────────┘
             │                              │
             ▼                              ▼
    ┌─────────────────┐            ┌─────────────────┐
    │  Domain Model   │            │   Read Model    │
    │  (Aggregates)   │            │ (Projections)   │
    └────────┬────────┘            └────────┬────────┘
             │                              │
             ▼                              ▼
    ┌─────────────────┐            ┌─────────────────┐
    │  Write Store    │───Events──▶│   Read Store    │
    └─────────────────┘            └─────────────────┘
```

---

## Command Side

### Command Definition

```typescript
// application/commands/CreateOrderCommand.ts
export interface CreateOrderCommand {
  readonly customerId: CustomerId;
  readonly items: ReadonlyArray<{
    productId: ProductId;
    quantity: number;
  }>;
  readonly shippingAddress: Address;
}
```

### Command Handler

```typescript
// application/commands/CreateOrderCommandHandler.ts
export class CreateOrderCommandHandler {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly productRepository: ProductRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(command: CreateOrderCommand): Promise<Result<OrderId, DomainError>> {
    // Load products to validate and get prices
    const products = await this.productRepository.findByIds(
      command.items.map(i => i.productId)
    );

    // Create order aggregate
    const orderResult = Order.create(
      command.customerId,
      command.items.map(item => ({
        product: products.get(item.productId)!,
        quantity: item.quantity,
      })),
      command.shippingAddress
    );

    if (orderResult.isErr()) return orderResult;

    const order = orderResult.value;

    // Persist
    const saveResult = await this.orderRepository.save(order);
    if (saveResult.isErr()) return saveResult;

    // Publish events
    await this.eventBus.publishAll(order.clearDomainEvents());

    return ok(order.id);
  }
}
```

---

## Query Side

### Query Definition

```typescript
// application/queries/GetOrderDetailsQuery.ts
export interface GetOrderDetailsQuery {
  readonly orderId: OrderId;
}

export interface OrderDetailsDTO {
  id: string;
  customerName: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
  }>;
  totalAmount: string;
  status: string;
  createdAt: string;
}
```

### Query Handler

```typescript
// application/queries/GetOrderDetailsQueryHandler.ts
export class GetOrderDetailsQueryHandler {
  constructor(private readonly readStore: OrderReadStore) {}

  async execute(query: GetOrderDetailsQuery): Promise<Result<OrderDetailsDTO, EntityNotFoundError>> {
    const orderView = await this.readStore.findById(query.orderId);

    if (!orderView) {
      return err(new EntityNotFoundError('Order', query.orderId));
    }

    return ok(orderView);
  }
}
```

---

## Read Model (Projections)

### Projection Definition

```typescript
// infrastructure/projections/OrderProjection.ts
export interface OrderView {
  id: string;
  customerId: string;
  customerName: string;
  items: OrderItemView[];
  totalAmount: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemView {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}
```

### Projection Handler

```typescript
// infrastructure/projections/OrderProjectionHandler.ts
export class OrderProjectionHandler {
  constructor(private readonly readStore: OrderReadStore) {}

  async handle(event: DomainEvent): Promise<void> {
    switch (event.eventType) {
      case 'OrderCreated':
        await this.onOrderCreated(event as OrderCreated);
        break;
      case 'OrderItemAdded':
        await this.onOrderItemAdded(event as OrderItemAdded);
        break;
      case 'OrderShipped':
        await this.onOrderShipped(event as OrderShipped);
        break;
    }
  }

  private async onOrderCreated(event: OrderCreated): Promise<void> {
    const view: OrderView = {
      id: event.aggregateId,
      customerId: event.customerId,
      customerName: event.customerName,
      items: event.items.map(i => ({
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.quantity * i.unitPrice,
      })),
      totalAmount: event.totalAmount,
      status: 'created',
      createdAt: event.occurredAt,
      updatedAt: event.occurredAt,
    };

    await this.readStore.save(view);
  }

  private async onOrderShipped(event: OrderShipped): Promise<void> {
    await this.readStore.updateStatus(event.aggregateId, 'shipped');
  }
}
```

---

## Command Bus (Optional)

For decoupling command dispatching:

```typescript
// application/CommandBus.ts
type CommandHandler<T> = (command: T) => Promise<Result<unknown, DomainError>>;

export class CommandBus {
  private handlers = new Map<string, CommandHandler<unknown>>();

  register<T>(commandType: string, handler: CommandHandler<T>): void {
    this.handlers.set(commandType, handler as CommandHandler<unknown>);
  }

  async dispatch<T>(command: T): Promise<Result<unknown, DomainError>> {
    const commandType = command.constructor.name;
    const handler = this.handlers.get(commandType);

    if (!handler) {
      throw new Error(`No handler registered for ${commandType}`);
    }

    return handler(command);
  }
}
```

---

## When to Use CQRS

| Scenario | Use CQRS |
|----------|----------|
| Complex domain with rich behavior | ✓ |
| Different read/write performance needs | ✓ |
| Collaborative domains with many concurrent users | ✓ |
| Need for specialized read models | ✓ |
| Simple CRUD applications | ✗ |
| Small team, simple requirements | ✗ |

---

## CQRS Levels

| Level | Description | Complexity |
|-------|-------------|------------|
| **Same model** | Separate interfaces, shared storage | Low |
| **Separate models** | Different read/write classes, shared DB | Medium |
| **Separate stores** | Different databases for read/write | High |
| **Event sourcing** | Events as source of truth | Highest |

---

## Best Practices

1. **Start simple** — Begin with same-model CQRS, evolve as needed
2. **Eventual consistency** — Accept that read models may lag slightly
3. **Idempotent projections** — Handle duplicate events gracefully
4. **Rebuild capability** — Be able to rebuild read models from events
5. **Version projections** — Track which events have been processed
