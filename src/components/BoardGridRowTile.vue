<script setup lang="ts">
   const props = defineProps(['letter', 'color', 'size']);
</script>

<template>
   <div
      :class="['letter', props.color]"
      :style="{
         width: props.size + 'px',
         height: props.size + 'px',
         fontSize: props.size * 0.8 + 'px',
      }"
   >
      {{ props.letter }}
   </div>
</template>

<style>
   .letter {
      display: flex;
      justify-content: center;
      align-items: center;
   }
</style>
