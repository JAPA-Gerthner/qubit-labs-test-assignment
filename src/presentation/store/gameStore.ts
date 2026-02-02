import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { Horse } from '@/domain/value-objects/Horse';
import { Race } from '@/domain/entities/Race';
import { GameStateStore } from '@/application/ports/output/GameStateStore';

/**
 * Pinia store for game state.
 * Provides reactive state management for the horse racing game.
 */
export const useGameStore = defineStore('game', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────────

  const horses = ref<Horse[]>([]);
  const races = ref<Race[]>([]);
  const currentRaceIndex = ref<number>(0);
  const tick = ref<number>(0);
  const isRunning = ref<boolean>(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // Getters (computed)
  // ─────────────────────────────────────────────────────────────────────────────

  const currentRace = computed<Race | undefined>(() => {
    return races.value[currentRaceIndex.value];
  });

  const allRacesFinished = computed<boolean>(() => {
    if (races.value.length === 0) return false;
    return races.value.every((race) => race.isFinished);
  });

  const hasRaces = computed<boolean>(() => {
    return races.value.length > 0;
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────────

  function setHorses(newHorses: Horse[]): void {
    horses.value = newHorses;
  }

  function setRaces(newRaces: Race[]): void {
    races.value = newRaces;
  }

  function setCurrentRaceIndex(index: number): void {
    currentRaceIndex.value = index;
  }

  function setIsRunning(running: boolean): void {
    isRunning.value = running;
  }

  function incrementTick(): number {
    tick.value++;
    return tick.value;
  }

  function resetTick(): void {
    tick.value = 0;
  }

  function advanceToNextRace(): boolean {
    const nextIndex = currentRaceIndex.value + 1;
    if (nextIndex < races.value.length) {
      currentRaceIndex.value = nextIndex;
      return true;
    }
    return false;
  }

  function reset(): void {
    horses.value = [];
    races.value = [];
    currentRaceIndex.value = 0;
    tick.value = 0;
    isRunning.value = false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // State Adapter (implements GameStateStore port)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Adapter that implements the GameStateStore port interface.
   * Pass this to createContainer() for DI.
   */
  const stateAdapter: GameStateStore = {
    getHorses: () => horses.value,
    getRaces: () => races.value,
    getCurrentRaceIndex: () => currentRaceIndex.value,
    getCurrentRace: () => currentRace.value,
    isRunning: () => isRunning.value,
    getTick: () => tick.value,

    setHorses,
    setRaces,
    setCurrentRaceIndex,
    setIsRunning,
    incrementTick,
    resetTick,
    advanceToNextRace,
    reset,
  };

  return {
    // State
    horses,
    races,
    currentRaceIndex,
    tick,
    isRunning,

    // Getters
    currentRace,
    allRacesFinished,
    hasRaces,

    // Actions
    setHorses,
    setRaces,
    setCurrentRaceIndex,
    setIsRunning,
    incrementTick,
    resetTick,
    advanceToNextRace,
    reset,

    // Port adapter
    stateAdapter,
  };
});

/**
 * Type for the game store instance.
 */
export type GameStore = ReturnType<typeof useGameStore>;
