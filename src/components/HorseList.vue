<script setup lang="ts">
</script>

<template>
  <aside class="bg-white border border-gray-300">
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
      <tbody>
        <!-- Placeholder rows -->
        <tr class="border-b border-gray-200">
          <td class="px-2 py-1">Ada Lovelace</td>
          <td class="px-2 py-1">80</td>
          <td class="px-2 py-1">Red</td>
        </tr>
        <tr class="border-b border-gray-200">
          <td class="px-2 py-1">Grace Hopper</td>
          <td class="px-2 py-1">45</td>
          <td class="px-2 py-1">Blue</td>
        </tr>
        <tr class="border-b border-gray-200">
          <td class="px-2 py-1">Margaret Hamilton</td>
          <td class="px-2 py-1">60</td>
          <td class="px-2 py-1">Yellow</td>
        </tr>
      </tbody>
    </table>
  </aside>
</template>
