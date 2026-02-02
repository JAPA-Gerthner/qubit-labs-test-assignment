import {
  Timer,
  TimerId,
  TimerCallback,
  createTimerId,
} from '@/application/ports/output/Timer';

interface TimerEntry {
  callback: TimerCallback;
  intervalMs: number;
  isInterval: boolean;
}

/**
 * Mock timer implementation for testing.
 * Allows manual control over time progression.
 */
export class MockTimer implements Timer {
  private nextId = 1;
  private timers: Map<TimerId, TimerEntry> = new Map();

  /**
   * Sets up a recurring timer.
   */
  setInterval(callback: TimerCallback, intervalMs: number): TimerId {
    const id = createTimerId(this.nextId++);
    this.timers.set(id, { callback, intervalMs, isInterval: true });
    return id;
  }

  /**
   * Clears a recurring timer.
   */
  clearInterval(id: TimerId): void {
    this.timers.delete(id);
  }

  /**
   * Sets up a one-shot timer.
   */
  setTimeout(callback: TimerCallback, delayMs: number): TimerId {
    const id = createTimerId(this.nextId++);
    this.timers.set(id, { callback, intervalMs: delayMs, isInterval: false });
    return id;
  }

  /**
   * Clears a one-shot timer.
   */
  clearTimeout(id: TimerId): void {
    this.timers.delete(id);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Testing utilities
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Manually triggers all interval callbacks once.
   */
  tick(): void {
    const toRemove: TimerId[] = [];

    for (const [id, entry] of this.timers) {
      entry.callback();
      if (!entry.isInterval) {
        toRemove.push(id);
      }
    }

    // Remove one-shot timers
    for (const id of toRemove) {
      this.timers.delete(id);
    }
  }

  /**
   * Manually triggers interval callbacks N times.
   */
  tickMultiple(count: number): void {
    for (let i = 0; i < count; i++) {
      this.tick();
    }
  }

  /**
   * Returns the number of active timers.
   */
  getActiveTimerCount(): number {
    return this.timers.size;
  }

  /**
   * Returns true if a specific timer is active.
   */
  isTimerActive(id: TimerId): boolean {
    return this.timers.has(id);
  }

  /**
   * Clears all timers.
   */
  reset(): void {
    this.timers.clear();
    this.nextId = 1;
  }
}
