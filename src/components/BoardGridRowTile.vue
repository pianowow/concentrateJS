<script setup>
   import { defineProps } from 'vue';
   const props = defineProps(['letter']);
</script>

<template>
   <div class="letter">{{ props.letter }}</div>
</template>

<style>
   .letter {
      width: 20px;
      height: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
   }
</style>
