import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import HeaderBar from '../HeaderBar.vue';
import { Actions, Getters } from '@/store/types';

const createMockStore = (isRunning = false, hasRaces = false) => {
  const store = createStore({
    state: { races: hasRaces ? [{}] : [], isRunning },
    getters: {
      [Getters.IS_RUNNING]: () => isRunning,
      [Getters.RACES]: (state) => state.races,
    },
    actions: {
      [Actions.GENERATE_PROGRAM]: vi.fn(),
      [Actions.START_RACE]: vi.fn(),
      [Actions.PAUSE_RACE]: vi.fn(),
    },
  });
  store.dispatch = vi.fn();
  return store;
};

describe('HeaderBar', () => {
  it('should render title', () => {
    const store = createMockStore();
    const wrapper = mount(HeaderBar, {
      global: { plugins: [store] },
    });

    expect(wrapper.text()).toContain('Horse Racing');
  });

  it('should render GENERATE PROGRAM button', () => {
    const store = createMockStore();
    const wrapper = mount(HeaderBar, {
      global: { plugins: [store] },
    });

    expect(wrapper.text()).toContain('GENERATE PROGRAM');
  });

  it('should show START button when not running', () => {
    const store = createMockStore(false, true);
    const wrapper = mount(HeaderBar, {
      global: { plugins: [store] },
    });

    expect(wrapper.text()).toContain('START');
  });

  it('should show PAUSE button when running', () => {
    const store = createMockStore(true, true);
    const wrapper = mount(HeaderBar, {
      global: { plugins: [store] },
    });

    expect(wrapper.text()).toContain('PAUSE');
  });

  it('should disable START/PAUSE button when no races', () => {
    const store = createMockStore(false, false);
    const wrapper = mount(HeaderBar, {
      global: { plugins: [store] },
    });

    const buttons = wrapper.findAll('button');
    const startButton = buttons.find((b) => b.text().includes('START'));
    expect(startButton?.attributes('disabled')).toBeDefined();
  });

  it('should dispatch GENERATE_PROGRAM on button click', async () => {
    const store = createMockStore();
    const wrapper = mount(HeaderBar, {
      global: { plugins: [store] },
    });

    const generateButton = wrapper.findAll('button').find((b) => b.text().includes('GENERATE'));
    await generateButton?.trigger('click');

    expect(store.dispatch).toHaveBeenCalledWith(Actions.GENERATE_PROGRAM);
  });

  it('should dispatch START_RACE when clicking START', async () => {
    const store = createMockStore(false, true);
    const wrapper = mount(HeaderBar, {
      global: { plugins: [store] },
    });

    const startButton = wrapper.findAll('button').find((b) => b.text().includes('START'));
    await startButton?.trigger('click');

    expect(store.dispatch).toHaveBeenCalledWith(Actions.START_RACE);
  });

  it('should dispatch PAUSE_RACE when clicking PAUSE', async () => {
    const store = createMockStore(true, true);
    const wrapper = mount(HeaderBar, {
      global: { plugins: [store] },
    });

    const pauseButton = wrapper.findAll('button').find((b) => b.text().includes('PAUSE'));
    await pauseButton?.trigger('click');

    expect(store.dispatch).toHaveBeenCalledWith(Actions.PAUSE_RACE);
  });
});
