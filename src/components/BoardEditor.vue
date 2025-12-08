<script setup lang="ts">
   import { ref } from 'vue';
   import type { ThemeConfig } from '../ts/board';

   defineProps<{
      theme: ThemeConfig;
      moveIndicator: number;
      boardLetters: string;
      colorLetters: string;
   }>();

   const emit = defineEmits<{
      'update:moveIndicator': [value: number];
      'update:boardLetters': [value: string];
      'update:colorLetters': [value: string];
   }>();

   const showBoardEdit = ref(false);

   function onMoveChange(event: Event) {
      const target = event.target as HTMLSelectElement;
      emit('update:moveIndicator', Number(target.value));
   }

   function onBoardInput(event: Event) {
      const target = event.target as HTMLInputElement;
      emit('update:boardLetters', target.value);
   }

   function onColorInput(event: Event) {
      const target = event.target as HTMLInputElement;
      emit('update:colorLetters', target.value);
   }

   defineExpose({
      showBoardEdit,
      setShowBoardEdit: (value: boolean) => {
         showBoardEdit.value = value;
      },
   });
</script>

<template>
   <div class="board-edit">
      <button
         title="click to show/hide"
         class="filters-toggle"
         type="button"
         @click="showBoardEdit = !showBoardEdit"
         :aria-expanded="showBoardEdit"
         aria-controls="board-input"
      >
         Edit Board
      </button>
      <div class="board-input" v-show="showBoardEdit">
         <div class="select-field">
            <select
               id="turn-input"
               class="select-field__input"
               :value="moveIndicator"
               @change="onMoveChange"
            >
               <option :value="1">{{ theme.blueName }} to play</option>
               <option :value="-1">{{ theme.redName }} to play</option>
            </select>
            <label for="turn-input" class="select-field__label">Turn</label>
            <div class="select-field__underline"></div>
         </div>
         <p class="helper-text">Note: changing board or color will clear history</p>
         <div class="text-field">
            <input
               id="board-input"
               class="text-field__input"
               type="text"
               :value="boardLetters"
               @input="onBoardInput"
               maxlength="25"
               placeholder=" "
            />
            <label for="board-input" class="text-field__label">Board</label>
            <div class="text-field__underline"></div>
         </div>
         <div class="text-field">
            <input
               id="color-input"
               class="text-field__input"
               type="text"
               :value="colorLetters"
               @input="onColorInput"
               maxlength="25"
               placeholder=" "
            />
            <label for="color-input" class="text-field__label">Color</label>
            <div class="text-field__underline"></div>
         </div>
      </div>
   </div>
</template>

<style scoped>
   .board-edit {
      padding-top: 4px;
      width: 300px;
      text-align: left;
   }

   .filters-toggle {
      background: transparent;
      color: v-bind('theme.defaultText');
      border: none;
      font: inherit;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      padding-bottom: 8px;
   }

   .filters-toggle::before {
      content: '▸';
      display: inline-block;
      transform-origin: center;
      transition: transform 0.2s ease;
   }

   .filters-toggle[aria-expanded='true']::before {
      transform: rotate(90deg);
   }

   .text-field {
      position: relative;
      width: 300px;
      margin-bottom: 12px;
   }

   .select-field {
      position: relative;
      margin-bottom: 12px;
   }

   .select-field__input {
      width: 100%;
      box-sizing: border-box;
      padding: 20px 12px 8px 12px;
      background-color: transparent;
      color: v-bind('theme.defaultText');
      font: inherit;
      font-size: 16px;
      border: none;
      border-radius: 0;
      outline: none;
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
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

   .text-field__input {
      width: 100%;
      box-sizing: border-box;
      padding: 20px 12px 8px 12px;
      background-color: transparent;
      color: v-bind('theme.defaultText');
      font-family: 'Roboto Mono', monospace;
      font-size: 16px;
      border: none;
      border-radius: 0;
      outline: none;
      text-transform: uppercase;
   }

   .text-field__label {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: v-bind('theme.defaultText');
      opacity: 0.7;
      font-size: 16px;
      pointer-events: none;
      transition: all 0.2s ease;
   }

   .text-field__input:focus + .text-field__label,
   .text-field__input:not(:placeholder-shown) + .text-field__label {
      top: 4px;
      transform: translateY(0);
      font-size: 12px;
      opacity: 1;
   }

   .text-field__underline {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 1px;
      background-color: v-bind('theme.defaultText');
      opacity: 0.5;
   }

   .text-field__underline::after {
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

   .text-field__input:focus ~ .text-field__underline::after {
      width: 100%;
   }

   .helper-text {
      font-size: 12px;
      opacity: 0.9;
      margin: 0 0 16px 12px;
      font-weight: normal;
   }
</style>
