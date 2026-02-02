//@ts-ignore
import { createStore, type ActionContext } from 'vuex';
import { Horse } from '@/classes/Horse.class';
import { Race } from '@/classes/Race.class';
import { Game } from '@/classes/Game.class';
import { Actions, Mutations, Getters } from './types';

let raceInterval: ReturnType<typeof setInterval> | null = null;

export interface AppState {
  horses: Horse[];
  races: Race[];
  currentRaceIndex: number;
  tick: number;
  isRunning: boolean;
}

export interface AppGetters {
  [Getters.HORSES]: Horse[];
  [Getters.RACES]: Race[];
  [Getters.CURRENT_RACE]: Race | null;
  [Getters.IS_RUNNING]: boolean;
}

type Context = ActionContext<AppState, AppState>;

export default createStore<AppState>({
  state: {
    horses: [],
    races: [],
    currentRaceIndex: 0,
    tick: 0,
    isRunning: false,
  },

  getters: {
    [Getters.HORSES]: (state: AppState) => state.horses,
    [Getters.RACES]: (state: AppState) => state.races,
    [Getters.CURRENT_RACE]: (state: AppState) => state.races[state.currentRaceIndex] ?? null,
    [Getters.IS_RUNNING]: (state: AppState): boolean => state.isRunning,
  },

  mutations: {
    [Mutations.SET_HORSES](state: AppState, horses: Horse[]) {
      state.horses = horses;
    },
    [Mutations.SET_RACES](state: AppState, races: Race[]) {
      state.races = races;
    },
    [Mutations.SET_CURRENT_RACE_INDEX](state: AppState, index: number) {
      state.currentRaceIndex = index;
    },
    [Mutations.TICK](state: AppState) {
      state.tick++;
    },
    [Mutations.SET_TICK](state: AppState, tick: number) {
      state.tick = tick;
    },
    [Mutations.SET_IS_RUNNING](state: AppState, isRunning: boolean) {
      state.isRunning = isRunning;
    },
  },

  actions: {
    [Actions.GENERATE_PROGRAM]({ commit, dispatch }: Context) {
      dispatch(Actions.PAUSE_RACE);

      const horses = Game.generateHorses(20);
      const races = Game.generateRaces(horses);
      commit(Mutations.SET_HORSES, horses);
      commit(Mutations.SET_RACES, races);
      commit(Mutations.SET_CURRENT_RACE_INDEX, 0);
      commit(Mutations.SET_TICK, 0);
    },

    [Actions.START_RACE]({ commit, getters, state, dispatch }: Context) {
      if (raceInterval) return;

      const race = getters[Getters.CURRENT_RACE] as Race | null;
      if (!race) return;

      commit(Mutations.SET_IS_RUNNING, true);

      raceInterval = setInterval(() => {
        race.turn();
        commit(Mutations.TICK);

        if (race.isAllFinished) {
          clearInterval(raceInterval!);
          raceInterval = null;

          const nextIndex = state.currentRaceIndex + 1;
          if (nextIndex < state.races.length) {
            commit(Mutations.SET_CURRENT_RACE_INDEX, nextIndex);
            dispatch(Actions.START_RACE);
          } else {
            commit(Mutations.SET_IS_RUNNING, false);
          }
        }
      }, 100);
    },

    [Actions.PAUSE_RACE]({ commit }: Context) {
      if (raceInterval) {
        clearInterval(raceInterval);
        raceInterval = null;
        commit(Mutations.SET_IS_RUNNING, false);
      }
    },
  },
});
