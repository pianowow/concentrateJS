<script setup lang="ts">
   defineProps<{
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
         <div class="text-field">
            <input
               id="need-input"
               class="text-field__input"
               type="text"
               :value="needLetters"
               @input="onNeedInput"
               maxlength="25"
               placeholder=" "
            />
            <label for="need-input" class="text-field__label">Must Have</label>
            <div class="text-field__underline"></div>
         </div>
         <div class="text-field">
            <input
               id="not-input"
               class="text-field__input"
               type="text"
               :value="notLetters"
               @input="onNotInput"
               maxlength="25"
               placeholder=" "
            />
            <label for="not-input" class="text-field__label">Exclude</label>
            <div class="text-field__underline"></div>
         </div>
         <div class="text-field">
            <input
               id="word-filter-input"
               class="text-field__input"
               type="text"
               :value="wordFilter"
               @input="onWordFilterInput"
               maxlength="25"
               placeholder=" "
            />
            <label for="word-filter-input" class="text-field__label">Exact Pattern</label>
            <div class="text-field__underline"></div>
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

   .text-field {
      position: relative;
      width: 270px;
      margin-bottom: 12px;
   }

   .text-field__input {
      width: 100%;
      box-sizing: border-box;
      padding: 20px 12px 8px 12px;
      background-color: transparent;
      color: var(--theme-default-text);
      font: inherit;
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
      color: var(--theme-default-text);
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
      background-color: var(--theme-default-text);
      opacity: 0.5;
   }

   .text-field__underline::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      width: 0;
      height: 2px;
      background-color: var(--theme-default-text);
      transition: all 0.2s ease;
      transform: translateX(-50%);
   }

   .text-field__input:focus ~ .text-field__underline::after {
      width: 100%;
   }
</style>
