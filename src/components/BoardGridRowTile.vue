<script setup lang="ts">
   import { computed } from 'vue';
   const props = defineProps(['letter', 'color', 'size']);
   const tileSize = computed(() => `${props.size}px`);
</script>

<template>
   <div :class="['letter', props.color]">{{ props.letter }}</div>
</template>

<style>
   .letter {
      width: v-bind(tileSize);
      height: v-bind(tileSize);
      /* dynamic fontsize between 80% of the tile size (when it's tiny) and up to the standard 1em */
      font-size: min(1em, calc(v-bind(tileSize) * 0.8));
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 1px;
   }
</style>
