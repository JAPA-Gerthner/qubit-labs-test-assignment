import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GenerateProgramCommand } from '../GenerateProgramCommand';
import { MockGameStateStore } from '@/test/mocks/MockGameStateStore';
import { MockEventPublisher } from '@/test/mocks/MockEventPublisher';
import { ValidationError } from '@/domain/errors/ValidationError';

describe('GenerateProgramCommand', () => {
  let stateStore: MockGameStateStore;
  let eventPublisher: MockEventPublisher;
  let command: GenerateProgramCommand;

  let uuidCounter = 0;

  beforeEach(() => {
    uuidCounter = 0;
    // Generate valid UUIDs with incrementing values for uniqueness
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
      const counter = (++uuidCounter).toString(16).padStart(12, '0');
      return `550e8400-e29b-41d4-a716-${counter}`;
    });

    stateStore = new MockGameStateStore();
    eventPublisher = new MockEventPublisher();
    command = new GenerateProgramCommand(stateStore, eventPublisher);
  });

  describe('execute', () => {
    it('should generate default program with 20 horses and 6 races', async () => {
      const result = await command.execute();

      expect(result.isOk()).toBe(true);
      const output = result.unwrap();

      expect(output.horses).toHaveLength(20);
      expect(output.races).toHaveLength(6);
    });

    it('should respect custom horse count', async () => {
      const result = await command.execute({ horseCount: 30 });

      expect(result.isOk()).toBe(true);
      expect(result.unwrap().horses).toHaveLength(30);
    });

    it('should respect custom race count', async () => {
      const result = await command.execute({ raceCount: 4 });

      expect(result.isOk()).toBe(true);
      expect(result.unwrap().races).toHaveLength(4);
    });

    it('should respect custom horses per race', async () => {
      const result = await command.execute({
        horseCount: 15,
        horsesPerRace: 5,
      });

      expect(result.isOk()).toBe(true);
      const output = result.unwrap();

      // Each race should have 5 horses
      for (const race of output.races) {
        expect(race.horses).toHaveLength(5);
      }
    });

    it('should update state store with generated data', async () => {
      const result = await command.execute();
      expect(result.isOk()).toBe(true);

      const output = result.unwrap();
      expect(stateStore.getHorses()).toHaveLength(output.horses.length);
      expect(stateStore.getRaces()).toHaveLength(output.races.length);
      expect(stateStore.getCurrentRaceIndex()).toBe(0);
      expect(stateStore.isRunning()).toBe(false);
      expect(stateStore.getTick()).toBe(0);
    });

    it('should generate horses with valid names', async () => {
      const result = await command.execute();
      expect(result.isOk()).toBe(true);

      for (const horse of result.unwrap().horses) {
        expect(horse.name.value.length).toBeGreaterThan(0);
        expect(horse.name.value.length).toBeLessThanOrEqual(30);
      }
    });

    it('should generate horses with valid colors', async () => {
      const result = await command.execute();
      expect(result.isOk()).toBe(true);

      for (const horse of result.unwrap().horses) {
        expect(horse.color.value).toMatch(/^#[0-9a-f]{6}$/);
      }
    });

    it('should generate horses with valid conditions', async () => {
      const result = await command.execute();
      expect(result.isOk()).toBe(true);

      for (const horse of result.unwrap().horses) {
        expect(horse.condition.value).toBeGreaterThanOrEqual(1);
        expect(horse.condition.value).toBeLessThanOrEqual(100);
      }
    });

    it('should generate races with valid distances', async () => {
      const validDistances = [1200, 1400, 1600, 1800, 2000, 2200];
      const result = await command.execute();
      expect(result.isOk()).toBe(true);

      for (const race of result.unwrap().races) {
        expect(validDistances).toContain(race.distance.value);
      }
    });
  });

  describe('validation errors', () => {
    it('should return error if horseCount < horsesPerRace', async () => {
      const result = await command.execute({
        horseCount: 5,
        horsesPerRace: 10,
      });

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error.field).toBe('horseCount');
    });

    it('should return error if raceCount < 1', async () => {
      const result = await command.execute({ raceCount: 0 });

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error.field).toBe('raceCount');
    });

    it('should return error if horsesPerRace < 2', async () => {
      const result = await command.execute({ horsesPerRace: 1 });

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error.field).toBe('horsesPerRace');
    });
  });

  describe('unique horse names', () => {
    it('should generate unique horse names', async () => {
      const result = await command.execute({ horseCount: 50 });
      expect(result.isOk()).toBe(true);

      const names = result.unwrap().horses.map((h) => h.name.value);
      const uniqueNames = new Set(names);

      expect(uniqueNames.size).toBe(names.length);
    });
  });
});
