import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import ResultsPanel from '../ResultsPanel.vue';
import { Getters } from '@/store/types';

const createMockStore = (races: any[] = [], tick = 0) => {
  return createStore({
    state: { races, tick },
    getters: {
      [Getters.RACES]: (state) => state.races,
    },
  });
};

describe('ResultsPanel', () => {
  it('should render Results header', () => {
    const store = createMockStore();
    const wrapper = mount(ResultsPanel, {
      global: { plugins: [store] },
    });

    expect(wrapper.text()).toContain('Results');
  });

  it('should render race headers with lap number and distance', () => {
    const races = [
      { id: '1', length: 1200, results: [] },
      { id: '2', length: 1400, results: [] },
    ];
    const store = createMockStore(races);
    const wrapper = mount(ResultsPanel, {
      global: { plugins: [store] },
    });

    expect(wrapper.text()).toContain('Lap 1 - 1200m');
    expect(wrapper.text()).toContain('Lap 2 - 1400m');
  });

  it('should show 10 positions per race', () => {
    const races = [{ id: '1', length: 1200, results: [] }];
    const store = createMockStore(races);
    const wrapper = mount(ResultsPanel, {
      global: { plugins: [store] },
    });

    const rows = wrapper.findAll('tbody tr');
    expect(rows.length).toBe(10);
  });

  it('should show dash for empty positions', () => {
    const races = [{ id: '1', length: 1200, results: [] }];
    const store = createMockStore(races);
    const wrapper = mount(ResultsPanel, {
      global: { plugins: [store] },
    });

    const cells = wrapper.findAll('tbody td');
    const nameCells = cells.filter((_, i) => i % 2 === 1);
    nameCells.forEach((cell) => {
      expect(cell.text()).toBe('-');
    });
  });

  it('should show horse names for finished horses', () => {
    const races = [
      {
        id: '1',
        length: 1200,
        results: [
          { horse: { id: '1', name: 'Thunder' } },
          { horse: { id: '2', name: 'Lightning' } },
        ],
      },
    ];
    const store = createMockStore(races);
    const wrapper = mount(ResultsPanel, {
      global: { plugins: [store] },
    });

    expect(wrapper.text()).toContain('Thunder');
    expect(wrapper.text()).toContain('Lightning');
  });
});
