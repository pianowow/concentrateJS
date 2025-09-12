<script setup>
   import { computed, defineProps } from 'vue';
   import BoardGridRowTile from './BoardGridRowTile.vue';
   const props = defineProps(['row']);
   const letters = computed(() => {
      let arr = [];
      for (let i = 0; i < 5; i++) {
         arr.push(props.row.slice(i, i + 1));
      }
      return arr;
   });
</script>

<template>
   <div class="row">
      <BoardGridRowTile v-for="(letter, index) in letters" :key="index" :letter="letter" />
   </div>
</template>

<style>
   .row {
      display: flex;
   }
</style>
