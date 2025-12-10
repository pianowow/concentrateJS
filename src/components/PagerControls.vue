<script setup lang="ts">
   import { ref, computed, watch } from 'vue';

   const props = defineProps<{
      totalItems: number;
      modelValue: number; // (0-indexed)
      pageSize: number;
   }>();

   const emit = defineEmits<{
      (e: 'update:modelValue', page: number): void;
      (e: 'update:pageSize', size: number): void;
   }>();

   const editCurrentPage = ref(false);
   const localPageSize = ref(props.pageSize);

   const totalPages = computed(() =>
      Math.max(1, Math.ceil(props.totalItems / localPageSize.value))
   );

   function goToPage(p: number) {
      const page = Math.min(Math.max(p, 0), totalPages.value - 1);
      emit('update:modelValue', page);
   }

   function pageSpanClick() {
      editCurrentPage.value = !editCurrentPage.value;
   }

   function onPageInputChange(event: Event) {
      const val = parseInt((event.target as HTMLInputElement).value, 10);
      if (!isNaN(val)) {
         goToPage(val - 1); // Input is 1-indexed, internal is 0-indexed
      }
      editCurrentPage.value = false;
   }

   watch(localPageSize, (newSize) => {
      emit('update:pageSize', newSize);
   });

   watch(
      () => props.pageSize,
      (newSize) => {
         localPageSize.value = newSize;
      }
   );
</script>

<template>
   <div class="pager">
      <div class="pager-left">
         <label>
            Page Size:
            <select v-model.number="localPageSize" class="pager-select">
               <option :value="20">20</option>
               <option :value="50">50</option>
               <option :value="100">100</option>
            </select>
         </label>
      </div>
      <div class="pager-right">
         <button
            type="button"
            aria-label="First Page"
            title="First Page"
            @click="goToPage(0)"
            :disabled="modelValue === 0"
         >
            |&lt;
         </button>
         <button
            type="button"
            aria-label="Previous Page"
            title="Previous Page"
            @click="goToPage(modelValue - 1)"
            :disabled="modelValue === 0"
         >
            &lt;
         </button>
         <span @click="pageSpanClick">Page {{ modelValue + 1 }} / {{ totalPages }}</span>
         <input
            v-if="editCurrentPage"
            :value="modelValue + 1"
            type="number"
            min="1"
            :max="totalPages"
            @change="onPageInputChange"
            @blur="editCurrentPage = false"
         />
         <button
            type="button"
            aria-label="Next Page"
            title="Next Page"
            @click="goToPage(modelValue + 1)"
            :disabled="modelValue >= totalPages - 1"
         >
            &gt;
         </button>
         <button
            type="button"
            aria-label="Last Page"
            title="Last Page"
            @click="goToPage(totalPages - 1)"
            :disabled="modelValue >= totalPages - 1"
         >
            &gt;|
         </button>
      </div>
   </div>
</template>

<style scoped>
   .pager {
      display: flex;
      gap: 20px;
      justify-content: right;
   }

   .pager-left {
      display: flex;
      align-items: center;
   }

   .pager-right {
      display: flex;
      gap: 8px;
      align-items: center;
   }

   .pager-select {
      border: 1px solid var(--theme-default-color2);
      background: var(--theme-default-color2);
      color: var(--theme-default-text);
      border-radius: 4px;
      padding: 2px 6px;
      font: inherit;
   }

   .pager button {
      border: none;
      background: transparent;
      padding: 4px 4px;
      cursor: pointer;
      color: var(--theme-default-text);
   }

   .pager button:disabled {
      opacity: 0.6;
      cursor: default;
   }
</style>
