# Frontend State Patterns

> **When to use**: Creating reusable UI logic, managing async state, encapsulating behavior for any frontend framework.

## Core Principle

Separate **logic** from **framework bindings**. Write framework-agnostic state management, then create thin adapters for Vue/React/Angular.

---

## Pattern: Observable State

Framework-agnostic reactive state:

```typescript
// shared/observable/Observable.ts
type Listener<T> = (value: T) => void;

export class Observable<T> {
  private listeners = new Set<Listener<T>>();

  constructor(private value: T) {}

  get(): T {
    return this.value;
  }

  set(newValue: T): void {
    this.value = newValue;
    this.notify();
  }

  update(fn: (current: T) => T): void {
    this.set(fn(this.value));
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    listener(this.value); // Emit current value
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.value));
  }
}

// Derived/computed observable
export class Computed<T> {
  private cachedValue: T;
  private unsubscribes: (() => void)[] = [];

  constructor(
    private compute: () => T,
    dependencies: Observable<unknown>[]
  ) {
    this.cachedValue = compute();
    dependencies.forEach(dep => {
      this.unsubscribes.push(dep.subscribe(() => {
        this.cachedValue = this.compute();
      }));
    });
  }

  get(): T {
    return this.cachedValue;
  }

  dispose(): void {
    this.unsubscribes.forEach(fn => fn());
  }
}
```

---

## AsyncState - Framework Agnostic

```typescript
// shared/state/AsyncState.ts
export interface AsyncStateValue<T, E = Error> {
  data: T | null;
  error: E | null;
  isLoading: boolean;
}

export class AsyncState<T, E = Error> {
  private state: Observable<AsyncStateValue<T, E>>;

  constructor() {
    this.state = new Observable({
      data: null,
      error: null,
      isLoading: false,
    });
  }

  get value(): AsyncStateValue<T, E> {
    return this.state.get();
  }

  get data(): T | null { return this.value.data; }
  get error(): E | null { return this.value.error; }
  get isLoading(): boolean { return this.value.isLoading; }
  get isSuccess(): boolean { return this.data !== null && this.error === null; }
  get isError(): boolean { return this.error !== null; }

  subscribe(listener: (value: AsyncStateValue<T, E>) => void): () => void {
    return this.state.subscribe(listener);
  }

  async execute(asyncFn: () => Promise<T>): Promise<void> {
    this.state.set({ data: null, error: null, isLoading: true });

    try {
      const data = await asyncFn();
      this.state.set({ data, error: null, isLoading: false });
    } catch (e) {
      this.state.set({ data: null, error: e as E, isLoading: false });
    }
  }

  reset(): void {
    this.state.set({ data: null, error: null, isLoading: false });
  }
}
```

---

## Pagination - Framework Agnostic

```typescript
// shared/state/PaginationState.ts
export interface PaginationValue<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  isLoading: boolean;
}

export class PaginationState<T> {
  private state: Observable<PaginationValue<T>>;

  constructor(
    private fetchFn: (page: number, pageSize: number) => Promise<{ items: T[]; total: number }>,
    private pageSize = 20
  ) {
    this.state = new Observable({
      items: [],
      page: 1,
      pageSize,
      totalItems: 0,
      isLoading: false,
    });
  }

  get value(): PaginationValue<T> { return this.state.get(); }
  get totalPages(): number { return Math.ceil(this.value.totalItems / this.value.pageSize); }
  get hasNext(): boolean { return this.value.page < this.totalPages; }
  get hasPrevious(): boolean { return this.value.page > 1; }

  subscribe(listener: (value: PaginationValue<T>) => void): () => void {
    return this.state.subscribe(listener);
  }

  async goToPage(page: number): Promise<void> {
    if (page < 1 || page > this.totalPages) return;

    this.state.update(s => ({ ...s, isLoading: true }));

    const result = await this.fetchFn(page, this.pageSize);

    this.state.set({
      items: result.items,
      page,
      pageSize: this.pageSize,
      totalItems: result.total,
      isLoading: false,
    });
  }

  nextPage(): Promise<void> { return this.goToPage(this.value.page + 1); }
  previousPage(): Promise<void> { return this.goToPage(this.value.page - 1); }
  refresh(): Promise<void> { return this.goToPage(this.value.page); }
}
```

---

## Form State - Framework Agnostic

```typescript
// shared/state/FormState.ts
export interface FormValue<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
}

export class FormState<T extends Record<string, unknown>> {
  private state: Observable<FormValue<T>>;
  private initialValues: T;

  constructor(
    initialValues: T,
    private validate: (values: T) => Partial<Record<keyof T, string>>
  ) {
    this.initialValues = { ...initialValues };
    this.state = new Observable({
      values: { ...initialValues },
      errors: {},
      touched: {},
      isSubmitting: false,
    });
  }

  get value(): FormValue<T> { return this.state.get(); }
  get isValid(): boolean { return Object.keys(this.value.errors).length === 0; }
  get isDirty(): boolean {
    return JSON.stringify(this.value.values) !== JSON.stringify(this.initialValues);
  }

  subscribe(listener: (value: FormValue<T>) => void): () => void {
    return this.state.subscribe(listener);
  }

  setField<K extends keyof T>(field: K, value: T[K]): void {
    this.state.update(s => {
      const newValues = { ...s.values, [field]: value };
      return {
        ...s,
        values: newValues,
        errors: this.validate(newValues),
      };
    });
  }

  touchField(field: keyof T): void {
    this.state.update(s => ({
      ...s,
      touched: { ...s.touched, [field]: true },
    }));
  }

  async submit(onSubmit: (values: T) => Promise<void>): Promise<boolean> {
    // Touch all fields
    const allTouched = Object.keys(this.value.values).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {} as Record<keyof T, boolean>
    );

    const errors = this.validate(this.value.values);

    this.state.update(s => ({ ...s, touched: allTouched, errors }));

    if (Object.keys(errors).length > 0) return false;

    this.state.update(s => ({ ...s, isSubmitting: true }));

    try {
      await onSubmit(this.value.values);
      return true;
    } finally {
      this.state.update(s => ({ ...s, isSubmitting: false }));
    }
  }

  reset(): void {
    this.state.set({
      values: { ...this.initialValues },
      errors: {},
      touched: {},
      isSubmitting: false,
    });
  }
}
```

---

## Debounce Utility

```typescript
// shared/utils/debounce.ts
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delayMs: number
): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = ((...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delayMs);
  }) as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
  };

  return debounced;
}

// Observable debounce
export class DebouncedObservable<T> {
  private debounced: Observable<T>;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private source: Observable<T>,
    private delayMs: number
  ) {
    this.debounced = new Observable(source.get());

    source.subscribe(value => {
      if (this.timeoutId) clearTimeout(this.timeoutId);
      this.timeoutId = setTimeout(() => {
        this.debounced.set(value);
      }, delayMs);
    });
  }

  subscribe(listener: (value: T) => void): () => void {
    return this.debounced.subscribe(listener);
  }

  dispose(): void {
    if (this.timeoutId) clearTimeout(this.timeoutId);
  }
}
```

---

## Framework Adapters

### Vue 3 Adapter

```typescript
// adapters/vue/useObservable.ts
import { ref, onUnmounted, Ref } from 'vue';
import { Observable } from '@/shared/observable/Observable';

export function useObservable<T>(observable: Observable<T>): Ref<T> {
  const state = ref(observable.get()) as Ref<T>;

  const unsubscribe = observable.subscribe(value => {
    state.value = value;
  });

  onUnmounted(unsubscribe);

  return state;
}

// Usage
export function useAsyncState<T>(asyncFn: () => Promise<T>) {
  const state = new AsyncState<T>();
  const value = useObservable(state['state']); // Access internal observable

  onUnmounted(() => state.reset());

  return {
    ...toRefs(value.value),
    execute: () => state.execute(asyncFn),
  };
}
```

### React Adapter

```typescript
// adapters/react/useObservable.ts
import { useState, useEffect } from 'react';
import { Observable } from '@/shared/observable/Observable';

export function useObservable<T>(observable: Observable<T>): T {
  const [state, setState] = useState(observable.get());

  useEffect(() => {
    return observable.subscribe(setState);
  }, [observable]);

  return state;
}

// Usage
export function useAsyncState<T>(asyncFn: () => Promise<T>) {
  const [state] = useState(() => new AsyncState<T>());
  const value = useObservable(state['state']);

  useEffect(() => {
    return () => state.reset();
  }, [state]);

  return {
    ...value,
    execute: () => state.execute(asyncFn),
  };
}
```

### Angular Adapter

```typescript
// adapters/angular/observable.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Observable as AppObservable } from '@/shared/observable/Observable';

@Injectable()
export class ObservableAdapter<T> implements OnDestroy {
  private subject: BehaviorSubject<T>;
  private unsubscribe: () => void;

  constructor(observable: AppObservable<T>) {
    this.subject = new BehaviorSubject(observable.get());
    this.unsubscribe = observable.subscribe(value => {
      this.subject.next(value);
    });
  }

  get value$() {
    return this.subject.asObservable();
  }

  ngOnDestroy(): void {
    this.unsubscribe();
  }
}
```

### Svelte Adapter

```typescript
// adapters/svelte/store.ts
import type { Readable } from 'svelte/store';
import { Observable } from '@/shared/observable/Observable';

export function fromObservable<T>(observable: Observable<T>): Readable<T> {
  return {
    subscribe(run: (value: T) => void) {
      return observable.subscribe(run);
    },
  };
}

// Usage in Svelte component
// <script>
//   import { fromObservable } from './adapters/svelte/store';
//   const state = fromObservable(asyncState);
// </script>
// {#if $state.isLoading}Loading...{/if}
```

---

## LocalStorage - Framework Agnostic

```typescript
// shared/state/PersistedState.ts
export class PersistedState<T> {
  private state: Observable<T>;

  constructor(
    private key: string,
    defaultValue: T,
    private storage: Storage = localStorage
  ) {
    const stored = storage.getItem(key);
    const initial = stored ? JSON.parse(stored) : defaultValue;
    this.state = new Observable(initial);

    this.state.subscribe(value => {
      storage.setItem(key, JSON.stringify(value));
    });
  }

  get(): T { return this.state.get(); }
  set(value: T): void { this.state.set(value); }
  subscribe(listener: (value: T) => void): () => void {
    return this.state.subscribe(listener);
  }

  clear(): void {
    this.storage.removeItem(this.key);
  }
}
```

---

## Testing (Framework-Independent)

```typescript
// shared/state/__tests__/AsyncState.spec.ts
describe('AsyncState', () => {
  it('should handle successful async operation', async () => {
    const state = new AsyncState<string>();
    const values: AsyncStateValue<string>[] = [];

    state.subscribe(v => values.push({ ...v }));

    await state.execute(async () => 'result');

    expect(values[0].isLoading).toBe(false); // Initial
    expect(values[1].isLoading).toBe(true);  // Loading
    expect(values[2].data).toBe('result');   // Success
    expect(values[2].isLoading).toBe(false);
  });

  it('should handle errors', async () => {
    const state = new AsyncState<string>();
    const error = new Error('Failed');

    await state.execute(async () => { throw error; });

    expect(state.error).toBe(error);
    expect(state.data).toBeNull();
  });
});
```

---

## Summary

| Layer | Contains | Example |
|-------|----------|---------|
| **Core Logic** | Observable, AsyncState, FormState | Framework-agnostic classes |
| **Adapters** | useObservable, store factories | Framework-specific bindings |
| **Components** | UI using adapted state | Vue/React/Angular components |

**Benefits:**
- Test logic without framework dependencies
- Share state management across micro-frontends
- Migrate frameworks without rewriting business logic
- Consistent patterns regardless of framework choice
