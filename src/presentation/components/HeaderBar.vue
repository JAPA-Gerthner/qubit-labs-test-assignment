<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/presentation/store';
import { useGenerateProgram, useStartRace, usePauseRace } from '@/presentation/composables';

const store = useGameStore();
const generateProgram = useGenerateProgram();
const startRace = useStartRace();
const pauseRace = usePauseRace();

const isRunning = computed(() => store.isRunning);
const hasRaces = computed(() => store.hasRaces);

const handleGenerate = async () => {
  const result = await generateProgram.execute();
  if (result.isErr()) {
    console.error('Failed to generate program:', result.error);
  }
};

const toggleRace = async () => {
  if (isRunning.value) {
    pauseRace.execute();
  } else {
    const result = await startRace.execute();
    if (result.isErr()) {
      console.error('Failed to start race:', result.error);
    }
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
        @click="handleGenerate"
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
