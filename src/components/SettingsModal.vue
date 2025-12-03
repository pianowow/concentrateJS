<script setup lang="ts">
   import type { ThemeConfig, ThemeName } from '../ts/board';

   interface WordListOption {
      value: string;
      label: string;
   }

   defineProps<{
      theme: ThemeConfig;
      themeSelected: string;
      availableThemes: string[];
      wordListSelected: string;
      availableWordLists: WordListOption[];
      useBadWords: boolean;
   }>();

   const emit = defineEmits<{
      close: [];
      'update:themeSelected': [theme: string];
      'update:wordListSelected': [wordList: string];
      'update:useBadWords': [value: boolean];
   }>();

   function onThemeChange(event: Event) {
      const target = event.target as HTMLSelectElement;
      emit('update:themeSelected', target.value as ThemeName);
   }

   function onWordListChange(event: Event) {
      const target = event.target as HTMLSelectElement;
      emit('update:wordListSelected', target.value);
   }

   function onUseBadWordsChange(event: Event) {
      const target = event.target as HTMLInputElement;
      emit('update:useBadWords', target.checked);
   }
</script>

<template>
   <div class="modal-overlay" @click.self="emit('close')">
      <div class="modal-content">
         <div class="modal-header">
            <h2>Settings</h2>
            <button class="modal-close" @click="emit('close')" aria-label="Close">&times;</button>
         </div>
         <div class="modal-body">
            <div class="input-div">
               <label for="settings-theme-input">Theme</label>
               <select
                  id="settings-theme-input"
                  class="input"
                  :value="themeSelected"
                  @change="onThemeChange"
               >
                  <option v-for="t in availableThemes" :key="t" :value="t">{{ t }}</option>
               </select>
            </div>
            <div class="input-div">
               <label for="settings-wordlist-input">Word List</label>
               <select
                  id="settings-wordlist-input"
                  class="input"
                  :value="wordListSelected"
                  @change="onWordListChange"
               >
                  <option v-for="wl in availableWordLists" :key="wl.value" :value="wl.value">
                     {{ wl.label }}
                  </option>
               </select>
            </div>
            <div class="input-div checkbox-div">
               <input
                  type="checkbox"
                  id="settings-badwords-input"
                  class="checkbox"
                  :checked="useBadWords"
                  @change="onUseBadWordsChange"
               />
               <label for="settings-badwords-input">Use bad words</label>
            </div>
         </div>
      </div>
   </div>
</template>

<style scoped>
   .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
   }

   .modal-content {
      background: v-bind('theme.defaultColor');
      color: v-bind('theme.defaultText');
      border: 1px solid v-bind('theme.defaultText');
      border-radius: 8px;
      padding: 20px;
      min-width: 300px;
      max-width: 90vw;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
   }

   .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
   }

   .modal-header h2 {
      margin: 0;
   }

   .modal-close {
      background: transparent;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: v-bind('theme.defaultText');
      padding: 0 4px;
      line-height: 1;
   }

   .modal-close:hover {
      opacity: 0.7;
   }

   .modal-body {
      display: flex;
      flex-direction: column;
      gap: 12px;
   }

   .input-div {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
   }

   .input-div.checkbox-div {
      justify-content: flex-start;
      padding-left: calc(100% - 150px);
   }

   .checkbox {
      width: 16px;
      height: 16px;
      margin: 0;
      cursor: pointer;
   }

   .input-div.checkbox-div label {
      cursor: pointer;
   }

   .input {
      width: 150px;
      box-sizing: border-box;
      padding: 2px 4px;
      background-color: v-bind('theme.defaultColor2');
      color: v-bind('theme.defaultText');
      height: 25px;
      font: inherit;
      border: 1px solid v-bind('theme.defaultText');
      border-radius: 4px;
   }
</style>
