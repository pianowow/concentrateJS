<script setup lang="ts">
   // Component: HistoryTable
   import { ref, toRefs, computed, watch } from 'vue';
   import BoardGrid from './BoardGrid.vue';
   import type { LightColorTheme } from '../ts/board';

   interface HistoryItem {
      type: number; // 1 blue, -1 red, 0 initial
      text: string; // word played or board letters
      colors: string;
      score: number;
   }

   const props = defineProps<{
      historyList: HistoryItem[];
      boardLetters: string;
      theme: LightColorTheme;
      boardPreviewCellSize: number;
      selectedIndex: number | null;
   }>();

   const emit = defineEmits<{
      (e: 'row-click', entry: HistoryItem, index: number): void;
   }>();

   const { historyList, boardLetters, theme, boardPreviewCellSize, selectedIndex } = toRefs(props);

   // Pager state (local to this component)
   const pageSize = ref(20);
   const currentPage = ref(0);

   const totalPages = computed(() =>
      Math.max(1, Math.ceil(historyList.value.length / pageSize.value))
   );
   const startIndex = computed(() => currentPage.value * pageSize.value);
   const pagedHistory = computed(() =>
      historyList.value.slice(startIndex.value, startIndex.value + pageSize.value)
   );
   const rowHeightPx = computed(() => boardPreviewCellSize.value * 5 + 4);

   function goToPage(p: number) {
      currentPage.value = Math.min(Math.max(p, 0), totalPages.value - 1);
   }

   function onRowClick(entry: HistoryItem, localIndex: number) {
      const globalIndex = startIndex.value + localIndex;
      emit('row-click', entry, globalIndex);
   }

   // Keep the page aligned with the selected index and page size
   watch([selectedIndex, pageSize], () => {
      currentPage.value =
         selectedIndex.value === null ? 0 : Math.floor(selectedIndex.value / pageSize.value);
   });

   // Reset to first page when the list changes if selection is cleared
   watch(historyList, () => {
      if (selectedIndex.value === null) {
         currentPage.value = 0;
      } else {
         currentPage.value = Math.floor(selectedIndex.value / pageSize.value);
      }
   });
</script>

<template>
   <div class="table-container">
      <table class="results-table">
         <thead>
            <tr>
               <th style="text-align: left; width: 80px">Move</th>
               <th style="text-align: left">Word</th>
               <th style="text-align: left; width: 100px">Score</th>
               <th style="text-align: left; width: 80px">Board</th>
            </tr>
         </thead>
         <tbody>
            <tr
               v-for="(entry, i) in pagedHistory"
               :key="startIndex + i + '-' + entry.text"
               :class="{ selected: startIndex + i === selectedIndex }"
               :style="{ height: rowHeightPx + 'px', cursor: 'pointer' }"
               @click="onRowClick(entry, i)"
            >
               <td>
                  <div class="move-cell-wrapper">
                     <div
                        class="move-cell"
                        :style="{
                           backgroundColor:
                              entry.type === 1
                                 ? theme.defendedBlue
                                 : entry.type === -1
                                   ? theme.defendedRed
                                   : theme.defaultColor,
                        }"
                     ></div>
                  </div>
               </td>
               <td>{{ entry.text }}</td>
               <td>{{ entry.score }}</td>
               <td>
                  <BoardGrid
                     :letters="boardLetters"
                     :colors="entry.colors"
                     :theme="theme"
                     :size="boardPreviewCellSize"
                  />
               </td>
            </tr>
         </tbody>
      </table>
   </div>
   <div class="pager">
      <div class="pager-left">
         <label>
            Page Size:
            <select v-model.number="pageSize" class="pager-select">
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
            :disabled="currentPage === 0"
         >
            |&lt;
         </button>
         <button
            type="button"
            aria-label="Previous Page"
            title="Previous Page"
            @click="goToPage(currentPage - 1)"
            :disabled="currentPage === 0"
         >
            &lt;
         </button>
         <span>Page {{ currentPage + 1 }} / {{ totalPages }}</span>
         <button
            type="button"
            aria-label="Next Page"
            title="Next Page"
            @click="goToPage(currentPage + 1)"
            :disabled="currentPage >= totalPages - 1"
         >
            &gt;
         </button>
         <button
            type="button"
            aria-label="Last Page"
            title="Last Page"
            @click="goToPage(totalPages - 1)"
            :disabled="currentPage >= totalPages - 1"
         >
            &gt;|
         </button>
      </div>
   </div>
</template>

<style>
   /* Reuse global styles from SearchResults.vue: .table-container, .results-table, .pager, etc. */
   /* HistoryTable-specific styles can be added here if needed. */
</style>
