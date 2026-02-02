import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RaceStarted,
  TurnCompleted,
  HorseFinished,
  RaceFinished,
  HorsePosition,
  RaceResult,
} from '../RaceEvents';
import { unsafeCreateRaceId } from '@/domain/value-objects/RaceId';
import { unsafeCreateRunningHorseId } from '@/domain/value-objects/RunningHorseId';

describe('RaceEvents', () => {
  const mockUUID = '550e8400-e29b-41d4-a716-446655440000';
  const mockDate = new Date('2024-01-15T12:00:00.000Z');
  const raceId = unsafeCreateRaceId('race-uuid-123');
  const horseId = unsafeCreateRunningHorseId('horse-uuid-456');

  beforeEach(() => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(mockUUID);
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('RaceStarted', () => {
    it('should create event with correct properties', () => {
      const event = new RaceStarted(raceId, 6, 1600);

      expect(event.eventType).toBe('RaceStarted');
      expect(event.aggregateType).toBe('Race');
      expect(event.aggregateId).toBe(raceId);
      expect(event.horseCount).toBe(6);
      expect(event.distance).toBe(1600);
    });

    it('should serialize to JSON correctly', () => {
      const event = new RaceStarted(raceId, 6, 1600);
      const json = event.toJSON();

      expect(json.eventType).toBe('RaceStarted');
      expect(json.horseCount).toBe(6);
      expect(json.distance).toBe(1600);
      expect(json.aggregateId).toBe(raceId);
    });
  });

  describe('TurnCompleted', () => {
    const positions: HorsePosition[] = [
      { horseId: 'h1', horseName: 'Thunder', position: 150, isFinished: false },
      { horseId: 'h2', horseName: 'Lightning', position: 120, isFinished: false },
    ];

    it('should create event with correct properties', () => {
      const event = new TurnCompleted(raceId, 5, positions);

      expect(event.eventType).toBe('TurnCompleted');
      expect(event.aggregateType).toBe('Race');
      expect(event.turnNumber).toBe(5);
      expect(event.positions).toEqual(positions);
    });

    it('should serialize to JSON correctly', () => {
      const event = new TurnCompleted(raceId, 5, positions);
      const json = event.toJSON();

      expect(json.turnNumber).toBe(5);
      expect(json.positions).toEqual(positions);
    });
  });

  describe('HorseFinished', () => {
    it('should create event with correct properties', () => {
      const event = new HorseFinished(raceId, horseId, 'Thunder', 1600, 1);

      expect(event.eventType).toBe('HorseFinished');
      expect(event.aggregateType).toBe('Race');
      expect(event.horseId).toBe(horseId);
      expect(event.horseName).toBe('Thunder');
      expect(event.finishPosition).toBe(1600);
      expect(event.place).toBe(1);
    });

    it('should serialize to JSON correctly', () => {
      const event = new HorseFinished(raceId, horseId, 'Thunder', 1600, 2);
      const json = event.toJSON();

      expect(json.horseId).toBe(horseId);
      expect(json.horseName).toBe('Thunder');
      expect(json.finishPosition).toBe(1600);
      expect(json.place).toBe(2);
    });
  });

  describe('RaceFinished', () => {
    const results: RaceResult[] = [
      { place: 1, horseId: 'h1', horseName: 'Thunder', finishPosition: 1600 },
      { place: 2, horseId: 'h2', horseName: 'Lightning', finishPosition: 1600 },
      { place: 3, horseId: 'h3', horseName: 'Storm', finishPosition: 1600 },
    ];

    it('should create event with correct properties', () => {
      const event = new RaceFinished(raceId, results);

      expect(event.eventType).toBe('RaceFinished');
      expect(event.aggregateType).toBe('Race');
      expect(event.results).toEqual(results);
    });

    it('should serialize to JSON correctly', () => {
      const event = new RaceFinished(raceId, results);
      const json = event.toJSON();

      expect(json.results).toEqual(results);
    });
  });
});
