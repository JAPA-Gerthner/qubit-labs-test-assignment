import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { provide, h, defineComponent } from 'vue';
import HeaderBar from '../HeaderBar.vue';
import { useGameStore } from '@/presentation/store';
import { CONTAINER_KEY } from '@/presentation/composables';
import { Container } from '@/infrastructure/di/container';
import { ok } from '@/shared/Result';

// Create mock container
const createMockContainer = () => {
  return {
    generateProgramCommand: {
      execute: vi.fn().mockResolvedValue(ok({ horses: [], races: [] })),
    },
    startRaceCommand: {
      execute: vi.fn().mockResolvedValue(ok(undefined)),
      stop: vi.fn(),
      isRunning: vi.fn().mockReturnValue(false),
    },
    pauseRaceCommand: {
      execute: vi.fn().mockReturnValue(ok(undefined)),
    },
  } as unknown as Container;
};

// Wrapper component that provides the container
const createWrapper = (container: Container) => {
  return defineComponent({
    setup(_, { slots }) {
      provide(CONTAINER_KEY, container);
      return () => h('div', slots.default?.());
    },
  });
};

describe('HeaderBar', () => {
  let pinia: ReturnType<typeof createPinia>;
  let mockContainer: Container;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    mockContainer = createMockContainer();
  });

  const mountComponent = (isRunning = false, hasRaces = false) => {
    const store = useGameStore();
    store.isRunning = isRunning;
    if (hasRaces) {
      store.races = [{ id: 'test' }] as unknown[];
    }

    return mount(HeaderBar, {
      global: {
        plugins: [pinia],
        stubs: {
          teleport: true,
        },
        provide: {
          [CONTAINER_KEY as symbol]: mockContainer,
        },
      },
    });
  };

  it('should render title', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Horse Racing');
  });

  it('should render GENERATE PROGRAM button', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('GENERATE PROGRAM');
  });

  it('should show START button when not running', () => {
    const wrapper = mountComponent(false, true);
    expect(wrapper.text()).toContain('START');
  });

  it('should show PAUSE button when running', () => {
    const wrapper = mountComponent(true, true);
    expect(wrapper.text()).toContain('PAUSE');
  });

  it('should disable START/PAUSE button when no races', () => {
    const wrapper = mountComponent(false, false);

    const buttons = wrapper.findAll('button');
    const startButton = buttons.find((b) => b.text().includes('START'));
    expect(startButton?.attributes('disabled')).toBeDefined();
  });

  it('should call generateProgramCommand on button click', async () => {
    const wrapper = mountComponent();

    const generateButton = wrapper.findAll('button').find((b) => b.text().includes('GENERATE'));
    await generateButton?.trigger('click');
    await flushPromises();

    expect(mockContainer.generateProgramCommand.execute).toHaveBeenCalled();
  });

  it('should call startRaceCommand when clicking START', async () => {
    const wrapper = mountComponent(false, true);

    const startButton = wrapper.findAll('button').find((b) => b.text().includes('START'));
    await startButton?.trigger('click');
    await flushPromises();

    expect(mockContainer.startRaceCommand.execute).toHaveBeenCalled();
  });

  it('should call pauseRaceCommand when clicking PAUSE', async () => {
    const wrapper = mountComponent(true, true);

    const pauseButton = wrapper.findAll('button').find((b) => b.text().includes('PAUSE'));
    await pauseButton?.trigger('click');
    await flushPromises();

    expect(mockContainer.pauseRaceCommand.execute).toHaveBeenCalled();
  });
});
