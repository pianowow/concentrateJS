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
         <div class="input-div">
            <label for="turn-input">Turn</label>
            <select id="turn-input" class="input" :value="moveIndicator" @change="onMoveChange">
               <option :value="1">{{ theme.blueName }} to play</option>
               <option :value="-1">{{ theme.redName }} to play</option>
            </select>
         </div>
         <h4>Note: changing board or color will clear history</h4>
         <div class="input-div">
            <label for="board-input">Board</label>
            <input
               id="board-input"
               class="input uppercase"
               type="text"
               :value="boardLetters"
               @input="onBoardInput"
               maxlength="25"
            />
         </div>
         <div class="input-div">
            <label for="color-input">Color</label>
            <input
               id="color-input"
               class="input uppercase"
               type="text"
               :value="colorLetters"
               @input="onColorInput"
               maxlength="25"
            />
         </div>
      </div>
   </div>
</template>

<style scoped>
   .board-edit {
      padding-top: 4px;
      width: 380px;
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

   .uppercase {
      text-transform: uppercase;
   }

   h4 {
      margin: 0;
      margin-bottom: 6px;
   }
</style>
