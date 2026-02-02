import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PauseRaceCommand } from '../PauseRaceCommand';
import { StartRaceCommand } from '../StartRaceCommand';
import { MockTimer } from '@/test/mocks/MockTimer';
import { MockGameStateStore } from '@/test/mocks/MockGameStateStore';
import { MockEventPublisher } from '@/test/mocks/MockEventPublisher';
import { Horse } from '@/domain/value-objects/Horse';
import { Distance } from '@/domain/value-objects/Distance';
import { Race } from '@/domain/entities/Race';

describe('PauseRaceCommand', () => {
  let timer: MockTimer;
  let stateStore: MockGameStateStore;
  let eventPublisher: MockEventPublisher;
  let startCommand: StartRaceCommand;
  let pauseCommand: PauseRaceCommand;
  let uuidCounter = 0;

  const createTestHorse = (name: string, condition: number): Horse => {
    const counter = (++uuidCounter).toString(16).padStart(12, '0');
    return Horse.create({
      id: `550e8400-e29b-41d4-a716-${counter}`,
      name,
      color: '#ff5500',
      condition,
    }).unwrap();
  };

  const createTestRace = (horseCount: number = 3): Race => {
    const horses = Array.from({ length: horseCount }, (_, i) =>
      createTestHorse(`Horse${i + 1}`, 50)
    );
    const dist = Distance.create(1600).unwrap();
    return Race.create(horses, dist).unwrap();
  };

  beforeEach(() => {
    uuidCounter = 0;
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
      const counter = (++uuidCounter).toString(16).padStart(12, '0');
      return `550e8400-e29b-41d4-a716-${counter}`;
    });

    timer = new MockTimer();
    stateStore = new MockGameStateStore();
    eventPublisher = new MockEventPublisher();
    startCommand = new StartRaceCommand(timer, stateStore, eventPublisher, 100);
    pauseCommand = new PauseRaceCommand(startCommand, stateStore);
  });

  describe('execute', () => {
    it('should return Ok always', () => {
      const result = pauseCommand.execute();

      expect(result.isOk()).toBe(true);
    });

    it('should stop the running race', async () => {
      const race = createTestRace();
      stateStore.setRaces([race]);

      await startCommand.execute();
      expect(timer.getActiveTimerCount()).toBe(1);

      pauseCommand.execute();

      expect(timer.getActiveTimerCount()).toBe(0);
    });

    it('should set isRunning to false', async () => {
      const race = createTestRace();
      stateStore.setRaces([race]);

      await startCommand.execute();
      expect(stateStore.isRunning()).toBe(true);

      pauseCommand.execute();

      expect(stateStore.isRunning()).toBe(false);
    });

    it('should be safe to call when not running', () => {
      const result = pauseCommand.execute();

      expect(result.isOk()).toBe(true);
      expect(stateStore.isRunning()).toBe(false);
    });

    it('should preserve race state when paused', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const race = createTestRace();
      stateStore.setRaces([race]);

      await startCommand.execute();
      timer.tick();
      timer.tick();

      const tickBeforePause = stateStore.getTick();
      const turnBeforePause = race.turnCount;

      pauseCommand.execute();

      // State should be preserved
      expect(stateStore.getTick()).toBe(tickBeforePause);
      expect(race.turnCount).toBe(turnBeforePause);
    });

    it('should allow race to be resumed', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const race = createTestRace();
      stateStore.setRaces([race]);

      await startCommand.execute();
      timer.tick();
      timer.tick();

      pauseCommand.execute();
      const turnAtPause = race.turnCount;

      // Resume
      await startCommand.execute();
      timer.tick();

      expect(race.turnCount).toBe(turnAtPause + 1);
    });
  });

  describe('integration with StartRaceCommand', () => {
    it('should properly pause and resume multiple times', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const race = createTestRace();
      stateStore.setRaces([race]);

      // Start
      await startCommand.execute();
      timer.tick();
      expect(race.turnCount).toBe(1);

      // Pause
      pauseCommand.execute();
      expect(stateStore.isRunning()).toBe(false);

      // Resume
      await startCommand.execute();
      timer.tick();
      expect(race.turnCount).toBe(2);

      // Pause again
      pauseCommand.execute();
      expect(stateStore.isRunning()).toBe(false);

      // Resume again
      await startCommand.execute();
      timer.tick();
      expect(race.turnCount).toBe(3);
    });
  });
});
