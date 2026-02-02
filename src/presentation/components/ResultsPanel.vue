<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/presentation/store';

const store = useGameStore();
const tick = computed(() => store.tick);

const races = computed(() => {
  // Reference tick to trigger reactivity on each tick
  tick.value;
  return store.races;
});
</script>

<template>
  <div class="bg-white border border-gray-300" data-testid="results-panel">
    <div class="bg-green-500 text-white px-3 py-2 font-bold text-center">
      Results
    </div>

    <div class="max-h-96 overflow-y-auto">
      <div v-for="(race, index) in races" :key="race.id" class="border-b border-gray-300" :data-testid="`race-${index + 1}`">
        <div class="bg-orange-400 text-white px-2 py-1 text-sm font-bold" :data-testid="`lap-header-${index + 1}`">
          Lap {{ index + 1 }} - {{ race.distance.value }}m
        </div>
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-gray-200">
              <th class="px-2 py-1 text-left">Position</th>
              <th class="px-2 py-1 text-left">Name</th>
            </tr>
          </thead>
          <tbody :data-testid="`race-results-${index + 1}`">
            <tr
              v-for="pos in 10"
              :key="pos"
              class="border-b border-gray-100"
            >
              <td class="px-2 py-1">{{ pos }}</td>
              <td class="px-2 py-1" :data-testid="`result-name-${index + 1}-${pos}`">{{ race.results[pos - 1]?.horse.name.value ?? '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
