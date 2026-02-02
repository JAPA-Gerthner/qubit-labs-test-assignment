import { createPinia, setActivePinia } from 'pinia';
import { provide, h, defineComponent } from 'vue';
import { CONTAINER_KEY } from '@/presentation/composables';
import { Container, createContainer } from '@/infrastructure/di/container';
import { MockTimer } from '@/test/mocks/MockTimer';
import { MockGameStateStore } from '@/test/mocks/MockGameStateStore';
import { EventBus } from '@/application/EventBus';
import { Horse } from '@/domain/value-objects/Horse';
import { Race } from '@/domain/entities/Race';
import { Distance } from '@/domain/value-objects/Distance';

/**
 * Creates a test setup with Pinia and mock container.
 */
export function createTestSetup() {
  const pinia = createPinia();
  setActivePinia(pinia);

  const mockTimer = new MockTimer();
  const mockStateStore = new MockGameStateStore();
  const eventBus = new EventBus();
  const container = createContainer(mockStateStore, {
    timer: mockTimer,
    eventBus,
  });

  return {
    pinia,
    container,
    mockTimer,
    mockStateStore,
    eventBus,
  };
}

/**
 * Creates a wrapper component that provides the container.
 */
export function createProviderWrapper(container: Container) {
  return defineComponent({
    setup(_, { slots }) {
      provide(CONTAINER_KEY, container);
      return () => h('div', slots.default?.());
    },
  });
}

/**
 * Creates mock horse data that matches the domain Horse value object format.
 */
export function createMockHorse(
  name: string,
  condition: number,
  color: string = '#ff5500'
): Horse {
  const result = Horse.create({
    id: crypto.randomUUID(),
    name,
    color,
    condition,
  });
  return result.unwrap();
}

/**
 * Creates mock race data that matches the domain Race entity format.
 */
export function createMockRace(
  horses: Horse[],
  distance: number = 1200
): Race {
  const distanceResult = Distance.create(distance);
  const raceResult = Race.create(horses, distanceResult.unwrap());
  return raceResult.unwrap();
}

/**
 * Creates mock horse data in a simplified format for component testing.
 */
export interface SimpleMockHorse {
  id: string;
  name: { value: string };
  condition: { value: number };
  color: { value: string };
}

export function createSimpleMockHorse(
  name: string,
  condition: number,
  color: string = '#ff5500'
): SimpleMockHorse {
  return {
    id: crypto.randomUUID(),
    name: { value: name },
    condition: { value: condition },
    color: { value: color },
  };
}

/**
 * Creates mock running horse data for race track testing.
 */
export interface SimpleMockRunningHorse {
  horse: SimpleMockHorse;
  position: number;
  isFinished: boolean;
}

export function createSimpleMockRunningHorse(
  name: string,
  condition: number,
  position: number = 0,
  color: string = '#ff5500'
): SimpleMockRunningHorse {
  return {
    horse: createSimpleMockHorse(name, condition, color),
    position,
    isFinished: false,
  };
}

/**
 * Creates mock race data for results panel testing.
 */
export interface SimpleMockRace {
  id: string;
  distance: { value: number };
  raceLength: number;
  horses: SimpleMockRunningHorse[];
  results: SimpleMockRunningHorse[];
  isFinished: boolean;
}

export function createSimpleMockRace(
  horses: SimpleMockRunningHorse[],
  distance: number = 1200,
  results: SimpleMockRunningHorse[] = []
): SimpleMockRace {
  return {
    id: crypto.randomUUID(),
    distance: { value: distance },
    raceLength: distance,
    horses,
    results,
    isFinished: results.length === horses.length,
  };
}
