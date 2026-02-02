<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from 'vuex';
import { Actions, Getters } from '@/store/types';

const store = useStore();

const isRunning = computed(() => store.getters[Getters.IS_RUNNING]);
const hasRaces = computed(() => store.getters[Getters.RACES].length > 0);

const generateProgram = () => {
  store.dispatch(Actions.GENERATE_PROGRAM);
};

const toggleRace = () => {
  if (isRunning.value) {
    store.dispatch(Actions.PAUSE_RACE);
  } else {
    store.dispatch(Actions.START_RACE);
  }
};
</script>

<template>
  <header class="flex justify-between items-center p-4 bg-gray-100 border-b border-gray-300">
    <h1 class="text-xl font-bold">Horse Racing</h1>
    <div class="flex gap-4">
      <button
        class="px-4 py-2 bg-gray-700 text-white font-bold hover:bg-gray-800"
        data-testid="generate-btn"
        @click="generateProgram"
      >
        GENERATE PROGRAM
      </button>
      <button
        class="px-4 py-2 text-white font-bold disabled:opacity-50"
        :class="isRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'"
        :disabled="!hasRaces"
        data-testid="start-pause-btn"
        @click="toggleRace"
      >
        {{ isRunning ? 'PAUSE' : 'START' }}
      </button>
    </div>
  </header>
</template>
