<script setup lang="ts">
   import { ref, computed } from 'vue';
   import type { ThemeConfig } from '../ts/board';
   import { scoreToColors, convertBoardScore } from '../ts/board';
   import BoardGrid from './BoardGrid.vue';

   interface HistoryNode {
      id: string;
      type: number;
      text: string;
      colors: string;
      score: number;
      parentId: string | null;
      childIds: string[];
   }

   interface StoredGameState {
      historyNodes: HistoryNode[];
      selectedNodeId: string | null;
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
      const initial = game.historyNodes.find((h) => h.type === 0);
      return initial?.text.toUpperCase() ?? '';
   }

   function getGameCurrentColors(game: StoredGameState): string {
      // Find selected node or last node in main line
      if (game.selectedNodeId) {
         const selected = game.historyNodes.find((n) => n.id === game.selectedNodeId);
         if (selected) return scoreToColors(convertBoardScore(selected.colors));
      }
      // Follow main line (first children) to find last node
      const nodeMap = new Map(game.historyNodes.map((n) => [n.id, n]));
      let current = game.historyNodes.find((n) => n.parentId === null);
      while (current && current.childIds.length > 0) {
         current = nodeMap.get(current.childIds[0]!);
      }
      return scoreToColors(convertBoardScore(current?.colors ?? ''));
   }

   function gameOver(game: StoredGameState): boolean {
      if (game.selectedNodeId) {
         const selected = game.historyNodes.find((n) => n.id === game.selectedNodeId);
         if (selected) return !selected.colors.toUpperCase().includes('W');
      }
      const nodeMap = new Map(game.historyNodes.map((n) => [n.id, n]));
      let current = game.historyNodes.find((n) => n.parentId === null);
      while (current && current.childIds.length > 0) {
         current = nodeMap.get(current.childIds[0]!);
      }
      return !current?.colors.toUpperCase().includes('W');
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
      <div class="games-section">
         <h3 class="games-header">Games</h3>
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
               <div class="game-top">
                  <div v-if="!gameOver(game)">
                     <div
                        v-if="game.moveIndicator == 1"
                        class="move-indicator move-indicator-blue"
                     ></div>
                     <div
                        v-if="game.moveIndicator == -1"
                        class="move-indicator move-indicator-red"
                     ></div>
                  </div>
                  <div v-else>
                     <div class="move-indicator"></div>
                  </div>
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
               <div class="score">
                  <span class="blue-score">{{
                     getGameCurrentColors(game).toUpperCase().split('B').length - 1
                  }}</span>
                  -
                  <span class="red-score">{{
                     getGameCurrentColors(game).toUpperCase().split('R').length - 1
                  }}</span>
               </div>
            </div>
            <button class="new-game-btn" @click="emit('createGame')" title="New Game">+</button>
         </div>
      </div>
      <button class="settings-btn" @click="emit('openSettings')" title="Settings">
         <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            width="24"
            height="24"
         >
            <path
               d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"
            />
         </svg>
      </button>
   </aside>
</template>

<style scoped>
   .menu-pane {
      width: 183px;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      left: 0;
      top: 0;
      height: 100dvh;
      background: v-bind('theme.defaultColor2');
      color: v-bind('theme.defaultText');
      padding: 8px;
      border-radius: 0;
   }

   .app-title {
      margin: 0 0 12px 0;
   }

   .games-section {
      margin-top: 16px;
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
   }

   .games-header {
      margin: 0 0 8px 0;
   }

   .new-game-btn {
      background: transparent;
      border: 2px dashed v-bind('theme.defaultText');
      color: v-bind('theme.defaultText');
      font-size: 24px;
      width: calc(v-bind('previewCellSize') * 5px + 22px);
      height: calc(v-bind('previewCellSize') * 5px + 26px);
      flex-shrink: 0;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      opacity: 0.5;
      transition:
         opacity 0.2s ease,
         background-color 0.2s ease;
   }

   .new-game-btn:hover {
      opacity: 1;
      background: v-bind('theme.defaultColor');
   }

   .games-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
      overflow-y: auto;
      flex: 1 1 auto;
      min-height: 0;
      padding-right: 4px;
      scrollbar-color: v-bind('theme.defaultText') transparent;
   }
   .game-top {
      display: flex;
      flex-direction: row;
      gap: 5px;
   }
   .game-item {
      display: flex;
      flex-direction: column;
      height: calc(v-bind('props.previewCellSize') * 5px + 26px);
      position: relative;
      padding: 5px;
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

   .move-indicator {
      height: calc(v-bind('previewCellSize') * 5px);
      width: 2px;
   }

   .move-indicator-blue {
      background-color: v-bind('theme.defendedBlue');
   }

   .move-indicator-red {
      background-color: v-bind('theme.defendedRed');
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
   .score {
      display: flex;
      justify-content: center;
      gap: 2px;
      font-size: 14px;
   }
   .blue-score {
      color: v-bind('theme.defendedBlue');
   }
   .red-score {
      color: v-bind('theme.defendedRed');
   }
   .settings-btn {
      background: transparent;
      border: none;
      color: v-bind('theme.defaultText');
      cursor: pointer;
      padding: 8px;
      margin-top: auto;
      align-self: flex-start;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s ease;
   }

   @media (max-width: 900px) {
      .menu-pane {
         width: 100%;
         flex: 0 0 auto;
         position: static;
         height: auto;
      }

      .games-list {
         flex-direction: row;
         overflow-x: auto;
         overflow-y: hidden;
         padding-right: 0;
         padding-bottom: 4px;
      }
      .score {
         font-size: 11px;
      }
      .settings-btn {
         position: absolute;
         top: 8px;
         right: 8px;
         margin-top: 0;
      }
   }
</style>
