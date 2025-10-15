<script setup>
   import { ref, onMounted, computed } from 'vue';
   import BoardGrid from './BoardGrid.vue';
   import { Player } from '../js/player';
   import { LightColorTheme } from '../js/board';
   const theme = new LightColorTheme();
   const wordList = ref([]);
   const boardLetters = ref('QQQQQQQQQQASDFGASDFASEING');
   const boardLettersUpperCase = computed(() => boardLetters.value.toUpperCase());
   const colorLetters = ref('R5R5W5B5B5');
   const boardColorsExpanded = computed(() => {
      let lastColor = 'W';
      let answer = '';
      for (let i in colorLetters.value) {
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
   const notLetters = ref('');
   const anyLetters = ref('');
   const decideScores = ref([]);
   const selectedIndex = ref(null);
   let player;
   onMounted(async () => {
      player = await Player.new();
      syncState();
      console.log(JSON.stringify(theme));
   });
   function syncState() {
      if (boardLetters.value.length == 25) {
         wordList.value = player.concentrate(
            boardLetters.value,
            needLetters.value,
            notLetters.value,
            anyLetters.value
         );
         decideScores.value = player.decide(boardLetters.value, colorLetters.value, '', '', 1);
      } else {
         decideScores.value = [];
         wordList.value = [];
      }
   }
   function handleRowClick(index) {
      selectedIndex.value = selectedIndex.value === index ? null : index;
   }
   const decide100Words = computed(() =>
      [...decideScores.value].sort((a, b) => b[0] - a[0]).slice(0, 100)
   );
</script>

<template>
   <BoardGrid :letters="boardLettersUpperCase" :colors="boardColorsDefended" :theme="theme" />
   <div class="input-div">
      <label for="board-input">Board</label>
      <input
         id="board-input"
         class="input"
         type="text"
         v-model="boardLetters"
         @input="syncState($event)"
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
         @input="syncState($event)"
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
   <div class="input-div">
      <label for="any-input">Any</label>
      <input
         id="any-input"
         class="input"
         type="text"
         v-model="anyLetters"
         @input="syncState"
         maxlength="25"
      />
   </div>
   <p>Loaded {{ wordList.length }} words</p>
   <table>
      <thead>
         <tr>
            <th colspan="5">Best 100 Plays</th>
         </tr>
         <tr>
            <th>Score</th>
            <th>Word</th>
            <th>Group Size</th>
            <th>Blue Map</th>
            <th>Red Map</th>
         </tr>
      </thead>
      <tbody>
         <tr
            v-for="(play, index) in decide100Words"
            :key="index"
            @click="handleRowClick(index)"
            :class="{ selected: selectedIndex === index }"
         >
            <td>{{ play[0] }}</td>
            <td>{{ play[1] }}</td>
            <td>{{ play[2] }}</td>
            <td>{{ play[3] }}</td>
            <td>{{ play[4] }}</td>
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
   tbody tr {
      cursor: pointer;
   }
   tbody tr.selected {
      background-color: #e6f2ff;
   }
</style>
