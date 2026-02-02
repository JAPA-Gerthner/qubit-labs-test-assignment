<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from 'vuex';
import { Getters } from '@/store/types';

const store = useStore();
const tick = computed(() => store.state.tick);

const races = computed(() => {
  tick.value;
  return store.getters[Getters.RACES];
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
          Lap {{ index + 1 }} - {{ race.length }}m
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
              <td class="px-2 py-1" :data-testid="`result-name-${index + 1}-${pos}`">{{ race.results[pos - 1]?.horse.name ?? '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
