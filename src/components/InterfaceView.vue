<script setup>
   import { ref, onMounted, computed } from 'vue';
   import BoardGrid from './BoardGrid.vue';
   import { Player } from '../js/player';
   const wordList = ref([]);
   const boardLetters = ref('QQQQQQQQQQASDFGASDFASEING');
   const boardLettersUpperCase = computed(() => boardLetters.value.toUpperCase());
   const colorLetters = ref('W5W5W5W5W5');
   const needLetters = ref('');
   const notLetters = ref('');
   const anyLetters = ref('');
   const decideScores = ref([]);
   let player;
   onMounted(async () => {
      player = await Player.new();
      syncState();
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
   const longest100Words = computed(() =>
      [...wordList.value].sort((a, b) => b.length - a.length).slice(0, 100)
   );
   const decide100Words = computed(() =>
      [...decideScores.value].sort((a, b) => b[0] - a[0]).slice(0, 100)
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
      <label for="color-input">Color</label>
      <input
         id="color-input"
         class="input"
         type="text"
         v-model="colorLetters"
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
   <p>The best 100 plays are {{ decide100Words.join(', ') }}</p>
</template>

<style>
   .input {
      width: 230px;
      margin-left: 5px;
      text-transform: uppercase;
   }
</style>
