<script setup lang="ts">
   import { computed } from 'vue';
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
   <div class="board-wrapper" :style="{ height: size * 5 + 'px', width: size * 5 + 'px' }">
      <div v-for="(row, rowIndex) in letterRows" class="row" :key="rowIndex">
         <div
            v-for="(letter, index) in row"
            :key="index"
            :class="['letter', colorRows[rowIndex][index]]"
            :style="{
               width: size + 'px',
               height: size + 'px',
               fontSize: size * 0.8 + 'px',
            }"
         >
            {{ letter }}
         </div>
      </div>
   </div>
</template>

<style>
   .b {
      background-color: var(--theme-blue);
      color: var(--theme-blue-text);
   }
   .B {
      background-color: var(--theme-defended-blue);
      color: var(--theme-defended-blue-text);
   }
   .r {
      background-color: var(--theme-red);
      color: var(--theme-red-text);
   }
   .R {
      background-color: var(--theme-defended-red);
      color: var(--theme-defended-red-text);
   }
   .w {
      background-color: var(--theme-default-color);
      color: var(--theme-default-text);
   }
   .board-wrapper > .row:nth-child(odd) > .letter.w:nth-child(even),
   .board-wrapper > .row:nth-child(even) > .letter.w:nth-child(odd) {
      background-color: var(--theme-default-color2);
   }
   .row {
      display: flex;
   }
   .letter {
      display: flex;
      justify-content: center;
      align-items: center;
   }
</style>
