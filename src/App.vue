<script setup lang="ts">
import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
  <header>
    <div class="wrapper">
      <HelloWorld msg="You did it!" />
    </div>
  </header>
</template>

<style scoped>
header {
  line-height: 1.5;
}

main {
  display: flex;
  justify-content: center;
  padding: 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
