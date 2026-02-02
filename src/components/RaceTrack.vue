<script setup lang="ts">
</script>

<template>
  <div class="flex flex-col bg-green-600 border border-gray-300">
    <!-- Lanes -->
    <div class="flex-1">
      <div
        v-for="lane in 10"
        :key="lane"
        class="flex items-center h-12 border-b border-dashed border-green-800"
      >
        <div class="w-8 bg-yellow-400 h-full flex items-center justify-center font-bold text-sm">
          {{ lane }}
        </div>
        <div class="flex-1 relative">
          <!-- Horse placeholder -->
          <div class="absolute left-4 text-2xl">
            🐎
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex justify-between items-center px-4 py-2 bg-green-700 text-white">
      <span class="font-bold">Lap 1 - 1200m</span>
      <span class="font-bold">FINISH</span>
    </div>
  </div>
</template>
