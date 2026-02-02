import { inject, provide, type InjectionKey } from 'vue';
import { Container, createContainer } from '@/infrastructure/di/container';
import { useGameStore } from '../store/gameStore';

/**
 * Injection key for the DI container.
 */
export const CONTAINER_KEY: InjectionKey<Container> = Symbol('container');

/**
 * Provides the DI container to all child components.
 * Call this once in the root component (App.vue).
 *
 * @returns The created container
 */
export function provideContainer(): Container {
  const gameStore = useGameStore();
  const container = createContainer(gameStore.stateAdapter);
  provide(CONTAINER_KEY, container);
  return container;
}

/**
 * Injects the DI container.
 * Must be called in a component that is a descendant of the root component.
 *
 * @throws Error if container is not provided
 * @returns The injected container
 */
export function useContainer(): Container {
  const container = inject(CONTAINER_KEY);
  if (!container) {
    throw new Error(
      'Container not provided. Did you call provideContainer() in the root component?'
    );
  }
  return container;
}

/**
 * Hook to access the GenerateProgramCommand.
 */
export function useGenerateProgram() {
  const container = useContainer();
  return {
    execute: () => container.generateProgramCommand.execute(),
  };
}

/**
 * Hook to access the StartRaceCommand.
 */
export function useStartRace() {
  const container = useContainer();
  return {
    execute: () => container.startRaceCommand.execute(),
    stop: () => container.startRaceCommand.stop(),
    isRunning: () => container.startRaceCommand.isRunning(),
  };
}

/**
 * Hook to access the PauseRaceCommand.
 */
export function usePauseRace() {
  const container = useContainer();
  return {
    execute: () => container.pauseRaceCommand.execute(),
  };
}

/**
 * Hook to access the EventBus for subscribing to domain events.
 */
export function useEventSubscriber() {
  const container = useContainer();
  return container.eventSubscriber;
}
