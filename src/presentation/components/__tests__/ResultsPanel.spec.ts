import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ResultsPanel from '../ResultsPanel.vue';
import { useGameStore } from '@/presentation/store';
import {
  createSimpleMockRunningHorse,
  createSimpleMockRace,
  type SimpleMockRace,
} from './test-utils';

describe('ResultsPanel', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  const mountComponent = (races: SimpleMockRace[] = [], tick = 0) => {
    const store = useGameStore();
    store.races = races as unknown[];
    store.tick = tick;

    return mount(ResultsPanel, {
      global: {
        plugins: [pinia],
      },
    });
  };

  it('should render Results header', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Results');
  });

  it('should render race headers with lap number and distance', () => {
    const races = [
      createSimpleMockRace([], 1200),
      createSimpleMockRace([], 1400),
    ];
    const wrapper = mountComponent(races);

    expect(wrapper.text()).toContain('Lap 1 - 1200m');
    expect(wrapper.text()).toContain('Lap 2 - 1400m');
  });

  it('should show 10 positions per race', () => {
    const races = [createSimpleMockRace([], 1200)];
    const wrapper = mountComponent(races);

    const rows = wrapper.findAll('tbody tr');
    expect(rows.length).toBe(10);
  });

  it('should show dash for empty positions', () => {
    const races = [createSimpleMockRace([], 1200)];
    const wrapper = mountComponent(races);

    const cells = wrapper.findAll('tbody td');
    const nameCells = cells.filter((_, i) => i % 2 === 1);
    nameCells.forEach((cell) => {
      expect(cell.text()).toBe('-');
    });
  });

  it('should show horse names for finished horses', () => {
    const horses = [
      createSimpleMockRunningHorse('Thunder', 80),
      createSimpleMockRunningHorse('Lightning', 90),
    ];
    const results = [
      createSimpleMockRunningHorse('Thunder', 80),
      createSimpleMockRunningHorse('Lightning', 90),
    ];
    const races = [createSimpleMockRace(horses, 1200, results)];
    const wrapper = mountComponent(races);

    expect(wrapper.text()).toContain('Thunder');
    expect(wrapper.text()).toContain('Lightning');
  });
});
