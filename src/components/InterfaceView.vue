<script setup lang="ts">
   import { ref, type Ref, onMounted, computed, watch } from 'vue';
   import BoardGrid from './BoardGrid.vue';
   import SearchResults from './SearchResults.vue';
   import { Player, Play, Score } from '../ts/player';
   import { LightColorTheme, mapsToColors } from '../ts/board';
   import { roundTo } from '../ts/util';

   const theme = ref(new LightColorTheme());
   class HistoryEntry {
      type: number; //1 blue, -1 red, 0 initial position
      text: string; //word played or board letters
      colors: string;
      score: number;
      constructor(type: number, text: string, colors: string, score: number) {
         this.type = type;
         this.text = text;
         this.colors = colors;
         this.score = score;
      }
   }
   const showBoardEdit = ref(false);
   const moveIndicator = ref<number>(1);
   const boardLetters = ref('');
   const boardLettersUpperCase = computed(() => boardLetters.value.toUpperCase());
   const colorLetters = ref('');
   const colorLettersUpperCase = computed(() => colorLetters.value.toUpperCase());
   const boardColorsExpanded = computed(() => {
      let lastColor = 'W';
      let answer = '';
      for (let i = 0; i < colorLetters.value.length; i++) {
         const c = colorLetters.value.charAt(i);
         if ('Rr'.includes(c)) {
            lastColor = 'r';
            answer += lastColor;
         } else if ('Bb'.includes(c)) {
            lastColor = 'b';
            answer += lastColor;
         } else if ('Ww'.includes(c)) {
            lastColor = 'w';
            answer += lastColor;
         } else if ('23456789'.includes(c)) {
            for (let n = 2; n < parseInt(c); n++) {
               answer += lastColor;
            }
            answer += lastColor;
         }
         if (answer.length >= 25) {
            answer = answer.slice(0, 25);
         }
      }
      if (answer.length < 25) {
         return answer.padEnd(25, 'w');
      }
      return answer;
   });
   const boardColorsDefended = computed(() => {
      let answer = '';
      const colors = boardColorsExpanded.value;
      for (let i = 0; i < 25; i++) {
         const c = colors.charAt(i);
         if (c === 'w') {
            answer += c;
            continue;
         }
         if (i + 5 < 25 && colors.charAt(i + 5) != c) {
            answer += c;
            continue;
         }
         if (i - 5 >= 0 && colors.charAt(i - 5) != c) {
            answer += c;
            continue;
         }
         if (i % 5 < 4 && colors.charAt(i + 1) != c) {
            answer += c;
            continue;
         }
         if (i % 5 > 0 && colors.charAt(i - 1) != c) {
            answer += c;
            continue;
         }
         answer += c.toUpperCase();
      }
      return answer;
   });
   const historyList: Ref<HistoryEntry[]> = ref(new Array<HistoryEntry>());
   const selectedHistoryIndex: Ref<number | null> = ref(null);
   const showSearchFilters = ref(false);
   const needLetters = ref('');
   const needLettersUpperCase = computed(() => needLetters.value.toUpperCase());
   const notLetters = ref('');
   const notLettersUpperCase = computed(() => notLetters.value.toUpperCase());
   const wordFilter = ref('');
   const wordFilterDebounced = ref('');
   let wordFilterDebounceHandle: number | undefined;
   watch(wordFilter, (val) => {
      if (wordFilterDebounceHandle) clearTimeout(wordFilterDebounceHandle);
      wordFilterDebounceHandle = window.setTimeout(() => {
         wordFilterDebounced.value = val;
      }, DEBOUNCE_MS);
   });
   const searchResultsKey = ref(0);
   const searchResults: Ref<Play[]> = ref(new Array<Play>());
   let player: Ref<Player | null> = ref(null);
   const boardPreviewCellSize = 9;

   function readQueryParams() {
      const params = new URLSearchParams(window.location.search);
      const selected = params.get('selected');
      const rawHash = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : '';
      let index = 0;
      if (rawHash) {
         const parts = rawHash.split('.').filter(Boolean);
         const parsed: HistoryEntry[] = [];
         for (const part of parts) {
            const [t, text, colors] = part.split('-', 3);
            if (!t || !text || !colors) continue;
            const type = t === 'b' ? 1 : t === 'r' ? -1 : 0;
            parsed.push(new HistoryEntry(type, text, colors, 0));
         }
         if (parsed.length > 0) {
            historyList.value = parsed;
            if (parsed[0]!.type === 0 && parsed[0]!.text.length === 25) {
               boardLetters.value = parsed[0]!.text.toUpperCase();
            }
            const selectedNum = selected ? Number.parseInt(selected) : parsed.length - 1;
            index =
               !Number.isNaN(selectedNum) && selectedNum >= 0 && selectedNum < parsed.length
                  ? selectedNum
                  : parsed.length - 1;

            colorLetters.value = parsed[index]!.colors;
            const t = parsed[index]!.type;
            if (t === 0) {
               //I believe this assumes history has at least two entries?
               moveIndicator.value = parsed[index + 1]?.type ?? moveIndicator.value;
            } else {
               moveIndicator.value = -t;
            }

            selectedHistoryIndex.value = index;
            historyCurrentPage.value = Math.floor(index / historyPageSize.value);
         }
         if (player.value) {
            player.value.possible(boardLettersUpperCase.value);
            for (const h of historyList.value) {
               const s: Score = player.value.convertBoardScore(h.colors.toUpperCase());
               h.score = roundTo(player.value.evaluatePos(boardLettersUpperCase.value, s), 2);
            }
            const played = historyList.value.slice(1, index + 1).map((a) => a.text);
            player.value.resetplayed(boardLettersUpperCase.value, played);
         }
      }
   }

   function updateQueryParams() {
      const params = new URLSearchParams();
      if (selectedHistoryIndex.value !== null)
         params.set('selected', selectedHistoryIndex.value.toString());
      //if (boardLetters.value) params.set('board', boardLettersUpperCase.value);
      //if (colorLetters.value) params.set('colors', colorLettersUpperCase.value);
      //if (moveIndicator.value) params.set('move', moveIndicator.value.toString());
      const historyFragment = historyList.value
         .map((h) => {
            const t = h.type === 1 ? 'b' : h.type === -1 ? 'r' : 'i';
            return `${t}-${h.text}-${h.colors}.`;
         })
         .join('');
      const newUrl = `${window.location.pathname}?${params.toString()}#${historyFragment}`;
      history.replaceState(null, '', newUrl);
   }

   // Debounce state for searches
   let searchDebounceHandle: number | undefined;
   const DEBOUNCE_MS = 400;

   onMounted(async () => {
      let wordList: string[] = await getWordList();
      player.value = new Player(undefined, undefined, wordList);
      if (import.meta.env.DEV) window.player = player; //for console debug purposes
      readQueryParams();
      if (!boardLetters.value) {
         boardLetters.value = 'concentrateforletterpress';
         colorLetters.value = 'b5b5bw3rr5r5';
         clearHistory();
      }
      updateQueryParams();
      runSearch();
   });

   const historyPageSize = ref(20);
   const historyCurrentPage = ref(0);
   const historyTotalPages = computed(() =>
      Math.max(1, Math.ceil(historyList.value.length / historyPageSize.value))
   );
   const historyStartIndex = computed(() => historyCurrentPage.value * historyPageSize.value);
   const pagedHistory = computed(() =>
      historyList.value.slice(
         historyStartIndex.value,
         historyStartIndex.value + historyPageSize.value
      )
   );
   const historyRowHeightPx = computed(() => boardPreviewCellSize * 5 + 4);
   function goToHistoryPage(p: number) {
      historyCurrentPage.value = Math.min(Math.max(p, 0), historyTotalPages.value - 1);
   }
   watch([selectedHistoryIndex, historyPageSize], () => {
      if (selectedHistoryIndex.value === null) {
         historyCurrentPage.value = 0;
      } else {
         historyCurrentPage.value = Math.floor(selectedHistoryIndex.value / historyPageSize.value);
      }
   });

   function clearHistory() {
      historyList.value = new Array<HistoryEntry>();
      let score = 0;
      if (player.value) {
         player.value.possible(boardLettersUpperCase.value);
         let s: Score = player.value.convertBoardScore(boardColorsDefended.value);
         score = roundTo(player.value.evaluatePos(boardLettersUpperCase.value, s), 2);
      }
      historyList.value.push(
         new HistoryEntry(0, boardLettersUpperCase.value, boardColorsDefended.value, score)
      );
      selectedHistoryIndex.value = null;
   }

   function clearHistorySyncState() {
      clearHistory();
      syncState();
   }

   function syncState() {
      updateQueryParams();
      if (searchDebounceHandle) {
         clearTimeout(searchDebounceHandle);
      }
      searchDebounceHandle = window.setTimeout(() => {
         runSearch();
      }, DEBOUNCE_MS);
   }

   function runSearch() {
      if (boardLetters.value.length == 25 && boardColorsDefended.value.split('w').length > 1) {
         if (!player.value) {
            searchResults.value = [];
            return;
         }
         searchResults.value = player.value.search(
            boardLettersUpperCase.value,
            colorLettersUpperCase.value,
            needLettersUpperCase.value,
            notLettersUpperCase.value,
            moveIndicator.value
         );
      } else {
         searchResults.value = [];
      }
   }

   async function getWordList() {
      let wordList: string[] = [];
      try {
         let response;
         response = await fetch(new URL('word_lists/en.txt', document.baseURI));
         if (!response.ok) {
            throw new Error('Network response was not ok');
         }
         const textData = await response.text();
         wordList = textData
            .toUpperCase()
            .split(/\r?\n/)
            .filter((word) => word.trim());
      } catch (error) {
         console.error('Failed to load word list:', error);
      }
      return wordList;
   }

   function addPlayToHistory(play: Play) {
      const colors = mapsToColors(play.blue_map, play.red_map);
      const word = (play.word ?? '').toUpperCase();
      const score = play.score ?? 0;

      if (selectedHistoryIndex.value !== null) {
         historyList.value = historyList.value.slice(0, selectedHistoryIndex.value + 1);
         player.value!.resetplayed(
            boardLettersUpperCase.value,
            historyList.value.slice(1, historyList.value.length).map((a) => a.text)
         );
      }

      historyList.value.push(new HistoryEntry(moveIndicator.value, word, colors, score));
      historyCurrentPage.value = Math.floor((historyList.value.length - 1) / historyPageSize.value);
      player.value!.playword(boardLettersUpperCase.value, word);
      selectedHistoryIndex.value = null;
      colorLetters.value = colors;
      moveIndicator.value = -moveIndicator.value;
      searchResults.value = [];
      searchResultsKey.value++; //redraws the searcResults grid completely
      syncState();
   }

   function onHistoryRowClicked(entry: HistoryEntry, idx: number) {
      selectedHistoryIndex.value = idx >= 0 ? idx : null;
      colorLetters.value = entry.colors;
      // If the row corresponds to a move by Blue(1)/Red(-1), next to move is the opposite.
      if (entry.type === 0) {
         if (historyList.value.length > 1) {
            moveIndicator.value = historyList.value[1]!.type;
         }
      } else {
         moveIndicator.value = entry.type * -1;
      }
      player.value?.resetplayed(
         boardLettersUpperCase.value,
         historyList.value.slice(1, idx + 1).map((a) => a.text)
      );
      updateQueryParams();
      runSearch();
   }
</script>

<template>
   <div class="layout">
      <div class="left-pane">
         <BoardGrid
            :letters="boardLettersUpperCase"
            :colors="boardColorsDefended"
            :theme="theme"
            :size="25"
         />
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
               <h4>Note: changing these will clear history</h4>
               <div class="input-div">
                  <label for="turn-input">Turn</label>
                  <select
                     id="turn-input"
                     class="input"
                     v-model.number="moveIndicator"
                     @change="clearHistorySyncState()"
                  >
                     <option :value="1">Blue to play</option>
                     <option :value="-1">Red to play</option>
                  </select>
               </div>
               <div class="input-div">
                  <label for="board-input">Board</label>
                  <input
                     id="board-input"
                     class="input uppercase"
                     type="text"
                     v-model="boardLetters"
                     @input="clearHistorySyncState()"
                     maxlength="25"
                  />
               </div>
               <div class="input-div">
                  <label for="color-input">Color</label>
                  <input
                     id="color-input"
                     class="input uppercase"
                     type="text"
                     v-model="colorLetters"
                     @input="clearHistorySyncState()"
                     maxlength="25"
                  />
               </div>
            </div>
         </div>
         <h3>History</h3>
         <div class="history-grid">
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
                        :key="historyStartIndex + i + '-' + entry.text"
                        :class="{ selected: historyStartIndex + i === selectedHistoryIndex }"
                        :style="{ height: historyRowHeightPx + 'px', cursor: 'pointer' }"
                        @click="onHistoryRowClicked(entry, historyStartIndex + i)"
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
                              :letters="boardLettersUpperCase"
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
                  <label
                     >Page Size:
                     <select v-model.number="historyPageSize" class="pager-select">
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
                     @click="goToHistoryPage(0)"
                     :disabled="historyCurrentPage === 0"
                  >
                     |&lt;
                  </button>
                  <button
                     type="button"
                     aria-label="Previous Page"
                     title="Previous Page"
                     @click="goToHistoryPage(historyCurrentPage - 1)"
                     :disabled="historyCurrentPage === 0"
                  >
                     &lt;
                  </button>
                  <span>Page {{ historyCurrentPage + 1 }} / {{ historyTotalPages }}</span>
                  <button
                     type="button"
                     aria-label="Next Page"
                     title="Next Page"
                     @click="goToHistoryPage(historyCurrentPage + 1)"
                     :disabled="historyCurrentPage >= historyTotalPages - 1"
                  >
                     &gt;
                  </button>
                  <button
                     type="button"
                     aria-label="Last Page"
                     title="Last Page"
                     @click="goToHistoryPage(historyTotalPages - 1)"
                     :disabled="historyCurrentPage >= historyTotalPages - 1"
                  >
                     &gt;|
                  </button>
               </div>
            </div>
         </div>
      </div>
      <div class="right-pane">
         <h3>Search Results</h3>
         <div class="filters-section">
            <div class="filters-header">
               <button
                  title="click to show/hide"
                  class="filters-toggle"
                  type="button"
                  @click="showSearchFilters = !showSearchFilters"
                  :aria-expanded="showSearchFilters"
                  aria-controls="filters-panel"
               >
                  Filters
               </button>
            </div>
            <div id="filters-panel" class="filters-panel" v-show="showSearchFilters">
               <div class="input-div">
                  <label for="need-input">Need</label>
                  <input
                     id="need-input"
                     class="input"
                     type="text"
                     v-model="needLetters"
                     @input="syncState"
                     maxlength="25"
                  />
               </div>
               <div class="input-div">
                  <label for="not-input">Not</label>
                  <input
                     id="not-input"
                     class="input"
                     type="text"
                     v-model="notLetters"
                     @input="syncState"
                     maxlength="25"
                  />
               </div>
               <div class="input-div">
                  <label for="word-filter-input">Word</label>
                  <input
                     id="word-filter-input"
                     class="input"
                     type="text"
                     v-model="wordFilter"
                     maxlength="25"
                  />
               </div>
            </div>
         </div>
         <SearchResults
            :key="searchResultsKey"
            :boardLetters="boardLettersUpperCase"
            :player="player"
            :theme="theme"
            :searchResults="searchResults"
            :boardPreviewCellSize="boardPreviewCellSize"
            :move="moveIndicator"
            :wordFilter="wordFilterDebounced"
            @add-to-history="addPlayToHistory"
         ></SearchResults>
      </div>
   </div>
</template>

<style>
   .layout {
      display: flex;
      height: 100dvh;
      gap: 8px;
      padding: max(8px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right))
         max(8px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left));
   }
   .left-pane,
   .right-pane {
      width: 45%;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
      min-height: 0;
   }
   .right-pane {
      width: 55%;
   }
   .history-grid {
      flex: 1 1 auto;
      min-height: 0;
   }
   h3,
   h4 {
      margin: 0;
      margin-bottom: 6px;
   }
   .input {
      width: 270px;
      margin-left: 2px;
      box-sizing: border-box;
      display: inline-block;
      padding: 2px 2px;
      height: 25px;
      font: inherit;
      border: 1px solid;
      border-radius: 4px;
   }
   .uppercase {
      text-transform: uppercase;
   }
   .input-div {
      width: 330px;
      display: flex;
      align-items: flex-end;
      justify-content: right;
      padding-bottom: 8px;
   }
   label {
      margin-right: 4px;
   }
   .board-edit {
      padding-top: 4px;
   }
   .page-input {
      width: 50px;
   }
   .move-cell-wrapper {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      height: 100%;
   }
   .move-cell {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      border: 1px solid rgba(0, 0, 0, 0.25);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.3);
   }
   .filters-section {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 4px;
   }
   .filters-toggle {
      background: transparent;
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
   .history-grid {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
   }
   .history-grid .table-container {
      flex: 1 1 auto;
      min-height: 0;
   }
   .results-table tbody tr.selected {
      background: #e3f1ff;
   }
   @media (max-width: 900px) {
      .layout {
         flex-direction: column;
         height: auto;
      }
      .left-pane {
         width: 100%;
      }
      .right-pane {
         width: 100%;
      }
      .history-grid {
         flex: 0 0 auto;
         height: 420px;
      }
   }
</style>
