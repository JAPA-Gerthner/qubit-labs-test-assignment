import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Race } from '../Race';
import { Horse } from '@/domain/value-objects/Horse';
import { Distance } from '@/domain/value-objects/Distance';
import { unsafeCreateRaceId } from '@/domain/value-objects/RaceId';
import {
  NoHorsesError,
  RaceNotStartedError,
  RaceAlreadyFinishedError,
} from '@/domain/errors/RaceErrors';
import {
  RaceStarted,
  TurnCompleted,
  HorseFinished,
  RaceFinished,
} from '@/domain/events/RaceEvents';

describe('Race', () => {
  const mockUUID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(mockUUID);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createHorse = (name: string, condition: number): Horse => {
    return Horse.create({
      id: crypto.randomUUID(),
      name,
      color: '#ff5500',
      condition,
    }).unwrap();
  };

  const createDistance = (meters: number = 1600): Distance => {
    return Distance.create(meters).unwrap();
  };

  const createTestHorses = (count: number = 3): Horse[] => {
    return Array.from({ length: count }, (_, i) =>
      createHorse(`Horse${i + 1}`, 50 + i * 10)
    );
  };

  describe('create', () => {
    it('should create race with horses and distance', () => {
      const horses = createTestHorses();
      const distance = createDistance();

      const result = Race.create(horses, distance);

      expect(result.isOk()).toBe(true);
      const race = result.unwrap();
      expect(race.horses).toHaveLength(3);
      expect(race.distance.value).toBe(1600);
    });

    it('should return Err when no horses provided', () => {
      const distance = createDistance();

      const result = Race.create([], distance);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(NoHorsesError);
    });

    it('should auto-generate id if not provided', () => {
      const horses = createTestHorses();
      const distance = createDistance();

      const race = Race.create(horses, distance).unwrap();

      expect(race.id).toBe(mockUUID);
    });

    it('should use provided id', () => {
      const horses = createTestHorses();
      const distance = createDistance();
      const customId = unsafeCreateRaceId('custom-race-id');

      const race = Race.create(horses, distance, customId).unwrap();

      expect(race.id).toBe(customId);
    });

    it('should initialize race as not started', () => {
      const horses = createTestHorses();
      const distance = createDistance();

      const race = Race.create(horses, distance).unwrap();

      expect(race.isStarted).toBe(false);
      expect(race.turnCount).toBe(0);
    });

    it('should initialize with empty results', () => {
      const horses = createTestHorses();
      const distance = createDistance();

      const race = Race.create(horses, distance).unwrap();

      expect(race.results).toHaveLength(0);
      expect(race.isFinished).toBe(false);
    });
  });

  describe('start', () => {
    it('should mark race as started', () => {
      const horses = createTestHorses();
      const distance = createDistance();
      const race = Race.create(horses, distance).unwrap();

      const result = race.start();

      expect(result.isOk()).toBe(true);
      expect(race.isStarted).toBe(true);
    });

    it('should emit RaceStarted event', () => {
      const horses = createTestHorses();
      const distance = createDistance();
      const race = Race.create(horses, distance).unwrap();

      race.start();

      expect(race.domainEvents).toHaveLength(1);
      const event = race.domainEvents[0] as RaceStarted;
      expect(event.eventType).toBe('RaceStarted');
      expect(event.horseCount).toBe(3);
      expect(event.distance).toBe(1600);
    });

    it('should be idempotent - not emit duplicate events', () => {
      const horses = createTestHorses();
      const distance = createDistance();
      const race = Race.create(horses, distance).unwrap();

      race.start();
      race.start();
      race.start();

      expect(race.domainEvents).toHaveLength(1);
    });

    it('should return Ok on subsequent calls', () => {
      const horses = createTestHorses();
      const distance = createDistance();
      const race = Race.create(horses, distance).unwrap();

      race.start();
      const result = race.start();

      expect(result.isOk()).toBe(true);
    });
  });

  describe('turn', () => {
    it('should return Err if race not started', () => {
      const horses = createTestHorses();
      const distance = createDistance();
      const race = Race.create(horses, distance).unwrap();

      const result = race.turn();

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(RaceNotStartedError);
    });

    it('should increment turn count', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);

      const horses = createTestHorses();
      const distance = createDistance();
      const race = Race.create(horses, distance).unwrap();

      race.start();
      race.turn();
      race.turn();
      race.turn();

      expect(race.turnCount).toBe(3);
    });

    it('should emit TurnCompleted event', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);

      const horses = createTestHorses();
      const distance = createDistance();
      const race = Race.create(horses, distance).unwrap();

      race.start();
      race.clearDomainEvents(); // Clear RaceStarted
      race.turn();

      const events = race.domainEvents;
      const turnEvent = events.find((e) => e.eventType === 'TurnCompleted') as TurnCompleted;

      expect(turnEvent).toBeDefined();
      expect(turnEvent.turnNumber).toBe(1);
      expect(turnEvent.positions).toHaveLength(3);
    });

    it('should move all horses', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const horses = createTestHorses();
      const distance = createDistance();
      const race = Race.create(horses, distance).unwrap();

      race.start();
      race.turn();

      // All horses should have moved
      for (const horse of race.horses) {
        expect(horse.position).toBeGreaterThan(0);
      }
    });

    it('should emit HorseFinished when horse crosses finish line', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const horses = [createHorse('Speedy', 100)];
      const distance = Distance.create(1200).unwrap(); // Shortest distance

      const race = Race.create(horses, distance).unwrap();
      race.start();
      race.clearDomainEvents();

      // Run until horse finishes
      while (!race.isFinished) {
        race.turn();
      }

      const finishEvent = race.domainEvents.find(
        (e) => e.eventType === 'HorseFinished'
      ) as HorseFinished;

      expect(finishEvent).toBeDefined();
      expect(finishEvent.horseName).toBe('Speedy');
      expect(finishEvent.place).toBe(1);
    });

    it('should emit RaceFinished when all horses finish', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const horses = [createHorse('Horse1', 100)];
      const distance = Distance.create(1200).unwrap();

      const race = Race.create(horses, distance).unwrap();
      race.start();
      race.clearDomainEvents();

      while (!race.isFinished) {
        race.turn();
      }

      const finishEvent = race.domainEvents.find(
        (e) => e.eventType === 'RaceFinished'
      ) as RaceFinished;

      expect(finishEvent).toBeDefined();
      expect(finishEvent.results).toHaveLength(1);
    });

    it('should return Err after race is finished', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const horses = [createHorse('Horse1', 100)];
      const distance = Distance.create(1200).unwrap();

      const race = Race.create(horses, distance).unwrap();
      race.start();

      while (!race.isFinished) {
        race.turn();
      }

      const result = race.turn();

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(RaceAlreadyFinishedError);
    });

    it('should record results in finish order', () => {
      // Control randomness to ensure deterministic finishing order
      const randomValues = [0.99, 0.1, 0.1]; // First horse will move fast
      let callCount = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => {
        const value = randomValues[callCount % randomValues.length];
        callCount++;
        return value;
      });

      const horses = [
        createHorse('Fast', 100),
        createHorse('Slow', 10),
      ];
      const distance = Distance.create(1200).unwrap();

      const race = Race.create(horses, distance).unwrap();
      race.start();

      while (!race.isFinished) {
        race.turn();
      }

      expect(race.results[0].name).toBe('Fast');
    });
  });

  describe('getLeaderboard', () => {
    it('should return horses sorted by position descending', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const horses = createTestHorses();
      const distance = createDistance();
      const race = Race.create(horses, distance).unwrap();

      race.start();
      race.turn();

      const leaderboard = race.getLeaderboard();

      // Should be sorted by position (highest first)
      for (let i = 0; i < leaderboard.length - 1; i++) {
        expect(leaderboard[i].horse.position).toBeGreaterThanOrEqual(
          leaderboard[i + 1].horse.position
        );
      }
    });

    it('should include rank and progress', () => {
      const horses = createTestHorses();
      const distance = createDistance();
      const race = Race.create(horses, distance).unwrap();

      race.start();
      const leaderboard = race.getLeaderboard();

      expect(leaderboard[0].rank).toBe(1);
      expect(leaderboard[0].progress).toBeDefined();
    });
  });

  describe('properties', () => {
    it('should expose raceLength from distance', () => {
      const horses = createTestHorses();
      const distance = createDistance(2000);
      const race = Race.create(horses, distance).unwrap();

      expect(race.raceLength).toBe(2000);
    });

    it('should have readonly horses array', () => {
      const horses = createTestHorses();
      const distance = createDistance();
      const race = Race.create(horses, distance).unwrap();

      expect(Array.isArray(race.horses)).toBe(true);
      expect(race.horses).toHaveLength(3);
    });

    it('should have readonly results array', () => {
      const horses = createTestHorses();
      const distance = createDistance();
      const race = Race.create(horses, distance).unwrap();

      expect(Array.isArray(race.results)).toBe(true);
    });
  });

  describe('toString', () => {
    it('should include race status - not started', () => {
      const horses = createTestHorses();
      const distance = createDistance();
      const race = Race.create(horses, distance).unwrap();

      expect(race.toString()).toContain('not started');
    });

    it('should include race status - in progress', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);

      const horses = createTestHorses();
      const distance = createDistance();
      const race = Race.create(horses, distance).unwrap();

      race.start();
      race.turn();

      expect(race.toString()).toContain('turn 1');
    });

    it('should include race status - finished', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const horses = [createHorse('Horse1', 100)];
      const distance = Distance.create(1200).unwrap();
      const race = Race.create(horses, distance).unwrap();

      race.start();
      while (!race.isFinished) {
        race.turn();
      }

      expect(race.toString()).toContain('finished');
    });
  });

  describe('toJSON', () => {
    it('should serialize all state', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);

      const horses = createTestHorses();
      const distance = createDistance();
      const raceId = unsafeCreateRaceId('test-race-id');
      const race = Race.create(horses, distance, raceId).unwrap();

      race.start();
      race.turn();

      const json = race.toJSON();

      expect(json.id).toBe('test-race-id');
      expect(json.distance).toBe(1600);
      expect(json.horses).toHaveLength(3);
      expect(json.isStarted).toBe(true);
      expect(json.turnCount).toBe(1);
    });
  });

  describe('reconstitute', () => {
    it('should restore full race state', () => {
      const horses = createTestHorses();
      const distance = createDistance();
      const race = Race.create(horses, distance).unwrap();

      race.start();
      race.turn();

      // Reconstitute with same state
      const reconstituted = Race.reconstitute(
        race.id,
        [...race.horses],
        race.distance,
        [...race.results],
        race.isStarted,
        race.turnCount
      );

      expect(reconstituted.id).toBe(race.id);
      expect(reconstituted.isStarted).toBe(race.isStarted);
      expect(reconstituted.turnCount).toBe(race.turnCount);
    });
  });
});
