<script setup lang="ts">
   // Component: HistoryTree
   import { ref, toRefs, computed, watch } from 'vue';
   import BoardGrid from './BoardGrid.vue';
   import PagerControls from './PagerControls.vue';
   import { scoreToColors, convertBoardScore } from '../ts/board';
   import { computeScoreBar } from '../ts/util';
   import {
      type HistoryTree as HistoryTreeType,
      type HistoryNode,
      flattenTree,
      type FlattenedRow,
   } from '../ts/historyTree';

   const props = defineProps<{
      historyTree: HistoryTreeType;
      boardLetters: string;
      boardPreviewCellSize: number;
      selectedNodeId: string | null;
      pageSize: number;
   }>();

   const emit = defineEmits<{
      (e: 'node-click', node: HistoryNode): void;
      (e: 'node-delete', node: HistoryNode): void;
      (e: 'update:pageSize', pageSize: number): void;
   }>();

   const { historyTree, boardLetters, boardPreviewCellSize, selectedNodeId, pageSize } =
      toRefs(props);

   const currentPage = ref(0);

   // Flatten tree and compute line info
   const flattenedRows = computed<FlattenedRow[]>(() => {
      return flattenTree(historyTree.value);
   });

   const startIndex = computed(() => currentPage.value * pageSize.value);
   const pagedRows = computed(() =>
      flattenedRows.value.slice(startIndex.value, startIndex.value + pageSize.value)
   );
   const rowHeightPx = computed(() => boardPreviewCellSize.value * 5 + 12);
   const branchSegmentWidth = 20;

   function onRowClick(node: HistoryNode) {
      emit('node-click', node);
   }

   function onDeleteClick(event: Event, node: HistoryNode) {
      event.stopPropagation();
      emit('node-delete', node);
   }

   // Find the index of the selected node in flattened list
   const selectedFlatIndex = computed(() => {
      if (selectedNodeId.value === null) return null;
      return flattenedRows.value.findIndex((r) => r.node.id === selectedNodeId.value);
   });

   // Keep the page aligned with the selected node
   watch([selectedFlatIndex, pageSize], () => {
      if (selectedFlatIndex.value === null || selectedFlatIndex.value < 0) {
         currentPage.value = 0;
      } else {
         currentPage.value = Math.floor(selectedFlatIndex.value / pageSize.value);
      }
   });

   // Reset to first page when the tree changes if selection is cleared
   watch(historyTree, () => {
      if (selectedNodeId.value === null) {
         currentPage.value = 0;
      } else {
         const idx = flattenedRows.value.findIndex((r) => r.node.id === selectedNodeId.value);
         currentPage.value = idx >= 0 ? Math.floor(idx / pageSize.value) : 0;
      }
   });
</script>

<template>
   <div class="history-grid">
      <h3>History</h3>
      <div class="tree-wrapper">
         <div class="tree-body-container">
            <div
               v-for="row in pagedRows"
               :key="row.node.id"
               class="history-row"
               :class="{ selected: row.node.id === selectedNodeId }"
               :style="{ height: rowHeightPx + 'px' }"
               @click="onRowClick(row.node)"
            >
               <!-- Branch lines -->
               <div class="branch-lines">
                  <template v-for="(hasLine, d) in row.depth" :key="d">
                     <!-- Last segment at current depth: tee or corner if first in branch -->
                     <div
                        v-if="d === row.depth - 1 && row.isFirstInBranch"
                        class="branch-segment tee"
                        :style="{ width: branchSegmentWidth + 'px' }"
                     ></div>
                     <!-- Vertical continuation line -->
                     <div
                        v-else-if="hasLine"
                        class="branch-segment vertical"
                        :style="{ width: branchSegmentWidth + 'px' }"
                     ></div>
                     <!-- Empty space (no line at this depth) -->
                     <div
                        v-else
                        class="branch-segment empty"
                        :style="{ width: branchSegmentWidth + 'px' }"
                     ></div>
                  </template>
               </div>

               <!-- Move indicator -->
               <div class="move-cell">
                  <div
                     :class="{
                        'move-indicator': true,
                        'move-indicator-red': row.node.type == -1,
                        'move-indicator-blue': row.node.type == 1,
                     }"
                  ></div>
               </div>

               <!-- Word + score bar -->
               <div class="word-cell">
                  <span class="word-text">{{ row.node.text }}</span>
                  <div
                     class="score-bar"
                     :class="{ 'score-bar-win': computeScoreBar(row.node.score).isWin }"
                     :title="'Score: ' + row.node.score"
                  >
                     <template v-if="computeScoreBar(row.node.score).isWin">
                        <div
                           class="score-fill red"
                           :style="{
                              width: computeScoreBar(row.node.score).redPercent + '%',
                           }"
                        ></div>
                        <div
                           class="score-fill blue"
                           :style="{
                              width: computeScoreBar(row.node.score).bluePercent + '%',
                           }"
                        ></div>
                     </template>
                     <template v-else>
                        <div class="score-bar-left">
                           <div
                              v-if="computeScoreBar(row.node.score).redPercent > 0"
                              class="score-fill red"
                              :style="{
                                 width: computeScoreBar(row.node.score).redPercent + '%',
                              }"
                           ></div>
                        </div>
                        <div class="score-bar-right">
                           <div
                              v-if="computeScoreBar(row.node.score).bluePercent > 0"
                              class="score-fill blue"
                              :style="{
                                 width: computeScoreBar(row.node.score).bluePercent + '%',
                              }"
                           ></div>
                        </div>
                     </template>
                  </div>
               </div>

               <!-- Board preview -->
               <div class="board-cell">
                  <BoardGrid
                     :letters="boardLetters"
                     :colors="scoreToColors(convertBoardScore(row.node.colors))"
                     :size="boardPreviewCellSize"
                  />
               </div>

               <!-- Delete button (not shown for root node) -->
               <button
                  v-if="row.node.type !== 0"
                  class="delete-node-btn"
                  @click="onDeleteClick($event, row.node)"
                  title="Delete this move and all following moves"
               >
                  &times;
               </button>
            </div>
         </div>
      </div>
      <PagerControls
         v-model="currentPage"
         :total-items="flattenedRows.length"
         :page-size="pageSize"
         @update:page-size="emit('update:pageSize', $event)"
      />
   </div>
</template>

<style scoped>
   .history-grid {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
   }

   .history-grid h3 {
      margin: 0;
      margin-bottom: 6px;
   }

   .tree-wrapper {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--theme-default-text);
      border-radius: 6px;
      overflow: hidden;
   }

   .tree-body-container {
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
      scrollbar-color: var(--theme-default-text) transparent;
   }

   .history-row {
      display: flex;
      align-items: center;
      cursor: pointer;
      background: var(--theme-default-color);
      position: relative;
   }

   .history-row:nth-child(even) {
      background: var(--theme-default-color2);
   }

   .history-row.selected {
      background: var(--theme-blue);
   }

   .history-row:hover {
      filter: brightness(1.05);
   }

   .history-row:hover .delete-node-btn {
      display: flex;
   }

   .delete-node-btn {
      position: absolute;
      right: 4px;
      top: 50%;
      transform: translateY(-50%);
      background: var(--theme-red);
      border: none;
      color: var(--theme-red-text);
      font-size: 14px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      cursor: pointer;
      display: none;
      align-items: center;
      justify-content: center;
      line-height: 1;
      z-index: 10;
   }

   .delete-node-btn:hover {
      filter: brightness(1.2);
   }

   /* Branch line segments */
   .branch-lines {
      display: flex;
      flex-shrink: 0;
      height: 100%;
      margin-left: 10px;
   }

   .branch-segment {
      height: 100%;
      position: relative;
      flex-shrink: 0;
   }

   .branch-segment.vertical::before {
      content: '';
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      border-left: 2px solid var(--theme-default-text);
      transform: translateX(-50%);
      opacity: 0.4;
   }

   .branch-segment.tee::before {
      /* Vertical line from top to bottom */
      content: '';
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      border-left: 2px solid var(--theme-default-text);
      transform: translateX(-50%);
      opacity: 0.4;
   }

   .branch-segment.tee::after {
      /* Horizontal line from center to right */
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      width: 50%;
      border-top: 2px solid var(--theme-default-text);
      opacity: 0.4;
   }

   /* Move indicator */
   .move-cell {
      width: 20px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
   }

   .move-indicator {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      border: 1px solid var(--theme-default-text);
      background: var(--theme-default-color);
   }

   .move-indicator-blue {
      background: var(--theme-defended-blue);
   }

   .move-indicator-red {
      background: var(--theme-defended-red);
   }

   /* Word cell */
   .word-cell {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
      justify-content: center;
      padding: 6px 8px;
      min-width: 0;
   }

   .word-text {
      font-family: 'Roboto Mono', monospace;
      font-weight: 400;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
   }

   .score-bar {
      display: flex;
      height: 10px;
      width: 100%;
      border: 1px solid var(--theme-default-text);
      border-radius: 2px;
      overflow: hidden;
      opacity: 0.7;
   }

   .score-bar-left {
      flex: 1;
      display: flex;
      justify-content: flex-end;
      border-right: 1px solid var(--theme-default-text);
   }

   .score-bar-right {
      flex: 1;
      display: flex;
      justify-content: flex-start;
   }

   .score-bar-win .score-fill {
      flex: none;
   }

   .score-fill {
      height: 100%;
      transition: width 0.2s ease;
   }

   .score-fill.blue {
      background-color: var(--theme-defended-blue);
   }

   .score-fill.red {
      background-color: var(--theme-defended-red);
   }

   /* Board cell */
   .board-cell {
      width: 70px;
      flex-shrink: 0;
      padding: 6px 8px;
   }

   @media (max-width: 900px) {
      .history-grid {
         flex: 0 0 auto;
      }

      .tree-wrapper {
         flex: 0 0 auto;
         max-height: 380px;
      }
   }
</style>
