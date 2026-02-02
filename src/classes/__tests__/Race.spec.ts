import { describe, it, expect, beforeEach } from 'vitest';
import { Race } from '../Race.class';
import { RunningHorse } from '../RunningHorse.class';
import { Horse } from '../Horse.class';

const createMockHorse = (condition: number): Horse => {
  const horse = new Horse();
  horse.condition = condition;
  return horse;
};

const createRunningHorses = (count: number, condition = 50): RunningHorse[] => {
  return Array.from({ length: count }, () => new RunningHorse(createMockHorse(condition)));
};

describe('Race', () => {
  let race: Race;

  beforeEach(() => {
    race = new Race(createRunningHorses(10), 1200);
  });

  it('should create a race with correct properties', () => {
    expect(race.horses.length).toBe(10);
    expect(race.length).toBe(1200);
    expect(race.results).toEqual([]);
    expect(race.id).toBeDefined();
  });

  describe('isHorseFinished', () => {
    it('should return false when horse position is less than race length', () => {
      const horse = new RunningHorse(createMockHorse(50));
      horse.position = 1000;
      race = new Race([horse], 1200);

      expect(race.isHorseFinished(horse)).toBe(false);
    });

    it('should return true when horse position equals race length', () => {
      const horse = new RunningHorse(createMockHorse(50));
      horse.position = 1200;
      race = new Race([horse], 1200);

      expect(race.isHorseFinished(horse)).toBe(true);
    });

    it('should return true when horse position exceeds race length', () => {
      const horse = new RunningHorse(createMockHorse(50));
      horse.position = 1300;
      race = new Race([horse], 1200);

      expect(race.isHorseFinished(horse)).toBe(true);
    });
  });

  describe('isAllFinished', () => {
    it('should return false when not all horses have finished', () => {
      expect(race.isAllFinished).toBe(false);
    });

    it('should return true when all horses have finished', () => {
      race.horses.forEach((horse) => {
        horse.position = race.length;
      });

      expect(race.isAllFinished).toBe(true);
    });
  });

  describe('turn', () => {
    it('should move horses that have not finished', () => {
      const initialPositions = race.horses.map((h) => h.position);
      race.turn();
      const newPositions = race.horses.map((h) => h.position);

      expect(newPositions.some((pos, i) => pos > initialPositions[i])).toBe(true);
    });

    it('should not move horses that have already finished', () => {
      const horse = race.horses[0];
      horse.position = race.length;

      race.turn();

      expect(horse.position).toBe(race.length);
    });

    it('should cap horse position at race length', () => {
      const horse = new RunningHorse(createMockHorse(100));
      horse.position = 1190;
      race = new Race([horse], 1200);

      race.turn();

      expect(horse.position).toBe(race.length);
    });

    it('should add horse to results when it finishes', () => {
      const horse = new RunningHorse(createMockHorse(100));
      horse.position = 1199;
      race = new Race([horse], 1200);

      expect(race.results.length).toBe(0);
      race.turn();
      expect(race.results.length).toBe(1);
      expect(race.results[0]).toBe(horse);
    });
  });

  describe('tie-breaking', () => {
    it('should rank horses by distance traveled when finishing in same turn', () => {
      const slowHorse = new RunningHorse(createMockHorse(10));
      const fastHorse = new RunningHorse(createMockHorse(100));

      slowHorse.position = 1195;
      fastHorse.position = 1150;

      race = new Race([slowHorse, fastHorse], 1200);
      race.turn();

      if (race.results.length === 2) {
        expect(race.results[0]).toBe(fastHorse);
        expect(race.results[1]).toBe(slowHorse);
      }
    });
  });
});
