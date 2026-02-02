import {
  Timer,
  TimerId,
  TimerCallback,
  createTimerId,
} from '@/application/ports/output/Timer';

/**
 * Browser implementation of the Timer port.
 * Wraps window.setInterval/setTimeout for use in the browser environment.
 */
export class BrowserTimer implements Timer {
  /**
   * Creates a recurring timer that calls the callback at the specified interval.
   *
   * @param callback - Function to call on each interval
   * @param intervalMs - Interval in milliseconds
   * @returns TimerId that can be used to clear the interval
   */
  setInterval(callback: TimerCallback, intervalMs: number): TimerId {
    const id = window.setInterval(callback, intervalMs);
    return createTimerId(id);
  }

  /**
   * Clears a recurring timer created with setInterval.
   *
   * @param id - The TimerId returned by setInterval
   */
  clearInterval(id: TimerId): void {
    window.clearInterval(id);
  }

  /**
   * Creates a one-shot timer that calls the callback after the specified delay.
   *
   * @param callback - Function to call after the delay
   * @param delayMs - Delay in milliseconds
   * @returns TimerId that can be used to clear the timeout
   */
  setTimeout(callback: TimerCallback, delayMs: number): TimerId {
    const id = window.setTimeout(callback, delayMs);
    return createTimerId(id);
  }

  /**
   * Clears a one-shot timer created with setTimeout.
   *
   * @param id - The TimerId returned by setTimeout
   */
  clearTimeout(id: TimerId): void {
    window.clearTimeout(id);
  }
}
