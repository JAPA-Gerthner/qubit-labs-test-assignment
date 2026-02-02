import { Brand } from '@/shared/types/branded';

/**
 * Branded type for timer/interval identifiers.
 * Prevents mixing up timer IDs with other numbers.
 */
export type TimerId = Brand<number, 'TimerId'>;

/**
 * Creates a TimerId from a number.
 */
export const createTimerId = (id: number): TimerId => id as TimerId;

/**
 * Callback function for timer/interval handlers.
 */
export type TimerCallback = () => void;

/**
 * Port interface for timer operations.
 * Abstracts setTimeout/setInterval to enable testing.
 */
export interface Timer {
  /**
   * Creates a recurring timer that calls the callback at the specified interval.
   *
   * @param callback - Function to call on each interval
   * @param intervalMs - Interval in milliseconds
   * @returns TimerId that can be used to clear the interval
   */
  setInterval(callback: TimerCallback, intervalMs: number): TimerId;

  /**
   * Clears a recurring timer created with setInterval.
   *
   * @param id - The TimerId returned by setInterval
   */
  clearInterval(id: TimerId): void;

  /**
   * Creates a one-shot timer that calls the callback after the specified delay.
   *
   * @param callback - Function to call after the delay
   * @param delayMs - Delay in milliseconds
   * @returns TimerId that can be used to clear the timeout
   */
  setTimeout(callback: TimerCallback, delayMs: number): TimerId;

  /**
   * Clears a one-shot timer created with setTimeout.
   *
   * @param id - The TimerId returned by setTimeout
   */
  clearTimeout(id: TimerId): void;
}
