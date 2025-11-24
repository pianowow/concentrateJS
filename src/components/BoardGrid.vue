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
      color: v-bind('props.theme.blueText');
   }
   .B {
      background-color: v-bind('props.theme.defendedBlue');
      color: v-bind('props.theme.defendedBlueText');
   }
   .r {
      background-color: v-bind('props.theme.red');
      color: v-bind('props.theme.redText');
   }
   .R {
      background-color: v-bind('props.theme.defendedRed');
      color: v-bind('props.theme.defendedRedText');
   }
   .w {
      background-color: v-bind('props.theme.defaultColor');
      color: v-bind('props.theme.defaultText');
   }
   .board-wrapper > .row:nth-child(odd) > .letter.w:nth-child(even),
   .board-wrapper > .row:nth-child(even) > .letter.w:nth-child(odd) {
      background-color: v-bind('props.theme.defaultColor2');
   }
</style>
