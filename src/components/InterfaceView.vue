<script setup lang="ts">
   import { ref, type Ref, onMounted, computed, h, markRaw, defineComponent } from 'vue';
   import BoardGrid from './BoardGrid.vue';
   import { Player, Play } from '../ts/player';
   import { LightColorTheme } from '../ts/board';
   import { AgGridVue } from 'ag-grid-vue3';
   import type { GridApi, GridReadyEvent } from 'ag-grid-community';
   const theme = new LightColorTheme();
   const searchResults: Ref<Play[]> = ref(new Array<Play>());
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
   const needLetters = ref('');
   const needLettersUpperCase = computed(() => needLetters.value.toUpperCase());
   const notLetters = ref('');
   const notLettersUpperCase = computed(() => notLetters.value.toUpperCase());
   let player: Player;
   const boardPreviewCellSize = 9;
   const BoardCellRenderer = defineComponent({
      name: 'BoardCellRenderer',
      props: { params: { type: Object, required: true } },
      render() {
         const p = this.params;
         const colors = displayScore(p.data.blue_map, p.data.red_map);
         return h(BoardGrid, {
            letters: boardLettersUpperCase.value,
            colors,
            theme,
            size: boardPreviewCellSize,
         });
      },
   });

   const FinishCellRenderer = defineComponent({
      name: 'FinishCellRenderer',
      props: { params: { type: Object, required: true } },
      render() {
         // computeFinish returns a small HTML snippet; we set it as innerHTML.
         return h('span', { innerHTML: computeFinish(this.params.data as Play) });
      },
   });

   const colDefs = ref([
      { headerName: 'Score', field: 'score' },
      {
         headerName: 'Word',
         field: 'word',
         filter: 'agTextColumnFilter',
         filterParams: {
            filterOptions: ['contains'],
            textFormatter: (text: string | null | undefined) =>
               typeof text === 'string' ? text.toUpperCase() : text,
         },
      },
      { headerName: 'Board', cellRenderer: markRaw(BoardCellRenderer) },
      { headerName: 'Finish', colId: 'finish', cellRenderer: markRaw(FinishCellRenderer) },
   ]);

   function readQueryParams() {
      const params = new URLSearchParams(window.location.search);
      const board = params.get('board');
      const colors = params.get('colors');
      const need = params.get('need');
      const not = params.get('not');
      if (colors) colorLetters.value = colors.toUpperCase();
      if (need) needLetters.value = need.toUpperCase();
      if (not) notLetters.value = not.toUpperCase();
      if (board) boardLetters.value = board.toUpperCase();
   }
   function updateQueryParams() {
      const params = new URLSearchParams();
      if (boardLetters.value) params.set('board', boardLettersUpperCase.value);
      if (colorLetters.value) params.set('colors', colorLettersUpperCase.value);
      if (needLetters.value) params.set('need', needLettersUpperCase.value);
      if (notLetters.value) params.set('not', notLettersUpperCase.value);
      const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
      history.replaceState(null, '', newUrl);
   }
   onMounted(async () => {
      let wordList: string[] = await getWordList();
      player = new Player(undefined, undefined, wordList);
      if (import.meta.env.DEV) window.player = player; //for console debug purposes
      readQueryParams();
      if (!boardLetters.value) {
         boardLetters.value = 'concentrateforletterpress';
         colorLetters.value = 'b5b5bw3rr5r5';
      }
      updateQueryParams();
      runSearch();
   });

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
      if (boardLetters.value.length == 25) {
         searchResults.value = player.search(
            boardLettersUpperCase.value,
            colorLettersUpperCase.value,
            needLettersUpperCase.value,
            notLettersUpperCase.value,
            1
         );
      } else {
         searchResults.value = [];
      }
      if (gridApi) computeEndgameForCurrentPage();
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

   /**
    * Returns a string representing the board colors given bitmaps of blue and red positions
    * @param blue bitmap of blue position
    * @param red bitmap of red position
    */
   function displayScore(blue: number, red: number): string {
      let s: string = '';
      for (let i = 0; i < 25; i++) {
         if ((blue & player.neighbors.get(i)!) == player.neighbors.get(i)) {
            s += 'B';
         } else if ((red & player.neighbors.get(i)!) == player.neighbors.get(i)) {
            s += 'R';
         } else if (blue & (1 << i)) {
            s += 'b';
         } else if (red & (1 << i)) {
            s += 'r';
         } else {
            s += 'w';
         }
      }
      return s;
   }

   let gridApi: GridApi | undefined;
   // Debounce state for searches
   let searchDebounceHandle: number | undefined;
   const DEBOUNCE_MS = 400;

   /**
    * Returns the value of the Finish column for a play
    * @param play - the play to evaluate
    */
   function computeFinish(play: Play): string {
      if (play.score > 999) {
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
      if (!gridApi || !player) return;
      const pageSize = gridApi.paginationGetPageSize();
      const currentPage = gridApi.paginationGetCurrentPage();
      const start = currentPage * pageSize;
      const end = Math.min(start + pageSize, gridApi.getDisplayedRowCount());
      for (let i = start; i < end; i++) {
         const rowNode = gridApi.getDisplayedRowAtIndex(i);
         if (!rowNode) continue;
         const play = rowNode.data as Play;
         const [ending_soon, losing] = player.endgameCheck(
            boardLettersUpperCase.value,
            play.blue_map,
            play.red_map,
            1
         );
         play.ending_soon = ending_soon;
         play.losing = losing;
      }
      gridApi.refreshCells({ columns: ['finish'] });
   }

   function onGridReady(params: GridReadyEvent) {
      gridApi = params.api;
      computeEndgameForCurrentPage();
   }

   function onPaginationChanged() {
      computeEndgameForCurrentPage();
   }
</script>

<template>
   <BoardGrid
      :letters="boardLettersUpperCase"
      :colors="boardColorsDefended"
      :theme="theme"
      :size="25"
   />
   <div class="input-div">
      <label for="board-input">Board</label>
      <input
         id="board-input"
         class="input"
         type="text"
         v-model="boardLetters"
         @input="syncState()"
         maxlength="25"
      />
   </div>
   <div class="input-div">
      <label for="color-input">Color</label>
      <input
         id="color-input"
         class="input"
         type="text"
         v-model="colorLetters"
         @input="syncState()"
         maxlength="25"
      />
   </div>
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
   <p />
   <ag-grid-vue
      :rowData="searchResults"
      :columnDefs="colDefs"
      style="height: 500px"
      :pagination="true"
      :paginationPageSize="20"
      :rowHeight="boardPreviewCellSize * 5 + 4"
      @grid-ready="onGridReady"
      @pagination-changed="onPaginationChanged"
   ></ag-grid-vue>
</template>

<style>
   .input {
      width: 230px;
      margin-left: 5px;
      text-transform: uppercase;
   }
   .input-div {
      width: 290px;
      display: flex;
      align-items: flex-end;
      justify-content: right;
      padding-top: 8px;
   }
   button {
      margin-right: 5px;
   }
   label {
      margin-right: 5px;
   }
   .page-input {
      width: 50px;
   }
   .table-status {
      margin-right: 5px;
   }
</style>
