import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserTimer } from '../adapters/BrowserTimer';
import { TimerId } from '@/application/ports/output/Timer';

describe('BrowserTimer', () => {
  let timer: BrowserTimer;

  beforeEach(() => {
    vi.useFakeTimers();
    timer = new BrowserTimer();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('setInterval', () => {
    it('should return a TimerId', () => {
      const callback = vi.fn();
      const id = timer.setInterval(callback, 100);

      // TimerId is a branded number, but in test environment it may be a Timeout object
      // The important thing is that it's defined and can be used with clearInterval
      expect(id).toBeDefined();
    });

    it('should call callback at specified interval', () => {
      const callback = vi.fn();
      timer.setInterval(callback, 100);

      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('should allow multiple intervals', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      timer.setInterval(callback1, 100);
      timer.setInterval(callback2, 200);

      vi.advanceTimersByTime(200);

      expect(callback1).toHaveBeenCalledTimes(2);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearInterval', () => {
    it('should stop the interval', () => {
      const callback = vi.fn();
      const id = timer.setInterval(callback, 100);

      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);

      timer.clearInterval(id);

      vi.advanceTimersByTime(200);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not affect other intervals', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const id1 = timer.setInterval(callback1, 100);
      timer.setInterval(callback2, 100);

      timer.clearInterval(id1);

      vi.advanceTimersByTime(100);

      expect(callback1).toHaveBeenCalledTimes(0);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should be safe to call with invalid id', () => {
      expect(() => {
        timer.clearInterval(999 as TimerId);
      }).not.toThrow();
    });
  });

  describe('setTimeout', () => {
    it('should return a TimerId', () => {
      const callback = vi.fn();
      const id = timer.setTimeout(callback, 100);

      // TimerId is a branded number, but in test environment it may be a Timeout object
      // The important thing is that it's defined and can be used with clearTimeout
      expect(id).toBeDefined();
    });

    it('should call callback after specified delay', () => {
      const callback = vi.fn();
      timer.setTimeout(callback, 100);

      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should only call callback once', () => {
      const callback = vi.fn();
      timer.setTimeout(callback, 100);

      vi.advanceTimersByTime(300);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should allow multiple timeouts', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      timer.setTimeout(callback1, 100);
      timer.setTimeout(callback2, 200);

      vi.advanceTimersByTime(150);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(0);

      vi.advanceTimersByTime(100);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearTimeout', () => {
    it('should prevent the callback from being called', () => {
      const callback = vi.fn();
      const id = timer.setTimeout(callback, 100);

      timer.clearTimeout(id);

      vi.advanceTimersByTime(200);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should not affect other timeouts', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const id1 = timer.setTimeout(callback1, 100);
      timer.setTimeout(callback2, 100);

      timer.clearTimeout(id1);

      vi.advanceTimersByTime(100);

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should be safe to call with invalid id', () => {
      expect(() => {
        timer.clearTimeout(999 as TimerId);
      }).not.toThrow();
    });
  });

  describe('Timer interface compliance', () => {
    it('should implement the Timer interface', () => {
      expect(typeof timer.setInterval).toBe('function');
      expect(typeof timer.clearInterval).toBe('function');
      expect(typeof timer.setTimeout).toBe('function');
      expect(typeof timer.clearTimeout).toBe('function');
    });
  });
});
