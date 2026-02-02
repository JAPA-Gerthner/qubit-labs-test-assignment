export const Actions = {
  GENERATE_PROGRAM: 'generateProgram',
  START_RACE: 'startRace',
  PAUSE_RACE: 'pauseRace',
} as const;

export const Mutations = {
  SET_HORSES: 'SET_HORSES',
  SET_RACES: 'SET_RACES',
  SET_CURRENT_RACE_INDEX: 'SET_CURRENT_RACE_INDEX',
  SET_IS_RUNNING: 'SET_IS_RUNNING',
  SET_TICK: 'SET_TICK',
  TICK: 'TICK',
} as const;

export const Getters = {
  HORSES: 'horses',
  RACES: 'races',
  CURRENT_RACE: 'currentRace',
  IS_RUNNING: 'isRunning',
} as const;
