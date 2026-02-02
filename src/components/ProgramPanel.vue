<script setup lang="ts">
</script>

<template>
  <div class="bg-white border border-gray-300">
    <div class="bg-blue-500 text-white px-3 py-2 font-bold text-center">
      Program
    </div>

    <!-- Lap sections -->
    <div class="max-h-96 overflow-y-auto">
      <div v-for="lap in 6" :key="lap" class="border-b border-gray-300">
        <div class="bg-orange-400 text-white px-2 py-1 text-sm font-bold">
          Lap {{ lap }} - {{ 1000 + lap * 200 }}m
        </div>
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-gray-200">
              <th class="px-2 py-1 text-left">Position</th>
              <th class="px-2 py-1 text-left">Name</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pos in 10" :key="pos" class="border-b border-gray-100">
              <td class="px-2 py-1">{{ pos }}</td>
              <td class="px-2 py-1">Horse Name</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
