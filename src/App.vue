<script setup lang="ts">
import HeaderBar from './components/HeaderBar.vue'
import HorseList from './components/HorseList.vue'
import RaceTrack from './components/RaceTrack.vue'
import ResultsPanel from './components/ResultsPanel.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <HeaderBar />

    <main class="flex-1 flex gap-4 p-4">
      <!-- Left sidebar - Horse List -->
      <div class="w-64 shrink-0">
        <HorseList />
      </div>

      <!-- Center - Race Track -->
      <div class="flex-1">
        <RaceTrack />
      </div>

      <!-- Right sidebar - Results -->
      <div class="w-72 shrink-0">
        <ResultsPanel />
      </div>
    </main>
  </div>
</template>
