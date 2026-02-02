import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import HorseList from '../HorseList.vue';
import { useGameStore } from '@/presentation/store';
import { createSimpleMockHorse, type SimpleMockHorse } from './test-utils';

describe('HorseList', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  const mountComponent = (horses: SimpleMockHorse[] = []) => {
    const store = useGameStore();
    store.horses = horses as unknown[];

    return mount(HorseList, {
      global: {
        plugins: [pinia],
      },
    });
  };

  it('should render empty state when no horses', () => {
    const wrapper = mountComponent([]);
    expect(wrapper.text()).toContain('Horse List');
  });

  it('should render list of horses', () => {
    const horses = [
      createSimpleMockHorse('Thunder', 80, '#ff0000'),
      createSimpleMockHorse('Lightning', 90, '#00ff00'),
    ];
    const wrapper = mountComponent(horses);

    expect(wrapper.text()).toContain('Thunder');
    expect(wrapper.text()).toContain('Lightning');
    expect(wrapper.text()).toContain('80');
    expect(wrapper.text()).toContain('90');
  });

  it('should display horse color indicator', () => {
    const horses = [createSimpleMockHorse('Thunder', 80, 'rgb(255, 0, 0)')];
    const wrapper = mountComponent(horses);

    const colorDiv = wrapper.find('[style*="background-color"]');
    expect(colorDiv.exists()).toBe(true);
  });
});
