<script setup lang="ts">
   import { ref, toRefs, computed, watch } from 'vue';
   import type { Player, Play } from '../ts/player';
   import type { LightColorTheme } from '../ts/board';
   import { mapsToColors } from '../ts/board';
   import BoardGrid from './BoardGrid.vue';

   const props = defineProps<{
      boardLetters: string;
      player: Player | null;
      theme: LightColorTheme;
      searchResults: Play[];
      boardPreviewCellSize: number;
      move: number;
      wordFilter: string;
   }>();

   const emit = defineEmits<{
      (e: 'add-to-history', play: Play): void;
   }>();

   const { boardLetters, player, theme, searchResults, boardPreviewCellSize, move, wordFilter } =
      toRefs(props);

   // Lightweight pager state
   const pageSize = ref(20);
   const currentPage = ref(0);
   const filteredResults = computed(() => {
      const q = (wordFilter.value || '').trim().toUpperCase();
      if (!q) return searchResults.value;
      return searchResults.value.filter((p) => (p.word || '').toUpperCase().includes(q));
   });
   const totalPages = computed(() =>
      Math.max(1, Math.ceil(filteredResults.value.length / pageSize.value))
   );
   const pagedResults = computed(() => {
      const start = currentPage.value * pageSize.value;
      return filteredResults.value.slice(start, start + pageSize.value);
   });
   const rowHeightPx = computed(() => boardPreviewCellSize.value * 5 + 4);
   function goToPage(p: number) {
      currentPage.value = Math.min(Math.max(p, 0), totalPages.value - 1);
   }
   function addToHistory(play: Play) {
      emit('add-to-history', play);
   }
   watch([wordFilter, pageSize, searchResults], () => {
      currentPage.value = 0;
   });

   /**
    * Returns the value of the Finish column for a play
    * @param play - the play to evaluate
    */
   function computeFinish(play: Play): string {
      if ((play.score > 999 && move.value == 1) || (play.score < -999 && move.value == -1)) {
         return '<span title="Winning play">🏆</span>';
      } else {
         if (play.ending_soon === true) {
            if (play.losing) {
               return '<span title="Opponent can win next move.">⚠️</span>';
            } else {
               return '<span title="Ending soon, but opponent doesn\'t have a win.">🏁</span>';
            }
         } else if (play.ending_soon === undefined) {
            return '';
         } else {
            return '<span title="Game can\'t end next move.">-</span>';
         }
      }
   }

   function computeEndgameForCurrentPage() {
      if (!player.value) return;
      for (const play of pagedResults.value) {
         const [ending_soon, losing] = player.value.endgameCheck(
            boardLetters.value,
            play.blue_map,
            play.red_map,
            move.value
         );
         play.ending_soon = ending_soon;
         play.losing = losing;
      }
   }
   watch(
      [currentPage, searchResults, player, boardLetters, wordFilter, pageSize],
      () => {
         computeEndgameForCurrentPage();
      },
      { immediate: true }
   );
</script>

<template>
   <div class="results-grid">
      <div class="table-container">
         <table class="results-table">
            <thead>
               <tr>
                  <th style="text-align: left">Word</th>
                  <th style="text-align: left; width: 100px">Score</th>
                  <th style="text-align: left; width: 80px">Board</th>
                  <th style="text-align: left; width: 80px">Finish</th>
                  <th style="text-align: left; width: 80px">Action</th>
               </tr>
            </thead>
            <tbody>
               <tr
                  v-for="play in pagedResults"
                  :key="play.word + '-' + play.blue_map + '-' + play.red_map"
                  :style="{ height: rowHeightPx + 'px' }"
               >
                  <td>{{ play.word }}</td>
                  <td>{{ play.score }}</td>
                  <td>
                     <BoardGrid
                        :letters="boardLetters"
                        :colors="mapsToColors(play.blue_map, play.red_map)"
                        :theme="theme"
                        :size="boardPreviewCellSize"
                     />
                  </td>
                  <td>
                     <span v-html="computeFinish(play)"></span>
                  </td>
                  <td>
                     <button type="button" title="Add to history" @click="addToHistory(play)">
                        Play
                     </button>
                  </td>
               </tr>
            </tbody>
         </table>
      </div>
      <div class="pager">
         <div class="pager-left">
            <label
               >Page Size:
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

<style>
   .results-grid {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
   }
   .pager {
      display: flex;
      gap: 20px;
      justify-content: right;
   }
   .pager-right {
      display: flex;
      gap: 8px;
      align-items: center;
   }
   .pager-select {
      border: 1px solid #c7cbd1;
      background: #f8f9fb;
      border-radius: 4px;
      padding: 2px 6px;
      font: inherit;
   }
   /* Scroll container provides the scrollbar and outer border */
   .table-container {
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
      border: 1px solid #d6dae0;
      border-radius: 6px;
      background: #fff;
   }
   /* Table styling to mimic ag-grid header and column separators */
   .results-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
   }
   .results-table thead th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: #f5f7fa;
      color: #2c3e50;
      font-weight: 600;
      padding: 8px 10px;
      border-right: 1px solid #e0e3e7;
      border-bottom: 1px solid #d6dae0;
      white-space: nowrap;
   }
   .results-table thead th:last-child {
      border-right: none;
   }
   .results-table tbody td {
      padding: 6px 8px;
      border-right: 1px solid #eee;
      border-bottom: 1px solid #eee;
      vertical-align: middle;
   }
   .results-table tbody td:last-child {
      border-right: none;
   }
   .results-table tbody tr:hover {
      background: #f7fbff;
   }
   .results-table tbody tr:nth-child(even) {
      background: #fafafa;
   }
   .results-table td:nth-child(3) {
      padding: 4px;
   }
   .pager button {
      border: none;
      background: transparent;
      padding: 4px 4px;
      cursor: pointer;
   }
   .pager button:disabled {
      opacity: 0.6;
      cursor: default;
   }
   @media (max-width: 900px) {
      .results-grid {
         flex: 0 0 auto;
         height: 420px;
      }
   }
</style>
