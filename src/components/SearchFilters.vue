<script setup lang="ts">
   import type { ThemeConfig } from '../ts/board';

   defineProps<{
      theme: ThemeConfig;
      needLetters: string;
      notLetters: string;
      wordFilter: string;
   }>();

   const emit = defineEmits<{
      'update:needLetters': [value: string];
      'update:notLetters': [value: string];
      'update:wordFilter': [value: string];
   }>();

   function onNeedInput(event: Event) {
      const target = event.target as HTMLInputElement;
      emit('update:needLetters', target.value);
   }

   function onNotInput(event: Event) {
      const target = event.target as HTMLInputElement;
      emit('update:notLetters', target.value);
   }

   function onWordFilterInput(event: Event) {
      const target = event.target as HTMLInputElement;
      emit('update:wordFilter', target.value);
   }
</script>

<template>
   <div class="filters-section">
      <div class="filters-panel">
         <div class="input-div">
            <label for="need-input">Must Have</label>
            <input
               id="need-input"
               class="input"
               type="text"
               :value="needLetters"
               @input="onNeedInput"
               maxlength="25"
            />
         </div>
         <div class="input-div">
            <label for="not-input">Exclude</label>
            <input
               id="not-input"
               class="input"
               type="text"
               :value="notLetters"
               @input="onNotInput"
               maxlength="25"
            />
         </div>
         <div class="input-div">
            <label for="word-filter-input">Exact Pattern</label>
            <input
               id="word-filter-input"
               class="input"
               type="text"
               :value="wordFilter"
               @input="onWordFilterInput"
               maxlength="25"
            />
         </div>
      </div>
   </div>
</template>

<style scoped>
   .filters-section {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 4px;
   }

   .filters-panel {
      display: flex;
      flex-direction: column;
   }

   .input-div {
      width: 370px;
      display: flex;
      align-items: flex-end;
      justify-content: right;
      padding-bottom: 8px;
   }

   .input-div label {
      margin-right: 4px;
   }

   .input {
      width: 270px;
      margin-left: 2px;
      box-sizing: border-box;
      display: inline-block;
      padding: 2px 2px;
      background-color: v-bind('theme.defaultColor2');
      color: v-bind('theme.defaultText');
      height: 25px;
      font: inherit;
      border: 1px solid v-bind('theme.defaultText');
      border-radius: 4px;
   }
</style>
