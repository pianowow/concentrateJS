import { defineStore } from 'pinia';
import { ref, type Ref, shallowRef, watch } from 'vue';
import type { StoredGameState, ThemeName, AppState, HistoryTree } from '../ts/types';
import { treeToArray, createEmptyTree } from '@/ts/historyTree';

const LOCAL_STORAGE_KEY = 'concentrate-analysis-state';

export const useAnalysisStore = defineStore('analysis', () => {
   const games = ref<StoredGameState[]>([]);
   const selectedGameId: Ref<string | null> = ref(null);
   const themeSelected = ref<ThemeName>('Light');
   const wordListSelected = ref<string>('en');
   const useBadWords = ref<boolean>(false);
   const historyTree: Ref<HistoryTree> = shallowRef(createEmptyTree());
   const selectedNodeId: Ref<string | null> = ref(null);
   const moveIndicator = ref<number>(1);
   const historyTreePageSize = ref(20);
   const searchResultsPageSize = ref(20);

   function updateCurrentGameInArray() {
      if (!selectedGameId.value) return;
      const idx = games.value.findIndex((g) => g.id === selectedGameId.value);
      if (idx !== -1) {
         games.value[idx] = {
            ...games.value[idx]!,
            historyNodes: treeToArray(historyTree.value),
            selectedNodeId: selectedNodeId.value,
            moveIndicator: moveIndicator.value,
         };
      }
   }

   function saveToLocalStorage() {
      updateCurrentGameInArray();
      const state: AppState = {
         theme: themeSelected.value,
         wordList: wordListSelected.value,
         useBadWords: useBadWords.value,
         games: games.value,
         selectedGameId: selectedGameId.value,
         historyTreePageSize: historyTreePageSize.value,
         searchResultsPageSize: searchResultsPageSize.value,
      };
      try {
         localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
         console.warn('Failed to save state to local storage:', e);
      }
   }

   function loadFromLocalStorage(): AppState | null {
      try {
         const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
         if (stored) {
            const parsed = JSON.parse(stored) as AppState;
            // Validate the parsed data has expected structure
            if (
               Array.isArray(parsed.games) &&
               parsed.games.length > 0 &&
               typeof parsed.theme === 'string'
            ) {
               return parsed;
            }
         }
      } catch (e) {
         console.warn('Failed to load state from local storage:', e);
         // delete local storage item we can't use
         localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
      return null;
   }

   function reorderGames(fromIndex: number, toIndex: number) {
      const [movedGame] = games.value.splice(fromIndex, 1);
      games.value.splice(toIndex, 0, movedGame!);
      saveToLocalStorage();
   }

   watch(themeSelected, () => {
      saveToLocalStorage();
   });

   return {
      games,
      selectedGameId,
      themeSelected,
      wordListSelected,
      useBadWords,
      historyTree,
      selectedNodeId,
      moveIndicator,
      historyTreePageSize,
      searchResultsPageSize,
      saveToLocalStorage,
      loadFromLocalStorage,
      updateCurrentGameInArray,
      reorderGames,
   };
});
