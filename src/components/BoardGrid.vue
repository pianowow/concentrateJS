<script setup>
   import { computed } from 'vue';
   import BoardGridRow from './BoardGridRow.vue';
   const props = defineProps(['board']);
   const rows = computed(() => {
      const arr = [];
      for (let i = 0; i < 25; i += 5) {
         arr.push(props.board.slice(i, i + 5));
      }
      return arr;
   });
</script>

<template>
   <BoardGridRow v-for="(row, index) in rows" :key="index" :row="row" />
</template>
