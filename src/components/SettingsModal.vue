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
            <div class="select-field">
               <select
                  id="settings-theme-input"
                  class="select-field__input"
                  :value="themeSelected"
                  @change="onThemeChange"
               >
                  <option v-for="t in availableThemes" :key="t" :value="t">{{ t }}</option>
               </select>
               <label for="settings-theme-input" class="select-field__label">Theme</label>
               <div class="select-field__underline"></div>
            </div>
            <div class="select-field">
               <select
                  id="settings-wordlist-input"
                  class="select-field__input"
                  :value="wordListSelected"
                  @change="onWordListChange"
               >
                  <option v-for="wl in availableWordLists" :key="wl.value" :value="wl.value">
                     {{ wl.label }}
                  </option>
               </select>
               <label for="settings-wordlist-input" class="select-field__label">Word List</label>
               <div class="select-field__underline"></div>
            </div>
            <div class="checkbox-field">
               <input
                  type="checkbox"
                  id="settings-badwords-input"
                  class="checkbox-field__input"
                  :checked="useBadWords"
                  @change="onUseBadWordsChange"
               />
               <label for="settings-badwords-input" class="checkbox-field__label"
                  >Use bad words</label
               >
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
   }

   .select-field {
      position: relative;
      width: 100%;
      margin-bottom: 12px;
   }

   .select-field__input {
      width: 100%;
      box-sizing: border-box;
      padding: 20px 12px 8px 12px;
      background-color: v-bind('theme.defaultColor2');
      color: v-bind('theme.defaultText');
      font: inherit;
      font-size: 16px;
      border: none;
      border-radius: 4px 4px 0 0;
      outline: none;
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      transition: background-color 0.2s ease;
   }

   .select-field__input:hover {
      filter: brightness(1.05);
   }

   .select-field__input:focus {
      filter: brightness(1.05);
   }

   .select-field__input option {
      background-color: v-bind('theme.defaultColor2');
      color: v-bind('theme.defaultText');
   }

   .select-field__label {
      position: absolute;
      left: 12px;
      top: 4px;
      color: v-bind('theme.defaultText');
      opacity: 0.7;
      font-size: 12px;
      pointer-events: none;
   }

   .select-field__underline {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 1px;
      background-color: v-bind('theme.defaultText');
      opacity: 0.5;
   }

   .select-field__underline::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      width: 0;
      height: 2px;
      background-color: v-bind('theme.defaultText');
      transition: all 0.2s ease;
      transform: translateX(-50%);
   }

   .select-field__input:focus ~ .select-field__underline::after {
      width: 100%;
   }

   .checkbox-field {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      cursor: pointer;
   }

   .checkbox-field__input {
      appearance: none;
      width: 18px;
      height: 18px;
      border: 2px solid v-bind('theme.defaultText');
      border-radius: 2px;
      background-color: transparent;
      cursor: pointer;
      position: relative;
      transition: all 0.2s ease;
   }

   .checkbox-field__input:hover {
      border-color: v-bind('theme.defaultText');
      background-color: v-bind('theme.defaultColor2');
   }

   .checkbox-field__input:checked {
      background-color: v-bind('theme.defaultText');
      border-color: v-bind('theme.defaultText');
   }

   .checkbox-field__input:checked::after {
      content: '';
      position: absolute;
      left: 5px;
      top: 1px;
      width: 4px;
      height: 9px;
      border: solid v-bind('theme.defaultColor');
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
   }

   .checkbox-field__label {
      color: v-bind('theme.defaultText');
      cursor: pointer;
      font-size: 16px;
   }
</style>
