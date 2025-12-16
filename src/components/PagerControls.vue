<script setup lang="ts">
   import { ref, computed, nextTick } from 'vue';

   const props = defineProps<{
      totalItems: number;
      modelValue: number; // (0-indexed)
      pageSize: number;
      unknownTotal?: boolean; //when true, total is unkown, (show "?")
      hasMore?: boolean; //when unknownTotal, indicates if there are more pages
   }>();

   const emit = defineEmits<{
      (e: 'update:modelValue', page: number): void;
      (e: 'update:pageSize', size: number): void;
   }>();

   const editCurrentPage = ref(false);
   const pageInput = ref<HTMLInputElement | null>(null);
   const pageDisplay = computed(() => props.modelValue + 1);
   const pageSizeAllowedValues = [20, 50, 100];
   const pageSize = computed({
      get: () => {
         return pageSizeAllowedValues.includes(props.pageSize) ? props.pageSize : 20;
      },
      set: (val: number) => emit('update:pageSize', val),
   });
   const totalPages = computed(() => Math.max(1, Math.ceil(props.totalItems / pageSize.value)));

   const displayTotalPages = computed(() => (props.unknownTotal ? '?' : totalPages.value));

   const canGoNext = computed(() => {
      if (props.unknownTotal) return props.hasMore;
      return props.modelValue < totalPages.value - 1;
   });

   const canGoLast = computed(() => {
      if (props.unknownTotal) return false;
      return props.modelValue < totalPages.value - 1;
   });

   function goToPage(p: number) {
      const maxPage = props.unknownTotal && props.hasMore ? p : totalPages.value - 1;
      const page = Math.min(Math.max(p, 0), maxPage);
      emit('update:modelValue', page);
   }

   function pageSpanClick() {
      editCurrentPage.value = !editCurrentPage.value;
      nextTick(() => {
         pageInput.value?.select();
      });
   }

   function onPageInput(event: Event) {
      const val = parseInt((event.target as HTMLInputElement).value, 10);
      if (!isNaN(val) && val >= 1 && val <= totalPages.value) {
         goToPage(val - 1); // Input is 1-indexed, internal is 0-indexed
      }
   }
</script>

<template>
   <div class="pager">
      <div class="pager-left">
         <label>
            Page Size:
            <select v-model.number="pageSize" class="pager-select">
               <option v-for="(size, index) of pageSizeAllowedValues" :value="size" :key="index">
                  {{ size }}
               </option>
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
         <span
            @click="unknownTotal ? null : pageSpanClick"
            class="page-display"
            :class="{ 'no-edit': unknownTotal }"
            >Page
            <span v-if="!editCurrentPage">{{ pageDisplay }}</span>
            <input
               v-else
               ref="pageInput"
               class="page-input"
               :value="pageDisplay"
               type="number"
               min="1"
               :max="totalPages"
               @input="onPageInput"
               @keydown.enter="editCurrentPage = false"
               @blur="editCurrentPage = false"
            />
            / {{ displayTotalPages }}</span
         >
         <button
            type="button"
            aria-label="Next Page"
            title="Next Page"
            @click="goToPage(modelValue + 1)"
            :disabled="!canGoNext"
         >
            &gt;
         </button>
         <button
            type="button"
            aria-label="Last Page"
            title="Last Page"
            @click="goToPage(totalPages - 1)"
            :disabled="!canGoLast"
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

   .page-display {
      cursor: pointer;
   }

   .page-display.no-edit {
      cursor: default;
   }

   .page-input {
      width: 50px;
   }
</style>
