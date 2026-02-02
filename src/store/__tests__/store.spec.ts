import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import store from '../index';
import { Actions, Mutations, Getters } from '../types';
import { RunningHorse, Race } from "@/classes";

describe('Store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    store.commit(Mutations.SET_HORSES, []);
    store.commit(Mutations.SET_RACES, []);
    store.commit(Mutations.SET_CURRENT_RACE_INDEX, 0);
    store.commit(Mutations.SET_TICK, 0);
    store.commit(Mutations.SET_IS_RUNNING, false);
  });

  afterEach(() => {
    store.dispatch(Actions.PAUSE_RACE);
    vi.useRealTimers();
  });

  describe('mutations', () => {
    it('SET_HORSES should set horses', () => {
      store.dispatch(Actions.GENERATE_PROGRAM);

      expect(store.state.horses.length).toBe(20);
    });

    it('SET_RACES should set races', () => {
      store.dispatch(Actions.GENERATE_PROGRAM);

      expect(store.state.races.length).toBe(6);
    });

    it('SET_CURRENT_RACE_INDEX should set index', () => {
      store.commit(Mutations.SET_CURRENT_RACE_INDEX, 3);

      expect(store.state.currentRaceIndex).toBe(3);
    });

    it('TICK should increment tick', () => {
      expect(store.state.tick).toBe(0);

      store.commit(Mutations.TICK);

      expect(store.state.tick).toBe(1);
    });

    it('SET_TICK should set tick value', () => {
      store.commit(Mutations.SET_TICK, 100);

      expect(store.state.tick).toBe(100);
    });

    it('SET_IS_RUNNING should set isRunning', () => {
      store.commit(Mutations.SET_IS_RUNNING, true);

      expect(store.state.isRunning).toBe(true);
    });
  });

  describe('getters', () => {
    it('HORSES should return horses', () => {
      store.dispatch(Actions.GENERATE_PROGRAM);

      expect(store.getters[Getters.HORSES].length).toBe(20);
    });

    it('RACES should return races', () => {
      store.dispatch(Actions.GENERATE_PROGRAM);

      expect(store.getters[Getters.RACES].length).toBe(6);
    });

    it('CURRENT_RACE should return current race', () => {
      store.dispatch(Actions.GENERATE_PROGRAM);
      store.commit(Mutations.SET_CURRENT_RACE_INDEX, 1);

      expect(store.getters[Getters.CURRENT_RACE].length).toBe(1400);
    });

    it('CURRENT_RACE should return null when no races', () => {
      expect(store.getters[Getters.CURRENT_RACE]).toBeNull();
    });

    it('IS_RUNNING should return isRunning state', () => {
      expect(store.getters[Getters.IS_RUNNING]).toBe(false);

      store.commit(Mutations.SET_IS_RUNNING, true);

      expect(store.getters[Getters.IS_RUNNING]).toBe(true);
    });
  });

  describe('actions', () => {
    it('GENERATE_PROGRAM should generate horses and races', () => {
      store.dispatch(Actions.GENERATE_PROGRAM);

      expect(store.state.horses.length).toBe(20);
      expect(store.state.races.length).toBe(6);
      expect(store.state.currentRaceIndex).toBe(0);
      expect(store.state.tick).toBe(0);
    });

    it('GENERATE_PROGRAM should create races with correct distances', () => {
      store.dispatch(Actions.GENERATE_PROGRAM);

      const distances = store.state.races.map((race: Race) => race.length);
      expect(distances).toEqual([1200, 1400, 1600, 1800, 2000, 2200]);
    });

    it('GENERATE_PROGRAM should create races with 10 horses each', () => {
      store.dispatch(Actions.GENERATE_PROGRAM);

      store.state.races.forEach((race: Race) => {
        expect(race.horses.length).toBe(10);
      });
    });

    it('START_RACE should set isRunning to true', () => {
      store.dispatch(Actions.GENERATE_PROGRAM);
      store.dispatch(Actions.START_RACE);

      expect(store.state.isRunning).toBe(true);
    });

    it('START_RACE should increment tick over time', () => {
      store.dispatch(Actions.GENERATE_PROGRAM);
      store.dispatch(Actions.START_RACE);
      expect(store.state.tick).toBe(0);

      vi.advanceTimersByTime(100);
      expect(store.state.tick).toBe(1);

      vi.advanceTimersByTime(100);
      expect(store.state.tick).toBe(2);
    });

    it('PAUSE_RACE should set isRunning to false', () => {
      store.dispatch(Actions.GENERATE_PROGRAM);
      store.dispatch(Actions.START_RACE);
      store.dispatch(Actions.PAUSE_RACE);

      expect(store.state.isRunning).toBe(false);
    });

    it('PAUSE_RACE should stop tick incrementing', () => {
      store.dispatch(Actions.GENERATE_PROGRAM);
      store.dispatch(Actions.START_RACE);

      vi.advanceTimersByTime(100);
      const tickAfterStart = store.state.tick;

      store.dispatch(Actions.PAUSE_RACE);
      vi.advanceTimersByTime(500);

      expect(store.state.tick).toBe(tickAfterStart);
    });

    it('START_RACE should do nothing if no races', () => {
      store.dispatch(Actions.START_RACE);

      expect(store.state.isRunning).toBe(false);
    });

    it('GENERATE_PROGRAM should stop running race', () => {
      store.dispatch(Actions.GENERATE_PROGRAM);
      store.dispatch(Actions.START_RACE);
      expect(store.state.isRunning).toBe(true);

      store.dispatch(Actions.GENERATE_PROGRAM);

      expect(store.state.isRunning).toBe(false);
    });

    it('should auto-transition to next race when current race finishes', () => {
      store.dispatch(Actions.GENERATE_PROGRAM);
      store.state.races[0].horses.forEach((horse: RunningHorse) => {
        horse.position = store.state.races[0].length - 1;
      });

      store.dispatch(Actions.START_RACE);
      expect(store.state.currentRaceIndex).toBe(0);

      vi.advanceTimersByTime(100);

      expect(store.state.currentRaceIndex).toBe(1);
      expect(store.state.isRunning).toBe(true);
    });

    it('should stop after last race finishes', () => {
      store.dispatch(Actions.GENERATE_PROGRAM);
      store.commit(Mutations.SET_CURRENT_RACE_INDEX, 5);
      store.state.races[5].horses.forEach((horse: RunningHorse) => {
        horse.position = store.state.races[5].length - 1;
      });

      store.dispatch(Actions.START_RACE);
      vi.advanceTimersByTime(100);

      expect(store.state.isRunning).toBe(false);
    });
  });
});
