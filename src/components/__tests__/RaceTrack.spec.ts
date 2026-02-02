import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import RaceTrack from '../RaceTrack.vue';
import { Getters } from '@/store/types';

const createMockStore = (currentRace: any = null, currentRaceIndex = 0, tick = 0) => {
  return createStore({
    state: { currentRaceIndex, tick },
    getters: {
      [Getters.CURRENT_RACE]: () => currentRace,
    },
  });
};

describe('RaceTrack', () => {
  it('should render 10 empty lanes when no race', () => {
    const store = createMockStore(null);
    const wrapper = mount(RaceTrack, {
      global: { plugins: [store] },
    });

    const lanes = wrapper.findAll('.bg-yellow-400');
    expect(lanes.length).toBe(10);
  });

  it('should render lane numbers', () => {
    const store = createMockStore(null);
    const wrapper = mount(RaceTrack, {
      global: { plugins: [store] },
    });

    for (let i = 1; i <= 10; i++) {
      expect(wrapper.text()).toContain(i.toString());
    }
  });

  it('should render footer with lap info', () => {
    const race = {
      length: 1200,
      horses: [],
    };
    const store = createMockStore(race, 0);
    const wrapper = mount(RaceTrack, {
      global: { plugins: [store] },
    });

    expect(wrapper.text()).toContain('Lap 1');
    expect(wrapper.text()).toContain('1200m');
    expect(wrapper.text()).toContain('FINISH');
  });

  it('should render horses when race exists', () => {
    const race = {
      length: 1200,
      horses: [
        { horse: { id: '1', name: 'Thunder' }, position: 0 },
        { horse: { id: '2', name: 'Lightning' }, position: 100 },
      ],
    };
    const store = createMockStore(race);
    const wrapper = mount(RaceTrack, {
      global: { plugins: [store] },
    });

    const horseEmojis = wrapper.findAll('.text-2xl');
    expect(horseEmojis.length).toBe(2);
  });

  it('should position horses based on their progress', () => {
    const race = {
      length: 1000,
      horses: [{ horse: { id: '1', name: 'Thunder' }, position: 500 }],
    };
    const store = createMockStore(race);
    const wrapper = mount(RaceTrack, {
      global: { plugins: [store] },
    });

    const horseEl = wrapper.find('.text-2xl');
    const style = horseEl.attributes('style');
    expect(style).toContain('left:');
    expect(style).toContain('50%');
  });

  it('should cap horse position at 97%', () => {
    const race = {
      length: 1000,
      horses: [{ horse: { id: '1', name: 'Thunder' }, position: 1000 }],
    };
    const store = createMockStore(race);
    const wrapper = mount(RaceTrack, {
      global: { plugins: [store] },
    });

    const horseEl = wrapper.find('.text-2xl');
    const style = horseEl.attributes('style');
    expect(style).toContain('97%');
  });
});
