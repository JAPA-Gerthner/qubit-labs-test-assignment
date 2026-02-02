import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RunningHorse } from '../RunningHorse';
import { Horse } from '@/domain/value-objects/Horse';
import { unsafeCreateRunningHorseId } from '@/domain/value-objects/RunningHorseId';
import { HorseAlreadyFinishedError } from '@/domain/errors/RaceErrors';

describe('RunningHorse', () => {
  const mockUUID = '550e8400-e29b-41d4-a716-446655440000';

  const validHorseProps = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Thunder',
    color: '#ff5500',
    condition: 50,
  };

  beforeEach(() => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(mockUUID);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createHorse = (condition = 50): Horse => {
    return Horse.create({ ...validHorseProps, condition }).unwrap();
  };

  describe('create', () => {
    it('should create running horse with position 0', () => {
      const horse = createHorse();
      const runningHorse = RunningHorse.create(horse);

      expect(runningHorse.position).toBe(0);
    });

    it('should create running horse not finished', () => {
      const horse = createHorse();
      const runningHorse = RunningHorse.create(horse);

      expect(runningHorse.isFinished).toBe(false);
    });

    it('should auto-generate id if not provided', () => {
      const horse = createHorse();
      const runningHorse = RunningHorse.create(horse);

      expect(runningHorse.id).toBe(mockUUID);
    });

    it('should use provided id', () => {
      const horse = createHorse();
      const customId = unsafeCreateRunningHorseId('custom-id');
      const runningHorse = RunningHorse.create(horse, customId);

      expect(runningHorse.id).toBe(customId);
    });

    it('should store the horse', () => {
      const horse = createHorse();
      const runningHorse = RunningHorse.create(horse);

      expect(runningHorse.horse).toBe(horse);
    });
  });

  describe('reconstitute', () => {
    it('should restore all state', () => {
      const horse = createHorse();
      const id = unsafeCreateRunningHorseId('reconstituted-id');
      const runningHorse = RunningHorse.reconstitute(id, horse, 500, true);

      expect(runningHorse.id).toBe(id);
      expect(runningHorse.horse).toBe(horse);
      expect(runningHorse.position).toBe(500);
      expect(runningHorse.isFinished).toBe(true);
    });
  });

  describe('convenience getters', () => {
    it('should return horse name', () => {
      const horse = createHorse();
      const runningHorse = RunningHorse.create(horse);

      expect(runningHorse.name).toBe('Thunder');
    });

    it('should return horse condition', () => {
      const horse = createHorse(75);
      const runningHorse = RunningHorse.create(horse);

      expect(runningHorse.condition).toBe(75);
    });

    it('should return horse color', () => {
      const horse = createHorse();
      const runningHorse = RunningHorse.create(horse);

      expect(runningHorse.color).toBe('#ff5500');
    });
  });

  describe('run', () => {
    it('should increase position', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const horse = createHorse(50);
      const runningHorse = RunningHorse.create(horse);
      const raceLength = 1600;

      runningHorse.run(raceLength);

      // With condition 50 and random 0.5: Math.floor(0.5 * 50) + 1 = 26
      expect(runningHorse.position).toBe(26);
    });

    it('should return Ok with distance moved', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const horse = createHorse(50);
      const runningHorse = RunningHorse.create(horse);
      const result = runningHorse.run(1600);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(26);
    });

    it('should respect condition - higher condition = potentially more movement', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const highConditionHorse = createHorse(100);
      const runningHorse = RunningHorse.create(highConditionHorse);

      runningHorse.run(1600);

      // With condition 100 and random 0.99: Math.floor(0.99 * 100) + 1 = 100
      expect(runningHorse.position).toBe(100);
    });

    it('should mark as finished when reaching race length', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const horse = createHorse(100);
      const runningHorse = RunningHorse.create(horse);
      const raceLength = 50; // Short race

      runningHorse.run(raceLength);

      expect(runningHorse.isFinished).toBe(true);
    });

    it('should cap position at race length', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const horse = createHorse(100);
      const runningHorse = RunningHorse.create(horse);
      const raceLength = 50;

      runningHorse.run(raceLength);

      // Movement would be 100, but capped at raceLength
      expect(runningHorse.position).toBe(50);
    });

    it('should return Err when horse is already finished', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const horse = createHorse(100);
      const runningHorse = RunningHorse.create(horse);

      // Finish the horse
      runningHorse.run(50);
      expect(runningHorse.isFinished).toBe(true);

      // Try to run again
      const result = runningHorse.run(50);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(HorseAlreadyFinishedError);
    });

    it('should accumulate position over multiple turns', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const horse = createHorse(50);
      const runningHorse = RunningHorse.create(horse);
      const raceLength = 1600;

      runningHorse.run(raceLength); // 26
      runningHorse.run(raceLength); // +26 = 52
      runningHorse.run(raceLength); // +26 = 78

      expect(runningHorse.position).toBe(78);
    });

    it('should always move at least 1 meter', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);

      const horse = createHorse(1);
      const runningHorse = RunningHorse.create(horse);

      runningHorse.run(1600);

      // Math.floor(0 * 1) + 1 = 1
      expect(runningHorse.position).toBe(1);
    });
  });

  describe('getProgress', () => {
    it('should return 0% at start', () => {
      const horse = createHorse();
      const runningHorse = RunningHorse.create(horse);

      expect(runningHorse.getProgress(1600)).toBe(0);
    });

    it('should return correct percentage mid-race', () => {
      const horse = createHorse();
      const id = unsafeCreateRunningHorseId('test');
      const runningHorse = RunningHorse.reconstitute(id, horse, 800, false);

      expect(runningHorse.getProgress(1600)).toBe(50);
    });

    it('should cap at 100%', () => {
      const horse = createHorse();
      const id = unsafeCreateRunningHorseId('test');
      const runningHorse = RunningHorse.reconstitute(id, horse, 2000, true);

      expect(runningHorse.getProgress(1600)).toBe(100);
    });
  });

  describe('equals', () => {
    it('should return true for same id', () => {
      const horse = createHorse();
      const id = unsafeCreateRunningHorseId('same-id');
      const horse1 = RunningHorse.create(horse, id);
      const horse2 = RunningHorse.create(horse, id);

      expect(horse1.equals(horse2)).toBe(true);
    });

    it('should return false for different ids', () => {
      const horse = createHorse();
      const horse1 = RunningHorse.create(horse, unsafeCreateRunningHorseId('id-1'));
      const horse2 = RunningHorse.create(horse, unsafeCreateRunningHorseId('id-2'));

      expect(horse1.equals(horse2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should include name and position', () => {
      const horse = createHorse();
      const id = unsafeCreateRunningHorseId('test');
      const runningHorse = RunningHorse.reconstitute(id, horse, 500, false);

      expect(runningHorse.toString()).toBe('Thunder at 500m');
    });

    it('should indicate when finished', () => {
      const horse = createHorse();
      const id = unsafeCreateRunningHorseId('test');
      const runningHorse = RunningHorse.reconstitute(id, horse, 1600, true);

      expect(runningHorse.toString()).toBe('Thunder at 1600m (finished)');
    });
  });

  describe('toJSON', () => {
    it('should serialize all state', () => {
      const horse = createHorse();
      const id = unsafeCreateRunningHorseId('test-id');
      const runningHorse = RunningHorse.reconstitute(id, horse, 500, false);

      const json = runningHorse.toJSON();

      expect(json.id).toBe('test-id');
      expect(json.position).toBe(500);
      expect(json.isFinished).toBe(false);
      expect(json.horse).toEqual(horse.toJSON());
    });
  });
});
