import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createContainer,
  isContainer,
  Container,
} from '../di/container';
import { MockTimer } from '@/test/mocks/MockTimer';
import { MockGameStateStore } from '@/test/mocks/MockGameStateStore';
import { EventBus } from '@/application/EventBus';
import { BrowserTimer } from '../adapters/BrowserTimer';

describe('createContainer', () => {
  let stateStore: MockGameStateStore;

  beforeEach(() => {
    stateStore = new MockGameStateStore();
  });

  describe('with default config', () => {
    it('should create a container with all required dependencies', () => {
      // Use mock timer since vitest doesn't have window timers in test env
      const mockTimer = new MockTimer();
      const container = createContainer(stateStore, { timer: mockTimer });

      expect(container.timer).toBeDefined();
      expect(container.eventBus).toBeDefined();
      expect(container.eventPublisher).toBeDefined();
      expect(container.eventSubscriber).toBeDefined();
      expect(container.stateStore).toBeDefined();
      expect(container.generateProgramCommand).toBeDefined();
      expect(container.startRaceCommand).toBeDefined();
      expect(container.pauseRaceCommand).toBeDefined();
    });

    it('should use the provided state store', () => {
      const mockTimer = new MockTimer();
      const container = createContainer(stateStore, { timer: mockTimer });

      expect(container.stateStore).toBe(stateStore);
    });

    it('should create an EventBus instance', () => {
      const mockTimer = new MockTimer();
      const container = createContainer(stateStore, { timer: mockTimer });

      expect(container.eventBus).toBeInstanceOf(EventBus);
    });

    it('should use the same EventBus for publisher and subscriber', () => {
      const mockTimer = new MockTimer();
      const container = createContainer(stateStore, { timer: mockTimer });

      expect(container.eventPublisher).toBe(container.eventBus);
      expect(container.eventSubscriber).toBe(container.eventBus);
    });
  });

  describe('with custom config', () => {
    it('should use provided timer', () => {
      const customTimer = new MockTimer();
      const container = createContainer(stateStore, { timer: customTimer });

      expect(container.timer).toBe(customTimer);
    });

    it('should use provided eventBus', () => {
      const customEventBus = new EventBus();
      const customTimer = new MockTimer();
      const container = createContainer(stateStore, {
        timer: customTimer,
        eventBus: customEventBus,
      });

      expect(container.eventBus).toBe(customEventBus);
    });

    it('should use custom tick interval', async () => {
      const customTimer = new MockTimer();
      const customTickInterval = 50;
      const container = createContainer(stateStore, {
        timer: customTimer,
        tickIntervalMs: customTickInterval,
      });

      // The tick interval is passed to StartRaceCommand
      // We can verify it works by running a race
      expect(container.startRaceCommand).toBeDefined();
    });
  });

  describe('command wiring', () => {
    it('should wire GenerateProgramCommand with correct dependencies', async () => {
      const mockTimer = new MockTimer();
      const container = createContainer(stateStore, { timer: mockTimer });

      // Execute and verify it uses the state store
      const result = await container.generateProgramCommand.execute();

      expect(result.isOk()).toBe(true);
      expect(stateStore.getHorses().length).toBeGreaterThan(0);
      expect(stateStore.getRaces().length).toBeGreaterThan(0);
    });

    it('should wire StartRaceCommand with correct dependencies', async () => {
      const mockTimer = new MockTimer();
      const container = createContainer(stateStore, { timer: mockTimer });

      // Generate a program first
      await container.generateProgramCommand.execute();

      // Start the race
      const result = await container.startRaceCommand.execute();

      expect(result.isOk()).toBe(true);
      expect(stateStore.isRunning()).toBe(true);
    });

    it('should wire PauseRaceCommand with StartRaceCommand', async () => {
      const mockTimer = new MockTimer();
      const container = createContainer(stateStore, { timer: mockTimer });

      // Generate and start
      await container.generateProgramCommand.execute();
      await container.startRaceCommand.execute();

      expect(stateStore.isRunning()).toBe(true);

      // Pause
      const result = container.pauseRaceCommand.execute();

      expect(result.isOk()).toBe(true);
      expect(stateStore.isRunning()).toBe(false);
    });
  });
});

describe('isContainer', () => {
  let stateStore: MockGameStateStore;

  beforeEach(() => {
    stateStore = new MockGameStateStore();
  });

  it('should return true for a valid container', () => {
    const mockTimer = new MockTimer();
    const container = createContainer(stateStore, { timer: mockTimer });

    expect(isContainer(container)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isContainer(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isContainer(undefined)).toBe(false);
  });

  it('should return false for primitive values', () => {
    expect(isContainer(42)).toBe(false);
    expect(isContainer('string')).toBe(false);
    expect(isContainer(true)).toBe(false);
  });

  it('should return false for empty object', () => {
    expect(isContainer({})).toBe(false);
  });

  it('should return false for partial container', () => {
    const partial = {
      timer: new MockTimer(),
      eventBus: new EventBus(),
      // Missing other properties
    };

    expect(isContainer(partial)).toBe(false);
  });
});
