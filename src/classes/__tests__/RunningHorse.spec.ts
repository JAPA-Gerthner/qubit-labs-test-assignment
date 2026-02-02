import { describe, it, expect } from 'vitest';
import { RunningHorse } from '../RunningHorse.class';
import { Horse } from '../Horse.class';

describe('RunningHorse', () => {
  it('should create with position 0', () => {
    const horse = new Horse();
    const runningHorse = new RunningHorse(horse);

    expect(runningHorse.position).toBe(0);
  });

  it('should hold reference to horse', () => {
    const horse = new Horse();
    const runningHorse = new RunningHorse(horse);

    expect(runningHorse.horse).toBe(horse);
  });

  describe('run', () => {
    it('should increase position', () => {
      const horse = new Horse();
      horse.condition = 50;
      const runningHorse = new RunningHorse(horse);

      runningHorse.run();

      expect(runningHorse.position).toBeGreaterThan(0);
    });

    it('should increase position by at least 1', () => {
      const horse = new Horse();
      horse.condition = 1;
      const runningHorse = new RunningHorse(horse);

      runningHorse.run();

      expect(runningHorse.position).toBeGreaterThanOrEqual(1);
    });

    it('should increase position by at most condition + 1', () => {
      const horse = new Horse();
      horse.condition = 50;
      const runningHorse = new RunningHorse(horse);

      runningHorse.run();

      expect(runningHorse.position).toBeLessThanOrEqual(51);
    });

    it('should accumulate position over multiple runs', () => {
      const horse = new Horse();
      horse.condition = 10;
      const runningHorse = new RunningHorse(horse);

      runningHorse.run();
      const positionAfterFirst = runningHorse.position;
      runningHorse.run();

      expect(runningHorse.position).toBeGreaterThan(positionAfterFirst);
    });
  });
});
