<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from 'vuex';
import { Getters } from '@/store/types';

const store = useStore();
const horses = computed(() => store.getters[Getters.HORSES]);
</script>

<template>
  <aside class="bg-white border border-gray-300" data-testid="horse-list">
    <div class="bg-red-500 text-white px-3 py-2 font-bold">
      Horse List (1-20)
    </div>
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-gray-300">
          <th class="px-2 py-1 text-left">Name</th>
          <th class="px-2 py-1 text-left">Condition</th>
          <th class="px-2 py-1 text-left">Color</th>
        </tr>
      </thead>
      <tbody data-testid="horse-list-body">
        <tr
          v-for="horse in horses"
          :key="horse.id"
          class="border-b border-gray-200"
          data-testid="horse-row"
        >
          <td class="px-2 py-1">{{ horse.name }}</td>
          <td class="px-2 py-1">{{ horse.condition }}</td>
          <td class="px-2 py-1">
            <span
              class="inline-block w-4 h-4 rounded"
              :style="{ backgroundColor: horse.color }"
            ></span>
          </td>
        </tr>
      </tbody>
    </table>
  </aside>
</template>
