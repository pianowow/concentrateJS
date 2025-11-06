<script setup lang="ts">
   import { computed } from 'vue';
   import BoardGridRow from './BoardGridRow.vue';
   const props = defineProps(['letters', 'colors', 'theme', 'size']);
   const letters = computed(() => {
      const arr = [];
      for (let i = 0; i < 25; i += 5) {
         arr.push(props.letters.slice(i, i + 5));
      }
      return arr;
   });
   const colors = computed(() => {
      const arr = [];
      for (let i = 0; i < 25; i += 5) {
         arr.push(props.colors.slice(i, i + 5));
      }
      return arr;
   });
</script>

<template>
   <div class="board-wrapper">
      <BoardGridRow
         v-for="(rowLetters, index) in letters"
         :key="index"
         :letters="rowLetters"
         :colors="colors[index]"
         :size="props.size"
      />
   </div>
</template>

<style>
   .b {
      background-color: v-bind('props.theme.blue');
   }
   .B {
      background-color: v-bind('props.theme.defendedBlue');
   }
   .r {
      background-color: v-bind('props.theme.red');
   }
   .R {
      background-color: v-bind('props.theme.defendedRed');
   }
   .w {
      background-color: v-bind('props.theme.defaultColor');
   }
</style>
