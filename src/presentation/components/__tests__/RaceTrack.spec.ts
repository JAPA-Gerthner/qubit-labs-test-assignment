import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import RaceTrack from '../RaceTrack.vue';
import { useGameStore } from '@/presentation/store';
import {
  createSimpleMockRunningHorse,
  createSimpleMockRace,
  type SimpleMockRace,
} from './test-utils';

describe('RaceTrack', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  const mountComponent = (
    currentRace: SimpleMockRace | null = null,
    currentRaceIndex = 0,
    tick = 0
  ) => {
    const store = useGameStore();
    store.currentRaceIndex = currentRaceIndex;
    store.tick = tick;
    if (currentRace) {
      store.races = [currentRace] as unknown[];
    }

    return mount(RaceTrack, {
      global: {
        plugins: [pinia],
      },
    });
  };

  it('should render 10 empty lanes when no race', () => {
    const wrapper = mountComponent(null);

    const lanes = wrapper.findAll('.bg-yellow-400');
    expect(lanes.length).toBe(10);
  });

  it('should render lane numbers', () => {
    const wrapper = mountComponent(null);

    for (let i = 1; i <= 10; i++) {
      expect(wrapper.text()).toContain(i.toString());
    }
  });

  it('should render footer with lap info', () => {
    const horses = [createSimpleMockRunningHorse('Thunder', 80)];
    const race = createSimpleMockRace(horses, 1200);
    const wrapper = mountComponent(race, 0);

    expect(wrapper.text()).toContain('Lap 1');
    expect(wrapper.text()).toContain('1200m');
    expect(wrapper.text()).toContain('FINISH');
  });

  it('should render horses when race exists', () => {
    const horses = [
      createSimpleMockRunningHorse('Thunder', 80, 0),
      createSimpleMockRunningHorse('Lightning', 90, 100),
    ];
    const race = createSimpleMockRace(horses, 1200);
    const wrapper = mountComponent(race);

    const horseEmojis = wrapper.findAll('.text-2xl');
    expect(horseEmojis.length).toBe(2);
  });

  it('should position horses based on their progress', () => {
    const horses = [createSimpleMockRunningHorse('Thunder', 80, 500)];
    const race = createSimpleMockRace(horses, 1000);
    const wrapper = mountComponent(race);

    const horseEl = wrapper.find('.text-2xl');
    const style = horseEl.attributes('style');
    expect(style).toContain('left:');
    expect(style).toContain('50%');
  });

  it('should cap horse position at 97%', () => {
    const horses = [createSimpleMockRunningHorse('Thunder', 80, 1000)];
    const race = createSimpleMockRace(horses, 1000);
    const wrapper = mountComponent(race);

    const horseEl = wrapper.find('.text-2xl');
    const style = horseEl.attributes('style');
    expect(style).toContain('97%');
  });
});
