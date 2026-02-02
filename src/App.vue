<script setup lang="ts">
import HeaderBar from './components/HeaderBar.vue'
import HorseList from './components/HorseList.vue'
import RaceTrack from './components/RaceTrack.vue'
import ResultsPanel from './components/ResultsPanel.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <HeaderBar />

    <main class="flex-1 flex flex-col lg:flex-row gap-4 p-4">
      <!-- Left sidebar - Horse List -->
      <div class="w-full lg:w-64 shrink-0 order-2 lg:order-1">
        <HorseList />
      </div>

      <!-- Center - Race Track -->
      <div class="flex-1 order-1 lg:order-2 min-h-[500px]">
        <RaceTrack />
      </div>

      <!-- Right sidebar - Results -->
      <div class="w-full lg:w-72 shrink-0 order-3">
        <ResultsPanel />
      </div>
    </main>
  </div>
</template>
