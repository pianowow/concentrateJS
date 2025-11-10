<script setup lang="ts">
   import { ref, type Ref, onMounted, computed } from 'vue';
   import BoardGrid from './BoardGrid.vue';
   import { Player, Play } from '../ts/player';
   import { LightColorTheme } from '../ts/board';
   const theme = new LightColorTheme();
   const searchResults: Ref<Play[]> = ref(new Array<Play>());
   const searchResultsSize: Ref<number> = ref(20);
   const searchFirstDisplayed: Ref<number> = ref(0);
   const searchResultsSlice = computed(() => {
      let myResults = searchResults.value.slice(
         searchFirstDisplayed.value,
         searchFirstDisplayed.value + searchResultsSize.value
      );
      let losing, ending_soon;
      for (let play of myResults) {
         [ending_soon, losing] = player.endgameCheck(
            boardLettersUpperCase.value,
            play.blue_map,
            play.red_map,
            1
         );
         play.losing = losing;
         play.ending_soon = ending_soon;
      }
      return myResults;
   });
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
   function readQueryParams() {
      const params = new URLSearchParams(window.location.search);
      const board = params.get('board');
      const colors = params.get('colors');
      const need = params.get('need');
      const not = params.get('not');
      const page = params.get('page');
      const size = params.get('size');
      if (colors) colorLetters.value = colors.toUpperCase();
      if (need) needLetters.value = need.toUpperCase();
      if (not) notLetters.value = not.toUpperCase();
      if (size && !Number.isNaN(Number(size))) searchResultsSize.value = Number(size);
      if (page && !Number.isNaN(Number(page)))
         searchFirstDisplayed.value = Math.max(0, Number(page));
      if (board) boardLetters.value = board.toUpperCase();
   }
   function updateQueryParams() {
      const params = new URLSearchParams();
      if (boardLetters.value) params.set('board', boardLettersUpperCase.value);
      if (colorLetters.value) params.set('colors', colorLettersUpperCase.value);
      if (needLetters.value) params.set('need', needLettersUpperCase.value);
      if (notLetters.value) params.set('not', notLettersUpperCase.value);
      params.set('size', String(searchResultsSize.value));
      params.set('page', String(searchFirstDisplayed.value));
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
      syncState();
   });
   function syncState() {
      if (boardLetters.value.length == 25) {
         searchResults.value = player.search(
            boardLettersUpperCase.value,
            colorLettersUpperCase.value,
            needLettersUpperCase.value,
            notLettersUpperCase.value,
            1
         );
         // handles case where search results shrink and the paging is beyond the last result
         if (!canGoNext.value) {
            handleLastClick();
         }
      } else {
         searchResults.value = [];
      }
      updateQueryParams();
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
         //.filter((word) => word.toUpperCase().trim());
      } catch (error) {
         console.error('Failed to load word list:', error);
      } //finally {
      return wordList;
   }
   function handleFirstClick() {
      searchFirstDisplayed.value = 0;
      updateQueryParams();
   }
   function handlePrevClick() {
      searchFirstDisplayed.value = Math.max(
         0,
         searchFirstDisplayed.value - searchResultsSize.value
      );
      updateQueryParams();
   }
   function handleNextClick() {
      searchFirstDisplayed.value += searchResultsSize.value;
      updateQueryParams();
   }
   function handleLastClick() {
      if (searchResults.value.length == 0) {
         searchFirstDisplayed.value = 0;
         updateQueryParams();
         return;
      }
      const remain: number = searchResults.value.length % searchResultsSize.value;
      searchFirstDisplayed.value =
         searchResults.value.length - (remain == 0 ? searchResultsSize.value : remain);
      updateQueryParams();
   }
   const lastStartIndex = computed(() => {
      const len = searchResults.value.length;
      const size = Math.max(1, Number(searchResultsSize.value) || 1);
      if (len === 0) return 0;
      const remain = len % size;
      return len - (remain === 0 ? size : remain);
   });
   const canGoPrev = computed(() => searchFirstDisplayed.value > 0);
   const canGoNext = computed(() => searchFirstDisplayed.value < lastStartIndex.value);
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
   /**
    * Returns the value of the Finish column for a play
    * @param play - the play to evaluate
    */

   function computeFinish(play: Play): string {
      if (play.score > 999) {
         return '<span title="Winning play">🏆</span>';
      } else {
         if (play.ending_soon) {
            if (play.losing) {
               return '<span title="Opponent can win next move.">⚠️</span>';
            } else {
               return '<span title="Ending soon, but opponent doesn\'t have a win.">🏁</span>';
            }
         } else {
            return '<span title="Game can\'t end next move.">-</span>';
         }
      }
   }
   function tableStatus(): string {
      if (searchResults.value.length < 2) {
         return searchResults.value.length + ' of ' + searchResults.value.length;
      }
      return searchFirstDisplayed.value + 1 >=
         Math.min(searchFirstDisplayed.value + searchResultsSize.value, searchResults.value.length)
         ? (searchFirstDisplayed.value + 1).toString()
         : (searchFirstDisplayed.value + 1).toString() +
              '-' +
              Math.min(
                 searchFirstDisplayed.value + searchResultsSize.value,
                 searchResults.value.length
              ) +
              ' of ' +
              searchResults.value.length;
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
   <div class="table-controls">
      <button @click="handleFirstClick()" :disabled="!canGoPrev">First</button>
      <button @click="handlePrevClick()" :disabled="!canGoPrev">Prev</button>
      <span class="table-status">
         {{ tableStatus() }}
      </span>
      <button @click="handleNextClick()" :disabled="!canGoNext">Next</button>
      <button @click="handleLastClick()" :disabled="!canGoNext">Last</button>
      <label for="page-size">Page Size</label>
      <input
         id="page-size"
         class="page-input"
         type="number"
         min="1"
         v-model.number="searchResultsSize"
      />
   </div>
   <table>
      <thead>
         <tr>
            <th
               title="Engine evaluation of the position.  Positive, blue is winning; negative, red is winning."
            >
               Score
            </th>
            <th title="Word to play">Word</th>
            <th title="Representation of the board after this play">Board</th>
            <th title="Possible finish next move">Finish</th>
         </tr>
      </thead>
      <tbody>
         <tr v-for="(play, index) in searchResultsSlice" :key="index">
            <td>{{ play.score }}</td>
            <td>{{ play.word }}</td>
            <td>
               <BoardGrid
                  :letters="boardLettersUpperCase"
                  :colors="displayScore(play.blue_map, play.red_map)"
                  :theme="theme"
                  :size="9"
               />
            </td>
            <td v-html="computeFinish(play)"></td>
         </tr>
      </tbody>
   </table>
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
