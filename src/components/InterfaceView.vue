<script setup>
   import { ref, onMounted, computed } from 'vue';
   import BoardGrid from './BoardGrid.vue';
   import { Player } from '../js/player';
   const wordList = ref([]);
   const boardLetters = ref('QQQQQQQQQQASDFGASDFASEING');
   const boardLettersUpperCase = computed(() => boardLetters.value.toUpperCase());
   const needLetters = ref('');
   const notLetters = ref('');
   const anyLetters = ref('');
   let player;
   onMounted(async () => {
      player = await Player.new();
      syncState();
      let s = player.convertBoardScore('B5B5W5R5R5');
      let ss = player.decide(boardLetters.value, 'B5B5W5R5R5', '', '', 1);
      console.log(ss);
      let m = Math.max(...ss.map((val) => val[0]));
      console.log(m);
      for (let x of ss) {
         if (m == x[0]) {
            console.log(x);
         }
         if ('FANEGADAS' == x[1]) {
            console.log(x);
         }
      }
   });
   function syncState() {
      wordList.value = player.concentrate(
         boardLetters.value,
         needLetters.value,
         notLetters.value,
         anyLetters.value
      );
   }
   const longest100Words = computed(() =>
      [...wordList.value].sort((a, b) => b.length - a.length).slice(0, 100)
   );
</script>

<template>
   <BoardGrid :board="boardLettersUpperCase" />
   <p>
      <label for="board-input">Board</label>
      <input
         id="board-input"
         class="input"
         type="text"
         v-model="boardLetters"
         @input="syncState($event)"
         maxlength="25"
      />
   </p>
   <p>
      <label for="need-input">Need</label>
      <input
         id="need-input"
         class="input"
         type="text"
         v-model="needLetters"
         @input="syncState"
         maxlength="25"
      />
   </p>
   <p>
      <label for="not-input">Not</label>
      <input
         id="not-input"
         class="input"
         type="text"
         v-model="notLetters"
         @input="syncState"
         maxlength="25"
      />
   </p>
   <p>
      <label for="any-input">Any</label>
      <input
         id="any-input"
         class="input"
         type="text"
         v-model="anyLetters"
         @input="syncState"
         maxlength="25"
      />
   </p>
   <p>Loaded {{ wordList.length }} words</p>
   <p>The first 100 words are {{ wordList.slice(0, 100).join(', ') }}</p>
   <p>The longest 100 words are {{ longest100Words.join(', ') }}</p>
</template>

<style>
   .input {
      width: 230px;
      margin-left: 5px;
      text-transform: uppercase;
   }
</style>
