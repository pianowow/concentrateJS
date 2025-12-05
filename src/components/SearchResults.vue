<script setup lang="ts">
   import { ref, toRefs, computed, watch } from 'vue';
   import type { Player, Play } from '../ts/player';
   import type { ThemeConfig } from '../ts/board';
   import { mapsToColors } from '../ts/board';
   import { computeScoreBar } from '../ts/util';
   import BoardGrid from './BoardGrid.vue';

   const props = defineProps<{
      boardLetters: string;
      player: Player | null;
      theme: ThemeConfig;
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
   const editCurrentPage = ref(false);
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
      } else if ((play.score > 999 && move.value == -1) || (play.score < -999 && move.value == 1)) {
         return '<span title="Losing play">💀</span>';
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

   function pageSpanClick() {
      editCurrentPage.value = !editCurrentPage.value;
   }
</script>

<template>
   <div class="results-grid">
      <div class="table-wrapper">
         <div class="header-container">
            <table class="results-table">
               <colgroup>
                  <col class="col-word" />
                  <col class="col-board" />
                  <col class="col-finish" />
               </colgroup>
               <thead>
                  <tr>
                     <th style="text-align: left">Word</th>
                     <th style="text-align: left">Board</th>
                     <th style="text-align: left">Finish</th>
                  </tr>
               </thead>
            </table>
         </div>
         <div class="table-body-container">
            <table class="results-table">
               <colgroup>
                  <col class="col-word" />
                  <col class="col-board" />
                  <col class="col-finish" />
               </colgroup>
               <tbody>
                  <tr
                     v-for="play in pagedResults"
                     :key="play.word + '-' + play.blue_map + '-' + play.red_map"
                     :style="{ height: rowHeightPx + 'px' }"
                     title="Click to add this play to history"
                     @click="addToHistory(play)"
                  >
                     <td class="word-cell-td">
                        <div class="word-cell">
                           <span class="word-text">{{ play.word }}</span>
                           <div
                              class="score-bar"
                              :class="{ 'score-bar-win': computeScoreBar(play.score).isWin }"
                              :title="'Score: ' + play.score"
                           >
                              <template v-if="computeScoreBar(play.score).isWin">
                                 <div
                                    class="score-fill red"
                                    :style="{ width: computeScoreBar(play.score).redPercent + '%' }"
                                 ></div>
                                 <div
                                    class="score-fill blue"
                                    :style="{
                                       width: computeScoreBar(play.score).bluePercent + '%',
                                    }"
                                 ></div>
                              </template>
                              <template v-else>
                                 <div class="score-bar-left">
                                    <div
                                       v-if="computeScoreBar(play.score).redPercent > 0"
                                       class="score-fill red"
                                       :style="{
                                          width: computeScoreBar(play.score).redPercent + '%',
                                       }"
                                    ></div>
                                 </div>
                                 <div class="score-bar-right">
                                    <div
                                       v-if="computeScoreBar(play.score).bluePercent > 0"
                                       class="score-fill blue"
                                       :style="{
                                          width: computeScoreBar(play.score).bluePercent + '%',
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
                           :colors="mapsToColors(play.blue_map, play.red_map)"
                           :theme="theme"
                           :size="boardPreviewCellSize"
                        />
                     </td>
                     <td>
                        <span v-html="computeFinish(play)"></span>
                     </td>
                  </tr>
               </tbody>
            </table>
         </div>
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
            <span @click="pageSpanClick">Page {{ currentPage + 1 }} / {{ totalPages }}</span>
            <input v-if="editCurrentPage" v-model.number="currentPage" />
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
   .results-grid {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
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

   .col-word {
      width: auto;
   }

   .col-board {
      width: 70px;
   }

   .col-finish {
      width: 60px;
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
      font-family: 'Roboto Mono', monospace;
      font-weight: 400;
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

   .results-table tbody tr {
      cursor: pointer;
      background: v-bind('theme.defaultColor');
   }

   .results-table tbody tr:nth-child(even) {
      background: v-bind('theme.defaultColor2');
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

   @media (max-width: 900px) {
      .results-grid {
         flex: 0 0 auto;
      }

      .table-container {
         flex: 0 0 auto;
         max-height: 380px;
         overflow: auto;
      }
      .table-wrapper {
         max-height: 380px;
      }
   }
</style>
