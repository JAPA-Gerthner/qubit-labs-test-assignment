import { describe, it, expect } from 'vitest';
import { Game, DISTANCES } from '../Game.class';
import { Horse } from '../Horse.class';

describe('Game', () => {
  describe('DISTANCES', () => {
    it('should have 6 distances', () => {
      expect(DISTANCES.length).toBe(6);
    });

    it('should have distances from 1200 to 2200', () => {
      expect(DISTANCES).toEqual([1200, 1400, 1600, 1800, 2000, 2200]);
    });
  });

  describe('generateHorses', () => {
    it('should generate 20 horses by default', () => {
      const horses = Game.generateHorses();

      expect(horses.length).toBe(20);
    });

    it('should generate specified number of horses', () => {
      const horses = Game.generateHorses(5);

      expect(horses.length).toBe(5);
    });

    it('should generate horses with required properties', () => {
      const horses = Game.generateHorses(1);
      const horse = horses[0];

      expect(horse.id).toBeDefined();
      expect(horse.name).toBeDefined();
      expect(horse.condition).toBeDefined();
      expect(horse.color).toBeDefined();
    });

    it('should generate horses with condition between 1 and 100', () => {
      const horses = Game.generateHorses(100);

      horses.forEach((horse) => {
        expect(horse.condition).toBeGreaterThanOrEqual(1);
        expect(horse.condition).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('generateRaces', () => {
    it('should generate 6 races', () => {
      const horses = Game.generateHorses(20);
      const races = Game.generateRaces(horses);

      expect(races.length).toBe(6);
    });

    it('should generate races with correct distances', () => {
      const horses = Game.generateHorses(20);
      const races = Game.generateRaces(horses);

      races.forEach((race, index) => {
        expect(race.length).toBe(DISTANCES[index]);
      });
    });

    it('should generate races with 10 horses each', () => {
      const horses = Game.generateHorses(20);
      const races = Game.generateRaces(horses);

      races.forEach((race) => {
        expect(race.horses.length).toBe(10);
      });
    });
  });

  describe('pickRandomHorses', () => {
    it('should pick specified number of horses', () => {
      const horses = Game.generateHorses(20);
      const picked = Game.pickRandomHorses(horses, 10);

      expect(picked.length).toBe(10);
    });

    it('should pick unique horses', () => {
      const horses = Game.generateHorses(20);
      const picked = Game.pickRandomHorses(horses, 10);
      const uniqueIds = new Set(picked.map((h) => h.id));

      expect(uniqueIds.size).toBe(10);
    });

    it('should pick horses from the original array', () => {
      const horses = Game.generateHorses(20);
      const horseIds = new Set(horses.map((h) => h.id));
      const picked = Game.pickRandomHorses(horses, 10);

      picked.forEach((horse) => {
        expect(horseIds.has(horse.id)).toBe(true);
      });
    });

    it('should not modify the original array', () => {
      const horses = Game.generateHorses(20);
      const originalIds = horses.map((h) => h.id);

      Game.pickRandomHorses(horses, 10);

      const newIds = horses.map((h) => h.id);
      expect(newIds).toEqual(originalIds);
    });
  });
});
