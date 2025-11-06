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
            boardLetters.value,
            play.blue_map,
            play.red_map,
            1
         );
         play.losing = losing;
         play.ending_soon = ending_soon;
      }
      return myResults;
   });
   const boardLetters = ref('OXFPALWDWNXMJDGEEPGLGSYST');
   const boardLettersUpperCase = computed(() => boardLetters.value.toUpperCase());
   const colorLetters = ref('B3W2BWRRBRRB3R3WWWR4');
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
   const selectedIndex: Ref<number | null> = ref(null);
   let player: Player;
   onMounted(async () => {
      let wordList: string[] = await getWordList();
      player = new Player(undefined, undefined, wordList);
      (globalThis as any).player = player; //for console debug purposes
      syncState();
   });
   function syncState() {
      if (boardLetters.value.length == 25) {
         searchResults.value = player.search(
            boardLettersUpperCase.value,
            colorLetters.value,
            needLettersUpperCase.value,
            notLettersUpperCase.value,
            1
         );
      } else {
         searchResults.value = [];
      }
      if (!canGoNext.value) {
         handleLastClick();
      }
   }
   function handleRowClick(index: number) {
      selectedIndex.value = selectedIndex.value === index ? null : index;
      // TODO: show what the board looks like after this play
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
   }
   function handlePrevClick() {
      searchFirstDisplayed.value -= searchResultsSize.value;
   }
   function handleNextClick() {
      searchFirstDisplayed.value += searchResultsSize.value;
   }
   function handleLastClick() {
      const remain: number = searchResults.value.length % searchResultsSize.value;
      searchFirstDisplayed.value =
         searchResults.value.length - (remain == 0 ? searchResultsSize.value : remain);
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
   <p>Colors: {{ boardColorsDefended }} ({{ boardColorsDefended.length }})</p>
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
         {{ searchFirstDisplayed + 1 }}-{{ searchFirstDisplayed + searchResultsSize }} of
         {{ searchResults.length }}
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
            <th>Score</th>
            <th>Word</th>
            <th>Group Size</th>
            <th>Blue Map</th>
            <th>Red Map</th>
            <th>Ending Soon</th>
            <th>Losing</th>
         </tr>
      </thead>
      <tbody>
         <tr
            v-for="(play, index) in searchResultsSlice"
            :key="index"
            @click="handleRowClick(index)"
            :class="{ selected: selectedIndex === index }"
         >
            <td>{{ play.score }}</td>
            <td>{{ play.word }}</td>
            <td>{{ play.group_size }}</td>
            <td>{{ play.blue_map }}</td>
            <td>{{ play.red_map }}</td>
            <td>{{ play.ending_soon }}</td>
            <td>{{ play.losing }}</td>
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
   tbody tr {
      cursor: pointer;
   }
   tbody tr.selected {
      background-color: #e6f2ff;
   }
</style>
