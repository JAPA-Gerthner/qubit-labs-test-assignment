import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import HorseList from '../HorseList.vue';
import { Getters } from '@/store/types';

const createMockStore = (horses: any[] = []) => {
  return createStore({
    state: { horses },
    getters: {
      [Getters.HORSES]: (state) => state.horses,
    },
  });
};

describe('HorseList', () => {
  it('should render empty state when no horses', () => {
    const store = createMockStore([]);
    const wrapper = mount(HorseList, {
      global: { plugins: [store] },
    });

    expect(wrapper.text()).toContain('Horse List');
  });

  it('should render list of horses', () => {
    const horses = [
      { id: '1', name: 'Thunder', condition: 80, color: '#ff0000' },
      { id: '2', name: 'Lightning', condition: 90, color: '#00ff00' },
    ];
    const store = createMockStore(horses);
    const wrapper = mount(HorseList, {
      global: { plugins: [store] },
    });

    expect(wrapper.text()).toContain('Thunder');
    expect(wrapper.text()).toContain('Lightning');
    expect(wrapper.text()).toContain('80');
    expect(wrapper.text()).toContain('90');
  });

  it('should display horse color indicator', () => {
    const horses = [
      { id: '1', name: 'Thunder', condition: 80, color: 'rgb(255, 0, 0)' },
    ];
    const store = createMockStore(horses);
    const wrapper = mount(HorseList, {
      global: { plugins: [store] },
    });

    const colorDiv = wrapper.find('[style*="background-color"]');
    expect(colorDiv.exists()).toBe(true);
  });
});
