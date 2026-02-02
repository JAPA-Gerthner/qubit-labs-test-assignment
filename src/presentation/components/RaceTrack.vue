<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/presentation/store';

const store = useGameStore();

const tick = computed(() => store.tick);
const currentRace = computed(() => store.currentRace);
const currentRaceIndex = computed(() => store.currentRaceIndex);

const horsePositions = computed(() => {
  // Reference tick to trigger reactivity on each tick
  tick.value;
  return currentRace.value?.horses ?? [];
});

const raceLength = computed(() => {
  return currentRace.value?.raceLength ?? 0;
});

const getHorsePosition = (position: number, trackLength: number) => {
  const percentage = Math.min((position / trackLength) * 100, 97);
  return `${percentage}%`;
};
</script>

<template>
  <div class="flex flex-col bg-green-600 border border-gray-300 h-full">
    <!-- Lanes -->
    <div class="flex-1">
      <div
        v-for="(runningHorse, index) in horsePositions"
        :key="runningHorse.horse.id"
        class="flex items-center h-12 border-b border-dashed border-green-800"
      >
        <div class="w-8 bg-yellow-400 h-full flex items-center justify-center font-bold text-sm">
          {{ index + 1 }}
        </div>
        <div class="flex-1 relative">
          <!-- Name sign -->
          <div
            class="absolute -top-3 px-1 text-xs bg-white border border-black whitespace-nowrap transition-all duration-100 ease-in-out"
            :style="{ left: getHorsePosition(runningHorse.position, raceLength), zIndex: 5 }"
          >
            {{ runningHorse.horse.name.value }}
          </div>
          <!-- Horse -->
          <div
            class="absolute text-2xl transition-all duration-100 ease-in-out"
            :style="{
              left: getHorsePosition(runningHorse.position, raceLength),
              zIndex: 10,
              filter: `drop-shadow(0 0 3px ${runningHorse.horse.color.value})`
            }"
            data-testid="race-horse"
          >
            🐎
          </div>
        </div>
      </div>
      <!-- Empty lanes if no race -->
      <template v-if="horsePositions.length === 0">
        <div
          v-for="lane in 10"
          :key="lane"
          class="flex items-center h-12 border-b border-dashed border-green-800"
        >
          <div class="w-8 bg-yellow-400 h-full flex items-center justify-center font-bold text-sm">
            {{ lane }}
          </div>
          <div class="flex-1 relative"></div>
        </div>
      </template>
    </div>

    <!-- Footer -->
    <div class="flex justify-between items-center px-4 py-2 bg-green-700 text-white">
      <span class="font-bold">
        Lap {{ (currentRaceIndex ?? 0) + 1 }} - {{ raceLength }}m
      </span>
      <span class="font-bold">FINISH</span>
    </div>
  </div>
</template>
