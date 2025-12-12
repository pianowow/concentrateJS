<script setup lang="ts">
   import { ref, toRefs, computed, watch, shallowReactive, onUnmounted } from 'vue';
   import type { Player, Play } from '../ts/player';
   import { mapsToColors } from '../ts/board';
   import { computeScoreBar } from '../ts/util';
   import BoardGrid from './BoardGrid.vue';
   import PagerControls from './PagerControls.vue';
   import { useChunkedComputation } from '../ts/useChunkedComputation';

   const props = defineProps<{
      boardLetters: string;
      player: Player;
      searchResults: Play[];
      boardPreviewCellSize: number;
      move: number;
      wordFilter: string;
      hideLosingPlays: boolean;
   }>();

   const emit = defineEmits<{
      (e: 'add-to-history', play: Play): void;
   }>();

   const {
      boardLetters,
      player,
      searchResults,
      boardPreviewCellSize,
      move,
      wordFilter,
      hideLosingPlays,
   } = toRefs(props);

   // Lightweight pager state
   const pageSize = ref(20);
   const currentPage = ref(0);

   // Endgame computation tracking
   const endgameCache = shallowReactive(new Map<Play, { ending_soon: boolean; losing: boolean }>());
   const { computeChunked, abort, isComputing } = useChunkedComputation();
   const computeProgress = ref({ processed: 0, total: 0 });

   onUnmounted(() => {
      abort();
   });

   // exact pattern word filter
   const filteredResults = computed(() => {
      const q = (wordFilter.value || '').trim().toUpperCase();
      if (!q) return searchResults.value;
      return searchResults.value.filter((p) => (p.word || '').toUpperCase().includes(q));
   });

   const displayableResults = computed(() => {
      if (hideLosingPlays.value) {
         return filteredResults.value.filter((p) => {
            const loses = move.value === 1 ? p.score < -999 : p.score > 999;
            const cached = endgameCache.get(p);
            return cached !== undefined && !cached.losing && !loses;
         });
      } else {
         return filteredResults.value;
      }
   });

   const pagedResults = computed(() => {
      const start = currentPage.value * pageSize.value;
      return displayableResults.value.slice(start, start + pageSize.value);
   });

   const hasMoreResults = computed(() => {
      if (!hideLosingPlays.value) return false; //Not used when not filtering
      const currentEnd = (currentPage.value + 1) * pageSize.value;
      const hasMoreDisplayable = displayableResults.value.length > currentEnd;
      const hasUncomputed = filteredResults.value.some((p) => p.ending_soon === undefined);
      return hasMoreDisplayable || hasUncomputed;
   });

   const rowHeightPx = computed(() => boardPreviewCellSize.value * 5 + 4);

   function addToHistory(play: Play) {
      emit('add-to-history', play);
   }
   /**
    * Compute endgame for plays on the current page only (synchronous, fast)
    */
   function computeEndgameForPage() {
      for (const play of pagedResults.value) {
         if (endgameCache.has(play)) continue;

         const [ending_soon, losing] = player.value.endgameCheck(
            boardLetters.value,
            play.blue_map,
            play.red_map,
            move.value
         );
         play.ending_soon = ending_soon;
         play.losing = losing;
         endgameCache.set(play, { ending_soon, losing });
      }
   }

   function computeEndgameChunked() {
      const results = filteredResults.value;
      const uncachedPlays = results.filter((p) => !endgameCache.has(p));

      if (uncachedPlays.length === 0) return;

      computeProgress.value = { processed: endgameCache.size, total: results.length };

      computeChunked(
         uncachedPlays,
         (play) => {
            const [ending_soon, losing] = player.value.endgameCheck(
               boardLetters.value,
               play.blue_map,
               play.red_map,
               move.value
            );
            return { ending_soon, losing };
         },
         (batchResults) => {
            for (const { index, result } of batchResults) {
               const play = uncachedPlays[index]!;
               play.ending_soon = result.ending_soon;
               play.losing = result.losing;
               endgameCache.set(play, result);
            }
            computeProgress.value.processed = endgameCache.size;
         }
      );
   }

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

   // reset cache when source data changes
   watch(
      [searchResults, player, boardLetters],
      () => {
         abort();
         endgameCache.clear();
         currentPage.value = 0;
         computeProgress.value = { processed: 0, total: 0 };
         computeEndgameForPage();
      },
      { immediate: true }
   );

   // compute more when pagination or filter changes
   watch(hideLosingPlays, () => {
      if (hideLosingPlays.value) {
         computeEndgameChunked();
      } else {
         abort();
         computeEndgameForPage();
      }
   });

   watch([currentPage, pageSize], () => {
      if (!hideLosingPlays.value) {
         computeEndgameForPage();
      }
   });

   // reset to first page when filters change
   watch([wordFilter, hideLosingPlays], () => {
      currentPage.value = 0;
   });
</script>

<template>
   <div class="results-grid">
      <div v-if="isComputing && hideLosingPlays" class="loading-overlay">
         <span>Computing endgame results...</span>
         <div class="loading-content">
            <span>Analyzing plays...</span>
            <span class="progress text">
               {{ computeProgress.processed.toLocaleString() }} /
               {{ computeProgress.total.toLocaleString() }}
            </span>
         </div>
         <div class="progress-bar">
            <div
               class="progress-fill"
               :style="{ width: (computeProgress.processed / computeProgress.total) * 100 + '%' }"
            ></div>
         </div>
      </div>
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
      <PagerControls
         v-model="currentPage"
         :total-items="displayableResults.length"
         :page-size="pageSize"
         :unknown-total="hideLosingPlays"
         :has-more="hasMoreResults"
         @update:page-size="
            pageSize = $event;
            currentPage = 0;
         "
      />
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
      border: 1px solid var(--theme-default-text);
      border-radius: 6px;
      overflow: hidden;
   }

   .table-body-container {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      scrollbar-color: var(--theme-default-text) transparent;
   }

   .header-container {
      flex: 0 0 auto;
      overflow-y: scroll;
      scrollbar-color: transparent transparent;
      background: var(--theme-default-color2);
      filter: brightness(1.05);
      border-bottom: 1px solid var(--theme-default-text);
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
      border: 1px solid var(--theme-default-text);
      border-radius: 2px;
      overflow: hidden;
      opacity: 0.7;
   }

   .score-bar-left {
      flex: 1;
      display: flex;
      justify-content: flex-end;
      border-right: 1px solid var(--theme-default-text);
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
      background-color: var(--theme-defended-blue);
   }

   .score-fill.red {
      background-color: var(--theme-defended-red);
   }

   .results-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
   }

   .results-table thead th {
      background: transparent;
      color: var(--theme-default-text);
      font-weight: 600;
      padding: 8px 10px;
      border-right: 1px solid var(--theme-default-text);
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
      background: var(--theme-default-color);
   }

   .results-table tbody tr:nth-child(even) {
      background: var(--theme-default-color2);
   }

   .results-table tbody tr:hover td {
      position: relative;
   }

   .results-table tbody tr:hover td::after {
      content: '';
      position: absolute;
      inset: 0;
      background: var(--theme-default-text);
      opacity: 0.05;
      pointer-events: none;
      z-index: 2;
   }
   .loading-overlay {
      display: flex;
      flex-direction: column;
      gap: 8px;
   }
   .loading-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
   }

   .progress-text {
      font-size: 0.9em;
      opacity: 0.8;
   }

   .progress-bar {
      width: 270px;
      height: 8px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      overflow: hidden;
   }

   .progress-fill {
      height: 100%;
      background: var(--theme-defended-blue);
      transition: width 0.1s ease;
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
