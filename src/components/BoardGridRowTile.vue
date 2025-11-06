<script setup lange="ts">
   const props = defineProps(['letter', 'color']);
</script>

<template>
   <div :class="['letter', props.color]">{{ props.letter }}</div>
</template>

<style>
   .letter {
      width: 25px;
      height: 25px;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: #eeeeee;
      margin: 1px;
   }
</style>
