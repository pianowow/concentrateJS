<script setup lang="ts">
   import BoardGridRowTile from './BoardGridRowTile.vue';
   const props = defineProps(['letters', 'colors', 'size']);
</script>

<template>
   <div class="row">
      <BoardGridRowTile
         v-for="(letter, index) in props.letters"
         :key="index"
         :letter="letter"
         :color="props.colors.charAt(index)"
         :size="props.size"
      />
   </div>
</template>

<style>
   .row {
      display: flex;
   }
</style>
