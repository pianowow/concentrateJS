<script setup lang="ts">
   import { computed } from 'vue';
   import BoardGridRow from './BoardGridRow.vue';
   const props = defineProps(['letters', 'colors', 'theme', 'size']);
   const letters = computed(() => props.letters.padEnd(25, ' '));
   const colors = computed(() => props.colors.padEnd(25, 'w'));
   const letterRows = computed(() => {
      const arr = [];
      for (let i = 0; i < 25; i += 5) {
         arr.push(letters.value.slice(i, i + 5));
      }
      return arr;
   });
   const colorRows = computed(() => {
      const arr = [];
      for (let i = 0; i < 25; i += 5) {
         arr.push(colors.value.slice(i, i + 5));
      }
      return arr;
   });
</script>

<template>
   <div class="board-wrapper">
      <BoardGridRow
         v-for="(rowLetters, index) in letterRows"
         :key="index"
         :letters="rowLetters"
         :colors="colorRows[index]"
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
   .W {
      background-color: v-bind('props.theme.defaultColor');
   }
</style>
