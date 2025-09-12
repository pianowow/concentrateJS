<script setup>
   import { defineProps } from 'vue';
   import BoardGridRowTile from './BoardGridRowTile.vue';
   const props = defineProps(['row']);
</script>

<template>
   <div class="row">
      <BoardGridRowTile v-for="(letter, index) in props.row" :key="index" :letter="letter" />
   </div>
</template>

<style>
   .row {
      display: flex;
   }
</style>
