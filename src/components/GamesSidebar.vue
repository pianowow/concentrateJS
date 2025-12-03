<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ThemeConfig } from '../ts/board';
import BoardGrid from './BoardGrid.vue';

interface StoredGameState {
   historyList: { type: number; text: string; colors: string; score: number }[];
   selectedHistoryIndex: number | null;
   moveIndicator: number;
   id: string;
   createdAt: number;
}

const props = defineProps<{
   games: StoredGameState[];
   selectedGameId: string | null;
   theme: ThemeConfig;
   previewCellSize: number;
}>();

const emit = defineEmits<{
   selectGame: [gameId: string];
   createGame: [];
   deleteGame: [gameId: string];
   reorderGames: [fromIndex: number, toIndex: number];
   openSettings: [];
}>();

const draggedGameId = ref<string | null>(null);
const dragOverIndex = ref<number | null>(null);

const gamesDisplayOrder = computed(() => {
   if (draggedGameId.value === null || dragOverIndex.value === null) {
      return props.games;
   }
   const fromIdx = props.games.findIndex((g) => g.id === draggedGameId.value);
   if (fromIdx === -1 || fromIdx === dragOverIndex.value) {
      return props.games;
   }
   const reordered = [...props.games];
   const [movedGame] = reordered.splice(fromIdx, 1);
   reordered.splice(dragOverIndex.value, 0, movedGame!);
   return reordered;
});

function getGameBoardLetters(game: StoredGameState): string {
   const initial = game.historyList.find((h) => h.type === 0);
   return initial?.text.toUpperCase() ?? '';
}

function getGameCurrentColors(game: StoredGameState): string {
   const idx = game.selectedHistoryIndex ?? game.historyList.length - 1;
   return game.historyList[idx]?.colors ?? '';
}

function onDragStart(gameId: string) {
   draggedGameId.value = gameId;
}

function onDragOver(e: DragEvent, idx: number) {
   e.preventDefault();
   if (draggedGameId.value !== null) {
      dragOverIndex.value = idx;
   }
}

function onDrop(e: DragEvent) {
   e.preventDefault();
   if (draggedGameId.value === null || dragOverIndex.value === null) {
      draggedGameId.value = null;
      dragOverIndex.value = null;
      return;
   }

   const fromIdx = props.games.findIndex((g) => g.id === draggedGameId.value);

   if (fromIdx !== -1 && fromIdx !== dragOverIndex.value) {
      emit('reorderGames', fromIdx, dragOverIndex.value);
   }

   draggedGameId.value = null;
   dragOverIndex.value = null;
}

function onDragEnd() {
   draggedGameId.value = null;
   dragOverIndex.value = null;
}
</script>

<template>
   <aside class="menu-pane">
      <h2 class="app-title">Concentrate</h2>
      <nav class="menu-links">
         <a class="menu-link" @click="emit('openSettings')">Settings</a>
      </nav>
      <div class="games-section">
         <div class="games-header">
            <h3>Games</h3>
            <button class="new-game-btn" @click="emit('createGame')" title="New Game">+</button>
         </div>
         <div class="games-list">
            <div
               v-for="(game, idx) in gamesDisplayOrder"
               :key="game.id"
               class="game-item"
               :class="{
                  selected: game.id === selectedGameId,
                  dragging: game.id === draggedGameId,
               }"
               draggable="true"
               @click="emit('selectGame', game.id)"
               @dragstart="onDragStart(game.id)"
               @dragover="(e) => onDragOver(e, idx)"
               @drop="onDrop"
               @dragend="onDragEnd"
            >
               <BoardGrid
                  :letters="getGameBoardLetters(game)"
                  :colors="getGameCurrentColors(game)"
                  :theme="theme"
                  :size="previewCellSize"
               />
               <button
                  class="delete-game-btn"
                  @click.stop="emit('deleteGame', game.id)"
                  title="Delete game"
                  v-if="games.length > 1"
               >
                  &times;
               </button>
            </div>
         </div>
      </div>
   </aside>
</template>

<style scoped>
.menu-pane {
   width: 180px;
   display: flex;
   flex-direction: column;
   align-items: stretch;
   position: fixed;
   left: 0;
   top: 0;
   height: 100dvh;
   background: v-bind('theme.defaultColor2');
   color: v-bind('theme.defaultText');
   padding: 8px;
   border-right: 1px solid v-bind('theme.defaultText');
   border-radius: 0;
}

.app-title {
   margin: 0 0 12px 0;
}

.menu-links {
   display: flex;
   flex-direction: column;
   gap: 6px;
}

.menu-link {
   color: v-bind('theme.defaultText');
   text-decoration: none;
}

.menu-link:hover {
   text-decoration: underline;
   cursor: pointer;
}

.games-section {
   margin-top: 16px;
   display: flex;
   flex-direction: column;
   flex: 1 1 auto;
   min-height: 0;
}

.games-header {
   display: flex;
   justify-content: space-between;
   align-items: center;
   margin-bottom: 8px;
}

.games-header h3 {
   margin: 0;
}

.new-game-btn {
   background: transparent;
   border: 1px solid v-bind('theme.defaultText');
   color: v-bind('theme.defaultText');
   font-size: 18px;
   width: 28px;
   height: 28px;
   border-radius: 4px;
   cursor: pointer;
   display: flex;
   align-items: center;
   justify-content: center;
   line-height: 1;
}

.new-game-btn:hover {
   background: v-bind('theme.defaultColor');
}

.games-list {
   display: flex;
   flex-direction: column;
   gap: 8px;
   overflow-y: auto;
   flex: 1 1 auto;
   min-height: 0;
   padding-right: 4px;
   scrollbar-color: v-bind('theme.defaultText') transparent;
}

.game-item {
   position: relative;
   padding: 6px;
   border: 2px solid transparent;
   border-radius: 6px;
   cursor: pointer;
   transition: border-color 0.15s ease;
}

.game-item:hover {
   border-color: v-bind('theme.defaultText');
}

.game-item.selected {
   border-color: v-bind('theme.blue');
   background: v-bind('theme.defaultColor');
}

.game-item.dragging {
   opacity: 0.6;
   border-color: v-bind('theme.blue');
}

.delete-game-btn {
   position: absolute;
   top: 2px;
   right: 2px;
   background: v-bind('theme.red');
   border: none;
   color: v-bind('theme.defaultText');
   font-size: 14px;
   width: 20px;
   height: 20px;
   border-radius: 50%;
   cursor: pointer;
   display: none;
   align-items: center;
   justify-content: center;
   line-height: 1;
}

.game-item:hover .delete-game-btn {
   display: flex;
}

@media (max-width: 1150px) {
   .menu-pane {
      width: 100%;
      flex: 0 0 auto;
      position: static;
      height: auto;
      border-right: none;
      border: 1px solid v-bind('theme.defaultText');
      border-radius: 6px;
   }

   .games-list {
      flex-direction: row;
      overflow-x: auto;
      overflow-y: hidden;
      padding-right: 0;
      padding-bottom: 4px;
   }
}
</style>