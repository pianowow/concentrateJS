<script setup lang="ts">
   // Component: HistoryTable
   import { ref, toRefs, computed, watch } from 'vue';
   import BoardGrid from './BoardGrid.vue';
   import type { ThemeConfig } from '../ts/board';
   import { computeScoreBar } from '../ts/util';

   interface HistoryItem {
      type: number; // 1 blue, -1 red, 0 initial
      text: string; // word played or board letters
      colors: string;
      score: number;
   }

   const props = defineProps<{
      historyList: HistoryItem[];
      boardLetters: string;
      theme: ThemeConfig;
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
   <div class="history-grid">
      <h3>History</h3>
      <div class="table-wrapper">
         <div class="header-container">
            <table class="results-table">
               <colgroup>
                  <col class="col-move" />
                  <col class="col-word" />
                  <col class="col-board" />
               </colgroup>
               <thead>
                  <tr>
                     <th style="text-align: left">Move</th>
                     <th style="text-align: left">Word</th>
                     <th style="text-align: left">Board</th>
                  </tr>
               </thead>
            </table>
         </div>
         <div class="table-body-container">
            <table class="results-table">
               <colgroup>
                  <col class="col-move" />
                  <col class="col-word" />
                  <col class="col-board" />
               </colgroup>
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
                     <td class="word-cell-td">
                        <div class="word-cell">
                           <span class="word-text">{{ entry.text }}</span>
                           <div
                              class="score-bar"
                              :class="{ 'score-bar-win': computeScoreBar(entry.score).isWin }"
                              :title="'Score: ' + entry.score"
                           >
                              <template v-if="computeScoreBar(entry.score).isWin">
                                 <div
                                    class="score-fill red"
                                    :style="{
                                       width: computeScoreBar(entry.score).redPercent + '%',
                                    }"
                                 ></div>
                                 <div
                                    class="score-fill blue"
                                    :style="{
                                       width: computeScoreBar(entry.score).bluePercent + '%',
                                    }"
                                 ></div>
                              </template>
                              <template v-else>
                                 <div class="score-bar-left">
                                    <div
                                       v-if="computeScoreBar(entry.score).redPercent > 0"
                                       class="score-fill red"
                                       :style="{
                                          width: computeScoreBar(entry.score).redPercent + '%',
                                       }"
                                    ></div>
                                 </div>
                                 <div class="score-bar-right">
                                    <div
                                       v-if="computeScoreBar(entry.score).bluePercent > 0"
                                       class="score-fill blue"
                                       :style="{
                                          width: computeScoreBar(entry.score).bluePercent + '%',
                                       }"
                                    ></div>
                                 </div>
                              </template>
                           </div>
                        </div>
                     </td>
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
   </div>
</template>

<style scoped>
   .history-grid {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
   }

   .history-grid h3 {
      margin: 0;
      margin-bottom: 6px;
   }

   .table-wrapper {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      border: 1px solid v-bind('theme.defaultText');
      border-radius: 6px;
      overflow: hidden;
   }

   .table-body-container {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      scrollbar-color: v-bind('theme.defaultText') transparent;
   }

   .header-container {
      flex: 0 0 auto;
      overflow-y: scroll;
      scrollbar-color: transparent transparent;
      background: v-bind('theme.defaultColor2');
      filter: brightness(1.05);
      border-bottom: 1px solid v-bind('theme.defaultText');
   }

   .col-move {
      width: 60px;
   }

   .col-word {
      width: auto;
   }

   .col-board {
      width: 70px;
   }

   .word-cell {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
      justify-content: center;
      padding: 6px 8px;
      z-index: 0;
   }

   .word-text {
      font-weight: 500;
   }

   .score-bar {
      display: flex;
      height: 10px;
      width: 100%;
      border: 1px solid v-bind('theme.defaultText');
      border-radius: 2px;
      overflow: hidden;
      opacity: 0.7;
   }

   .score-bar-left {
      flex: 1;
      display: flex;
      justify-content: flex-end;
      border-right: 1px solid v-bind('theme.defaultText');
   }

   .score-bar-right {
      flex: 1;
      display: flex;
      justify-content: flex-start;
   }

   .score-bar-win .score-fill {
      flex: none;
   }

   .score-fill {
      height: 100%;
      transition: width 0.2s ease;
   }

   .score-fill.blue {
      background-color: v-bind('theme.defendedBlue');
   }

   .score-fill.red {
      background-color: v-bind('theme.defendedRed');
   }

   .results-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
   }

   .results-table thead th {
      background: transparent;
      color: v-bind('theme.defaultText');
      font-weight: 600;
      padding: 8px 10px;
      border-right: 1px solid v-bind('theme.defaultText');
      white-space: nowrap;
   }

   .results-table thead th:last-child {
      border-right: none;
   }

   .results-table tbody td {
      padding: 6px 8px;
      vertical-align: middle;
   }

   .results-table tbody td.word-cell-td {
      position: relative;
      padding: 0;
   }

   .results-table tbody td:last-child {
      border-right: none;
   }

   .results-table tbody tr {
      background: v-bind('theme.defaultColor');
   }

   .results-table tbody tr:nth-child(even) {
      background: v-bind('theme.defaultColor2');
   }

   .results-table tbody tr.selected {
      background: v-bind('theme.blue');
   }

   .results-table tbody tr:hover td {
      position: relative;
   }

   .results-table tbody tr:hover td::after {
      content: '';
      position: absolute;
      inset: 0;
      background: v-bind('theme.defaultText');
      opacity: 0.05;
      pointer-events: none;
      z-index: 2;
   }

   .move-cell-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
   }

   .move-cell {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      border: 1px solid v-bind('theme.defaultText');
   }

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
      border: 1px solid v-bind('theme.defaultColor2');
      background: v-bind('theme.defaultColor2');
      color: v-bind('theme.defaultText');
      border-radius: 4px;
      padding: 2px 6px;
      font: inherit;
   }

   .pager button {
      border: none;
      background: transparent;
      padding: 4px 4px;
      cursor: pointer;
      color: v-bind('theme.defaultText');
   }

   .pager button:disabled {
      opacity: 0.6;
      cursor: default;
   }

   @media (max-width: 1150px) {
      .history-grid {
         flex: 0 0 auto;
      }

      .table-wrapper {
         flex: 0 0 auto;
         max-height: 380px;
      }
   }
</style>
